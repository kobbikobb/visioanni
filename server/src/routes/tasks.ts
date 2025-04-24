import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getUser } from '../authMiddleware';
import { addTask, deleteTask, findTask } from '../repositories/taskRepository';
import { taskPostSchema, type Task } from '../sharedTypes';
import { findGoal } from '../repositories/goalRepository';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

type ValidationError =
    | { message: string; status: ContentfulStatusCode }
    | undefined;

const validateGoal = async (
    goalId: number,
    userId: string
): Promise<ValidationError> => {
    const existingGoal = await findGoal(goalId);
    if (!existingGoal) {
        return { message: 'Not found.', status: 404 };
    }
    if (existingGoal.userId !== userId) {
        return { message: 'Not permitted.', status: 403 };
    }
    return undefined;
};

const validateTask = async (
    task: Task | undefined,
    goalId: number,
    userId: string
): Promise<ValidationError> => {
    if (!task) {
        return { message: 'Not found.', status: 404 };
    }
    if (task.goalId !== goalId) {
        return { message: 'Not permitted.', status: 403 };
    }
    return validateGoal(goalId, userId);
};

export const tasksRoute = new Hono()
    .post(
        '/:goalId{[0-9]+}/tasks',
        getUser,
        zValidator('json', taskPostSchema),
        async (c) => {
            const user = c.var.user;
            const goalId = Number.parseInt(c.req.param('goalId'));

            const error = await validateGoal(goalId, user.id);
            if (error) {
                return c.json({ message: error.message }, error.status);
            }
            const taskJson = c.req.valid('json');

            const task = { ...taskJson, goalId };
            const created = await addTask(task);

            return c.json(created, 201);
        }
    )
    .get('/:goalId{[0-9]+}/tasks/:taskId{[0-9]+}', getUser, async (c) => {
        const user = c.var.user;
        const goalId = Number.parseInt(c.req.param('goalId'));
        const taskId = Number.parseInt(c.req.param('taskId'));

        const task = await findTask(taskId);
        const error = await validateTask(task, goalId, user.id);
        if (error) {
            return c.json({ message: error.message }, error.status);
        }

        return c.json(task, 200);
    })
    .delete('/:goalId{[0-9]+}/tasks/:taskId{[0-9]+}', getUser, async (c) => {
        const user = c.var.user;
        const goalId = Number.parseInt(c.req.param('goalId'));
        const taskId = Number.parseInt(c.req.param('taskId'));

        const task = await findTask(taskId);
        const validationError = await validateTask(task, goalId, user.id);
        if (validationError) {
            return c.json(
                { message: validationError.message },
                validationError.status
            );
        }

        await deleteTask(taskId);

        c.status(204);
        return c.body('');
    });
