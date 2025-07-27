import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';

import { getUnreadMessageCount } from '../discord';
import { OpenAIClient } from '../llm/openai/client';
import { echoSystemMessage } from '../llm/prompts/system';
import { createLogger } from '../utils/logger';

import type { Logger } from '../utils/logger';

type EchoState = 'Idling' | 'Running' | 'Sleeping';

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
        return c.json({
          id,
          name,
          state,
          nextAlarm:
            nextAlarm != null ? new Date(nextAlarm).toISOString() : null,
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
      await this.setNextAlarm();
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
      const openai = new OpenAIClient(this.env);
      const messages = [
        {
          role: 'system' as const,
          content: echoSystemMessage,
        },
      ];
      await openai.call(messages);
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
}
