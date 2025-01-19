import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { goalsRoute } from './routes/goals';

const app = new Hono();

app.use('*', logger());

app.get("/test", c => {
    return c.json({"message": "test result"});
});

app.route('/api/goals', goalsRoute);

export default app
