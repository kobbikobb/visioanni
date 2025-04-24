import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getUser } from '../authMiddleware';
import { addTask } from '../repositories/taskRepository';
import { taskPostSchema } from '../sharedTypes';

export const tasksRoute = new Hono().post(
    '/:goalId{[0-9]+}/tasks',
    getUser,
    zValidator('json', taskPostSchema),
    async (c) => {
        const goalId = Number.parseInt(c.req.param('goalId'));
        const taskJson = c.req.valid('json');

        const task = { ...taskJson, goalId };
        const created = await addTask(task);

        return c.json(created, 201);
    }
);
