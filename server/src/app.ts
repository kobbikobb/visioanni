import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';
import { goalsRoute } from './routes/goals';

const app = new Hono();

app.use('*', logger());

app.get('/test', (c) => {
    return c.json({ message: 'test result' });
});

app.route('/api/goals', goalsRoute);

app.get('*', serveStatic({ root: './frontend/dist' }));
app.get('*', serveStatic({ path: './frontend/dist/index.html' }));

export default app;
