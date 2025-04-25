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
import { validateGoal } from './util/validation';

export const goalsRoute = new Hono()
    .get('/', getUser, async (c) => {
        const user = c.var.user;
        const goals = await getGoals(user.id);
        return c.json({ goals });
    })
    .get('/:id{[0-9]+}', getUser, async (c) => {
        const user = c.var.user;
        const id = Number.parseInt(c.req.param('id'));

        const existingGoal = await findGoal(id);
        const error = await validateGoal(existingGoal, user.id);
        if (error) {
            return c.json({ message: error.message }, error.status);
        }

        return c.json(existingGoal);
    })
    .post('/', getUser, zValidator('json', goalPostSchema), async (c) => {
        const user = c.var.user;
        const goalCreateJson = c.req.valid('json');
        const goalCreate = {
            ...goalCreateJson,
            userId: user.id,
            completed: false
        };

        const createdGoal = await addGoal(goalCreate);

        return c.json(createdGoal, 201);
    })
    .put(
        '/:id{[0-9]+}',
        getUser,
        zValidator('json', goalPutSchema),
        async (c) => {
            const user = c.var.user;
            const id = Number.parseInt(c.req.param('id'));

            const existingGoal = await findGoal(id);
            const error = await validateGoal(existingGoal, user.id);
            if (error) {
                return c.json({ message: error.message }, error.status);
            }

            const goalUpdateJson = c.req.valid('json');
            const goalUpdate = { ...goalUpdateJson, id, userId: user.id };
            const updatedGoal = await updateGoal(goalUpdate);

            return c.json(updatedGoal, 200);
        }
    )
    .delete('/:id{[0-9]+}', getUser, async (c) => {
        const user = c.var.user;
        const id = Number.parseInt(c.req.param('id'));

        const existingGoal = await findGoal(id);
        const error = await validateGoal(existingGoal, user.id);
        if (error) {
            return c.json({ message: error.message }, error.status);
        }

        await deleteGoal(id);

        c.status(204);
        return c.body('');
    });
