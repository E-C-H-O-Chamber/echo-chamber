import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';

import { getUnreadMessageCount } from '../discord';
import { OpenAIClient } from '../llm/openai/client';
import {
  checkNotificationsFunction,
  readChatMessagesFunction,
  sendChatMessageFunction,
} from '../llm/openai/functions/chat';
import { thinkDeeplyFunction } from '../llm/openai/functions/think';
import { getCurrentTimeFunction } from '../llm/openai/functions/time';
import { echoSystemMessage } from '../llm/prompts/system';
import { createLogger } from '../utils/logger';

import type { Logger } from '../utils/logger';
import type { ResponseUsage } from 'openai/resources/responses/responses';

type EchoState = 'Idling' | 'Running' | 'Sleeping';
type UsageRecord = Record<string, ResponseUsage>;

// 1日のトークン使用量閾値
const DAILY_TOKEN_LIMIT = 1_000_000;
// 時間按分での余裕係数
const USAGE_BUFFER_FACTOR = 1.5;

export class Echo extends DurableObject<Env> {
  private readonly store: KVNamespace;
  private readonly storage: DurableObjectStorage;
  private readonly router: Hono;
  private readonly logger: Logger;

  /**
   * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
   * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
   *
   * @param ctx - The interface for interacting with Durable Object state
   * @param env - The interface to reference bindings declared in wrangler.jsonc
   */
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.store = env.ECHO_KV;
    this.storage = ctx.storage;
    this.logger = createLogger(env);
    this.router = new Hono()
      .basePath('/:id')
      .get('/', async (c) => {
        const id = await this.getId();
        const name = await this.getName();
        const state = await this.getState();
        const nextAlarm = await this.storage.getAlarm();
        const usage = await this.getAllUsage();
        return c.json({
          id,
          name,
          state,
          nextAlarm:
            nextAlarm != null ? new Date(nextAlarm).toISOString() : null,
          usage: Object.fromEntries(
            Object.entries(usage).map(([date, usage]) => [
              date,
              usage.total_tokens,
            ])
          ),
          logLevel: this.logger.level,
        });
      })
      .post('/wake', async (c) => {
        await this.wake(c.req.param('id'), true);
        return c.text('OK.');
      })
      .post('/sleep', async (c) => {
        await this.sleep(true);
        return c.text('OK.');
      })
      .post('/run', async (c) => {
        if (env.ENVIRONMENT !== 'local') {
          return c.notFound();
        }
        await this.run();
        return c.text('OK.');
      })
      .get('/usage', async (c) => {
        const allUsage = await this.getAllUsage();
        return c.json(allUsage);
      });
    void this.logger.info('Echo Durable Object created');
  }

  async fetch(request: Request): Promise<Response> {
    return this.router.fetch(request);
  }

  async alarm(alarmInfo?: AlarmInvocationInfo): Promise<void> {
    await this.logger.debug(
      `Alarm triggered with info: ${JSON.stringify(alarmInfo)}`
    );
    await this.setNextAlarm();
    await this.run();
  }

  async setNextAlarm(): Promise<void> {
    const nextAlarm = new Date();
    nextAlarm.setMinutes(nextAlarm.getMinutes() + 1);
    nextAlarm.setSeconds(0);
    nextAlarm.setMilliseconds(0);
    await this.storage.setAlarm(nextAlarm);
    await this.logger.debug(`Next alarm set for ${nextAlarm.toISOString()}`);
  }

  async getId(): Promise<string> {
    const id = await this.storage.get<string>('id');
    return id ?? 'Echo';
  }

  async getName(): Promise<string> {
    const name = await this.storage.get<string>('name');
    return name ?? 'NO_NAME';
  }

  async getState(): Promise<EchoState> {
    const state = await this.storage.get<EchoState>('state');
    return state ?? 'Idling';
  }

  async setState(newState: EchoState): Promise<void> {
    await this.storage.put('state', newState);
  }

  /**
   * 今日のUsage情報を取得
   */
  async getTodayUsage(): Promise<ResponseUsage | null> {
    const usageRecord = (await this.storage.get<UsageRecord>('usage')) ?? {};
    return usageRecord[getTodayDateString()] ?? null;
  }

  /**
   * 全期間のUsage履歴を取得
   */
  async getAllUsage(): Promise<UsageRecord> {
    return (await this.storage.get<UsageRecord>('usage')) ?? {};
  }

  async wake(id: string, force = false): Promise<void> {
    await this.storage.put('id', id);
    await this.storage.put('name', await this.store.get<string>(`name_${id}`));

    const state = await this.getState();

    if (!force && state === 'Sleeping') {
      await this.logger.warn(
        'Echo is currently sleeping! Cannot wake while sleeping.'
      );
      return;
    }

    await this.setNextAlarm();
    await this.setState('Idling');
  }

  async sleep(force = false): Promise<void> {
    const state = await this.getState();

    if (state === 'Sleeping') {
      await this.logger.info('Echo is already sleeping.');
      return;
    }

    if (!force && state === 'Running') {
      await this.logger.warn(
        'Echo is currently running! Cannot sleep while running.'
      );
      return;
    }

    try {
      await this.setState('Sleeping');
      await this.storage.deleteAlarm();
      // sleep 処理
    } catch (error) {
      await this.logger.error(
        'Echo encountered an error during sleep:',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      // await this.setNextAlarm();
      await this.setState('Idling');
    }
  }

  async run(): Promise<void> {
    const id = await this.getId();

    if (id === 'Echo') {
      await this.logger.error('Echo ID is not set. Cannot run without an ID.');
      await this.storage.deleteAlarm();
      return;
    }

    const name = await this.getName();
    const state = await this.getState();

    if (state === 'Sleeping') {
      await this.logger.warn(
        `${name} is currently sleeping! Cannot run while sleeping.`
      );
      return;
    }

    if (state === 'Running') {
      await this.logger.info(`${name} is already running.`);
      return;
    }

    // Usage閾値チェック（時間按分+余裕度考慮）
    const todayUsage = await this.getTodayUsage();
    const dynamicLimit = calculateDynamicTokenLimit();

    if (todayUsage && todayUsage.total_tokens >= dynamicLimit) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });

      await this.logger.warn(
        `${name}の現在時刻(${timeStr})におけるトークン使用制限(${Math.floor(dynamicLimit)})を超えています。` +
          `現在の使用量: ${todayUsage.total_tokens}トークン。` +
          `(1日上限: ${DAILY_TOKEN_LIMIT}トークン)`
      );
      return;
    }

    const channelId = await this.store.get<string>(
      `chat_channel_discord_${id}`
    );
    if (channelId === null) {
      await this.logger.error(`${name}のチャンネルIDが設定されていません。`);
      return;
    }

    const unreadCount = await getUnreadMessageCount(
      this.env.DISCORD_BOT_TOKEN_RIN,
      channelId
    );
    await this.logger.info(`${name}の未読メッセージ数: ${unreadCount}`);
    if (unreadCount === 0) {
      await this.logger.info(`未読メッセージがありません。`);
      return;
    }

    await this.setState('Running');
    await this.logger.info(`${name}が思考を開始しました。`);

    try {
      const openai = new OpenAIClient(
        this.env,
        [
          getCurrentTimeFunction,
          checkNotificationsFunction,
          readChatMessagesFunction,
          sendChatMessageFunction,
          thinkDeeplyFunction,
        ],
        {
          echoId: id,
          store: this.store,  
          storage: this.storage,
          discordBotToken: this.env.DISCORD_BOT_TOKEN_RIN,
          logger: this.logger,
        }
      );
      const messages = [
        {
          role: 'system' as const,
          content: echoSystemMessage,
        },
      ];
      const usage = await openai.call(messages);

      // Usage情報を累積保存
      await this.accumulateUsage(usage);

      await this.logger.info(`${name}が思考を正常に完了しました。`);
    } catch (error) {
      await this.logger.error(
        `${name}の思考中にエラーが発生しました:`,
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      await this.setState('Idling');
    }
  }

  /**
   * Usage情報を日別に累積保存
   */
  async accumulateUsage(usage: ResponseUsage): Promise<void> {
    const dateKey = getTodayDateString();
    const usageRecord = (await this.storage.get<UsageRecord>('usage')) ?? {};

    if (usageRecord[dateKey]) {
      // 既存の使用量に累積
      usageRecord[dateKey] = {
        input_tokens: usageRecord[dateKey].input_tokens + usage.input_tokens,
        input_tokens_details: {
          cached_tokens:
            usageRecord[dateKey].input_tokens_details.cached_tokens +
            usage.input_tokens_details.cached_tokens,
        },
        output_tokens: usageRecord[dateKey].output_tokens + usage.output_tokens,
        output_tokens_details: {
          reasoning_tokens:
            usageRecord[dateKey].output_tokens_details.reasoning_tokens +
            usage.output_tokens_details.reasoning_tokens,
        },
        total_tokens: usageRecord[dateKey].total_tokens + usage.total_tokens,
      };
    } else {
      // 新しい日付のため初期値として設定
      usageRecord[dateKey] = usage;
    }

    await this.storage.put('usage', usageRecord);
    await this.logger.debug(
      `Usage accumulated for ${dateKey}: ${JSON.stringify(usageRecord[dateKey], null, 2)}`
    );
  }
}

/**
 * 今日の日付を YYYY-MM-DD 形式で取得
 */
function getTodayDateString(): string {
  const today = new Date();
  const isoString = today.toISOString();
  const datePart = isoString.split('T')[0];
  if (datePart === undefined || datePart === '') {
    throw new Error('Failed to extract date from ISO string');
  }
  return datePart;
}

/**
 * 現在時刻に基づいて動的なトークン使用制限を計算
 */
function calculateDynamicTokenLimit(): number {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;

  // 理想的な使用量（現在時刻までの按分）
  const idealUsageAtThisTime = DAILY_TOKEN_LIMIT * (currentHour / 24);

  // 余裕を持たせた許可量
  const allowedUsageWithBuffer = idealUsageAtThisTime * USAGE_BUFFER_FACTOR;

  // 上限は1日の制限を超えない
  return Math.min(allowedUsageWithBuffer, DAILY_TOKEN_LIMIT);
}
