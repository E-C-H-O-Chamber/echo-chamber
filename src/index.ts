import { Hono } from 'hono';

import { isValidInstanceId } from './types/echo-config';

export { Echo } from './echo';

const app = new Hono<{ Bindings: Env }>();

app.get('/', (c) => {
  return c.text('E.C.H.O Chamber is running.');
});

// 動的ルーティング: 有効なインスタンスIDのみを受け付ける
app.all('/:instanceId/*', async (c) => {
  const instanceId = c.req.param('instanceId');

  // 有効なインスタンスIDかチェック
  if (!isValidInstanceId(instanceId)) {
    return c.notFound();
  }

  const id = c.env.ECHO.idFromName(instanceId);
  const echo = c.env.ECHO.get(id);

  return await echo.fetch(c.req.raw);
});

export default app satisfies ExportedHandler<Env>;
