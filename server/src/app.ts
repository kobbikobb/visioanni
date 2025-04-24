import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { serveStatic } from 'hono/bun';
import { goalsRoute } from './routes/goals';
import { tasksRoute } from './routes/tasks';
import { authRoute } from './routes/auth';

const app = new Hono();

app.use('*', logger());

app.get('/test', (c) => {
    return c.json({ message: 'test result' });
});

app.get('/health', (c) => {
    return c.text('OK', 200);
});

// eslint-disable-next-line
const apiRoutes = app
    .basePath('/api')
    .route('/goals', goalsRoute)
    .route('/goals', tasksRoute) // TODO: Reconsider how we register the tasksRoute
    .route('/', authRoute);

app.get('*', serveStatic({ root: './frontend/dist' }));
app.get('*', serveStatic({ path: './frontend/dist/index.html' }));

export default app;
export type ApiRoutes = typeof apiRoutes;
