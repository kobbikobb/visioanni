import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getUser } from '../authMiddleware';
import {
    getGoals,
    findGoal,
    addGoal,
    deleteGoal
} from '../repositories/goalRepository';
import { goalPostSchema } from '../sharedTypes';

export const goalsRoute = new Hono()
    .get('/', getUser, async (c) => {
        const user = c.var.user;
        return c.json({ goals: await getGoals(user.id) });
    })
    .get('/:id{[0-9]+}', getUser, async (c) => {
        const user = c.var.user;
        const id = Number.parseInt(c.req.param('id'));
        const goal = await findGoal(id);
        if (!goal) {
            return c.json({ message: 'Goal not found' }, 404);
        }
        if (goal.userId !== user.id) {
            return c.json({ message: 'Not your goal' }, 403);
        }
        return c.json(goal);
    })
    .post('/', getUser, zValidator('json', goalPostSchema), async (c) => {
        const user = c.var.user;
        const goal = c.req.valid('json');
        const goalInput = { ...goal, userId: user.id, completed: false };
        const created = await addGoal(goalInput);
        return c.json(created, 201);
    })
    .delete('/:id{[0-9]+}', getUser, async (c) => {
        const user = c.var.user;
        const id = Number.parseInt(c.req.param('id'));
        const goal = await findGoal(id);
        if (!goal) {
            return c.json({ message: 'Goal not found' }, 404);
        }
        if (goal.userId !== user.id) {
            return c.json({ message: 'Not your goal' }, 403);
        }
        await deleteGoal(id);

        c.status(204);
        return c.body('');
    });
