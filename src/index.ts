import { Hono } from 'hono';

export { Echo } from './echo';

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
  return c.text('E.C.H.O Chamber is running.');
});

app.all('/rin/*', async (c) => {
  const id = c.env.ECHO.idFromName('rin');
  const rin = c.env.ECHO.get(id);

  return await rin.fetch(c.req.raw);
});

export default app satisfies ExportedHandler<Env>;
