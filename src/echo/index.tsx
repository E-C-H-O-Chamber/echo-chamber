import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';

import { getUnreadMessageCount } from '../discord';
import { formatDate, formatDatetime } from '../utils/datetime';
import { getErrorMessage } from '../utils/error';
import { createLogger } from '../utils/logger';

import { ALARM_CONFIG, TOKEN_LIMITS } from './constants';
import { ThinkingEngine } from './thinking-engine';
import { addUsage, calculateDynamicTokenLimit, convertUsage } from './usage';
import { StatusPage } from './view/pages/StatusPage';

import type { EchoState, Task, Usage, UsageRecord } from './types';
import type { Logger } from '../utils/logger';

export class Echo extends DurableObject<Env> {
  private readonly store: KVNamespace;
  private readonly storage: DurableObjectStorage;
  private readonly router: Hono;
  private readonly logger: Logger;
  private readonly thinkingEngine: ThinkingEngine;

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
    this.thinkingEngine = new ThinkingEngine({
      env,
      storage: this.storage,
      store: this.store,
      logger: this.logger,
      // 既存仕様踏襲: 固定ID/トークン（後続の段階で動的化）
      discordBotToken: env.DISCORD_BOT_TOKEN_RIN,
      echoId: 'rin',
    });
    this.router = new Hono()
      .basePath('/:id')
      .get('/', async (c) => {
        const id = await this.getId();
        const name = await this.getName();
        const state = await this.getState();
        const nextAlarm = await this.storage.getAlarm();
        const context = await this.storage.get<string>('context');
        const tasks = (await this.storage.get<Task[]>('tasks')) ?? [];
        const usage = await this.getAllUsage();
        return c.render(
          <StatusPage
            id={id}
            name={name}
            state={state}
            nextAlarm={
              nextAlarm != null ? formatDatetime(new Date(nextAlarm)) : null
            }
            context={context ?? ''}
            tasks={tasks}
            usage={usage}
          />
        );
      })
      .get('/json', async (c) => {
        const id = await this.getId();
        const name = await this.getName();
        const state = await this.getState();
        const nextAlarm = await this.storage.getAlarm();
        const context = await this.storage.get<string>('context');
        const tasks = (await this.storage.get<Task[]>('tasks')) ?? [];
        const usage = await this.getAllUsage();
        return c.json({
          id,
          name,
          state,
          nextAlarm: nextAlarm != null ? new Date(nextAlarm) : null,
          context: context ?? '',
          tasks,
          usage,
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
      .post('/reset', async (c) => {
        await this.storage.put('context', '');
        await this.storage.put('tasks', []);
        return c.text('OK.');
      })
      .delete('/tasks/', async (c) => {
        const taskName = c.req.query('name');
        const tasks = (await this.storage.get<Task[]>('tasks')) ?? [];
        if (!tasks.find((t) => t.name === taskName)) {
          return c.text('Task not found', 404);
        }
        await this.storage.put(
          'tasks',
          tasks.filter((t) => t.name !== taskName)
        );
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
    nextAlarm.setMinutes(
      nextAlarm.getMinutes() + ALARM_CONFIG.INTERVAL_MINUTES
    );
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
  async getTodayUsage(): Promise<Usage | null> {
    const usageRecord = (await this.storage.get<UsageRecord>('usage')) ?? {};
    return usageRecord[formatDate(new Date())] ?? null;
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
        `Echo encountered an error during sleep: ${getErrorMessage(error)}`
      );
    } finally {
      // await this.setNextAlarm();
      await this.setState('Idling');
    }
  }

  async run(): Promise<void> {
    if (!(await this.validateRunPreconditions())) {
      return;
    }

    await this.setState('Running');
    const name = await this.getName();
    await this.logger.info(`${name}が思考を開始しました。`);

    try {
      const usage = await this.thinkingEngine.think();
      await this.logger.info(`usage: ${usage.total_tokens}`);
      await this.updateUsage(convertUsage(usage));
      await this.logger.info(`${name}が思考を正常に完了しました。`);
    } catch (error) {
      await this.logger.error(
        `${name}の思考中にエラーが発生しました: ${getErrorMessage(error)}`
      );
    } finally {
      await this.setState('Idling');
    }
  }

  /**
   * 実行前の前提条件を検証
   */
  private async validateRunPreconditions(): Promise<boolean> {
    // Stateチェック
    if (!(await this.validateEchoState())) {
      return false;
    }

    // 未読メッセージがあれば実行
    if (await this.validateChatMessage()) {
      return true;
    }

    // Usageチェック
    const usageValidationMessage = await this.validateUsageLimit();

    // 実行すべきタスクがあれば実行
    if (await this.validateTask()) {
      if (usageValidationMessage) {
        await this.logger.warn(usageValidationMessage);
        return false;
      }
      return true;
    }

    // tokenが余っていれば実行
    const softLimit = calculateDynamicTokenLimit(TOKEN_LIMITS.DAILY_SOFT_LIMIT);
    const todayUsage = await this.getTodayUsage();
    const totalTokens = todayUsage?.total_tokens ?? 0;
    if (totalTokens < softLimit) {
      await this.logger.info(
        `Usage: ${totalTokens}  (Soft limit: ${Math.floor(softLimit)})`
      );
      return true;
    }

    // どの条件も満たしていない場合は実行しない
    return false;
  }

  /**
   * Echoの状態を検証
   */
  private async validateEchoState(): Promise<boolean> {
    const id = await this.getId();
    const name = await this.getName();

    // IDが未登録の場合は実行できない
    if (id === 'Echo') {
      await this.logger.error('Echo ID is not set. Cannot validate state.');
      return false;
    }

    const state = await this.getState();

    // 睡眠中は実行できない
    if (state === 'Sleeping') {
      await this.logger.warn(
        `${name} is currently sleeping! Cannot run while sleeping.`
      );
      return false;
    }

    // 既に実行中の場合は何もしない
    if (state === 'Running') {
      await this.logger.warn(`${name} is already running.`);
      return false;
    }

    return true;
  }

  /**
   * Usageの制限を検証
   */
  private async validateUsageLimit(): Promise<string> {
    const name = await this.getName();
    const todayUsage = await this.getTodayUsage();
    const dynamicLimit = calculateDynamicTokenLimit(
      TOKEN_LIMITS.DAILY_LIMIT,
      TOKEN_LIMITS.BUFFER_FACTOR
    );

    if (todayUsage && todayUsage.total_tokens >= dynamicLimit) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });

      return (
        `${name}の現在時刻(${timeStr})におけるトークン使用制限(${Math.floor(dynamicLimit)})を超えています。` +
        `現在の使用量: ${todayUsage.total_tokens}トークン。` +
        `(1日上限: ${TOKEN_LIMITS.DAILY_LIMIT}トークン)`
      );
    }

    return '';
  }

  /**
   * 未読メッセージがあるか検証
   */
  private async validateChatMessage(): Promise<boolean> {
    const id = await this.getId();
    const name = await this.getName();

    const channelId = await this.store.get<string>(
      `chat_channel_discord_${id}`
    );

    if (channelId === null) {
      await this.logger.error(`${name}のチャンネルIDが設定されていません。`);
      return false;
    }

    const unreadCount = await getUnreadMessageCount(
      this.env.DISCORD_BOT_TOKEN_RIN,
      channelId
    );
    if (unreadCount > 0) {
      await this.logger.info(`${name}の未読メッセージ数: ${unreadCount}`);
    } else {
      await this.logger.debug(`${name}の未読メッセージはありません。`);
    }

    return unreadCount > 0;
  }

  /**
   * 実行すべきタスクがあるか検証
   */
  private async validateTask(): Promise<boolean> {
    const tasks = await this.storage.get<Task[]>('tasks');
    if (!tasks) {
      await this.logger.debug('タスクがありません。');
      return false;
    }

    const nextTime = new Date();
    nextTime.setMinutes(nextTime.getMinutes() + ALARM_CONFIG.INTERVAL_MINUTES);

    const taskToExecute = tasks.find((task) => {
      const taskExecutionTime = new Date(task.execution_time);
      return taskExecutionTime < nextTime;
    });

    if (taskToExecute) {
      await this.logger.info(`予定されたタスク: ${taskToExecute.name}`);
    } else {
      await this.logger.debug('予定されたタスクなし');
    }

    return !!taskToExecute;
  }

  /**
   * Usage情報を日別に累積保存
   */
  async updateUsage(usage: Usage): Promise<void> {
    const dateKey = formatDate(new Date());
    const usageRecord = (await this.storage.get<UsageRecord>('usage')) ?? {};
    await this.storage.put('usage', addUsage(usageRecord, dateKey, usage));
    await this.logger.debug(
      `Usage accumulated for ${dateKey}: ${JSON.stringify(usageRecord[dateKey], null, 2)}`
    );
  }
}
