import { Hono } from 'hono';

export { Echo } from './echo';

const app = new Hono<{Bindings: Env}>();

app.get('/', (c) => {
	return c.text('E.C.H.O Chamber is running.');
});

app.all('/rin/*', async (c) => {
	const id = c.env.ECHO.idFromName('Rin');
	const rin = c.env.ECHO.get(id);
	const greeting = await rin.sayHello('world!');
	return c.text(greeting);
});

export default app satisfies ExportedHandler<Env>;
