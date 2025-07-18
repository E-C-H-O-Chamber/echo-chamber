import { DurableObject } from 'cloudflare:workers';
import { Hono } from 'hono';

type EchoState = 'Idling' | 'Running' | 'Sleeping';

export class Echo extends DurableObject<Env> {
  private readonly store: KVNamespace;
  private readonly storage: DurableObjectStorage;
  private readonly router: Hono;
  private id: string;

  /**
   * The constructor is invoked once upon creation of the Durable Object, i.e. the first call to
   * 	`DurableObjectStub::get` for a given identifier (no-op constructors can be omitted)
   *
   * @param ctx - The interface for interacting with Durable Object state
   * @param env - The interface to reference bindings declared in wrangler.jsonc
   */
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.id = ctx.id.name ?? 'Echo';
    this.store = env.ECHO_KV;
    this.storage = ctx.storage;
    this.router = new Hono()
      .basePath('/:id')
      .get('/', async (c) => {
        const state = await this.getState();
        return c.json({
          id: this.id,
          name: await this.getName(),
          state,
        });
      })
      .post('/wake', async (c) => {
        this.id = c.req.param('id');
        await this.wake(true);
        return c.text('OK.');
      })
      .post('/sleep', async (c) => {
        this.id = c.req.param('id');
        await this.sleep(true);
        return c.text('OK.');
      })
      .post('/run', async (c) => {
        if (env.ENVIRONMENT !== 'local') {
          return c.notFound();
        }

        this.id = c.req.param('id');
        await this.run();
        return c.text('OK.');
      });
    console.log('Echo Durable Object created');
  }

  async fetch(request: Request): Promise<Response> {
    return this.router.fetch(request);
  }

  async getState(): Promise<EchoState> {
    const state = await this.storage.get<EchoState>('state');
    return state ?? 'Idling';
  }

  async setState(newState: EchoState): Promise<void> {
    await this.storage.put('state', newState);
  }

  async getName(): Promise<string> {
    const name = await this.store.get<string>(`name_${this.id}`);
    return name ?? 'Echo';
  }

  async wake(force = false): Promise<void> {
    const state = await this.getState();

    if (!force && state === 'Sleeping') {
      console.log('Echo is currently sleeping! Cannot wake while sleeping.');
      return;
    }

    await this.setState('Idling');
  }

  async sleep(force = false): Promise<void> {
    const state = await this.getState();

    if (state === 'Sleeping') {
      console.log('Echo is already sleeping.');
      return;
    }

    if (!force && state === 'Running') {
      console.log('Echo is currently running! Cannot sleep while running.');
      return;
    }

    try {
      await this.setState('Sleeping');
      // sleep 処理
    } catch (error) {
      console.error('Echo encountered an error during sleep:', error);
    } finally {
      await this.setState('Idling');
    }
  }

  async run(): Promise<void> {
    const state = await this.getState();

    if (state === 'Sleeping') {
      console.log('Echo is currently sleeping! Cannot run while sleeping.');
      return;
    }

    if (state === 'Running') {
      console.log('Echo is already running.');
      return;
    }

    await this.setState('Running');

    try {
      // メイン処理をここに実装
    } catch (error) {
      console.error('Echo encountered an error during main process:', error);
    } finally {
      await this.setState('Idling');
    }
  }
}
