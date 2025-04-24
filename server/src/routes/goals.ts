import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getUser } from '../authMiddleware';
import {
    getGoals,
    findGoal,
    addGoal,
    updateGoal,
    deleteGoal
} from '../repositories/goalRepository';
import { goalPostSchema, goalPutSchema } from '../sharedTypes';

export const goalsRoute = new Hono()
    .get('/', getUser, async (c) => {
        const user = c.var.user;
        const goals = await getGoals(user.id);
        return c.json({ goals });
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
        const goalJson = c.req.valid('json');
        const goal = { ...goalJson, userId: user.id, completed: false };
        const created = await addGoal(goal);
        return c.json(created, 201);
    })
    .put(
        '/:id{[0-9]+}',
        getUser,
        zValidator('json', goalPutSchema),
        async (c) => {
            const user = c.var.user;
            const id = Number.parseInt(c.req.param('id'));
            const existingGoal = await findGoal(id);
            if (!existingGoal) {
                return c.json({ message: 'Goal not found.' }, 404);
            }
            if (existingGoal.userId !== user.id) {
                return c.json({ message: 'Illegal request.' }, 403);
            }

            const goalJson = c.req.valid('json');
            const goal = { ...goalJson, id, userId: user.id };
            const updated = await updateGoal(goal);

            return c.json(updated, 200);
        }
    )
    .delete('/:id{[0-9]+}', getUser, async (c) => {
        const user = c.var.user;
        const id = Number.parseInt(c.req.param('id'));
        const goal = await findGoal(id);
        if (!goal) {
            return c.json({ message: 'Goal not found.' }, 404);
        }
        if (goal.userId !== user.id) {
            return c.json({ message: 'Illegal request.' }, 403);
        }
        await deleteGoal(id);

        c.status(204);
        return c.body('');
    });
