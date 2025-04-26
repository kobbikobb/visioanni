import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { getUser } from '../authMiddleware';
import {
    addTask,
    deleteTask,
    findTask,
    getTasks,
    updateTask
} from '../repositories/taskRepository';
import { taskPostSchema, taskPutSchema } from '../sharedTypes';
import { validateGoalId, validateTask } from './util/validation';

export const tasksRoute = new Hono()
    .post(
        '/:goalId{[0-9]+}/tasks',
        getUser,
        zValidator('json', taskPostSchema),
        async (c) => {
            const user = c.var.user;
            const goalId = Number.parseInt(c.req.param('goalId'));

            const error = await validateGoalId(goalId, user.id);
            if (error) {
                return c.json({ message: error.message }, error.status);
            }

            const taskCreateJson = c.req.valid('json');
            const taskCreate = { ...taskCreateJson, goalId };
            const created = await addTask(taskCreate);

            return c.json(created, 201);
        }
    )
    .get('/:goalId{[0-9]+}/tasks/:taskId{[0-9]+}', getUser, async (c) => {
        const user = c.var.user;
        const goalId = Number.parseInt(c.req.param('goalId'));
        const taskId = Number.parseInt(c.req.param('taskId'));

        const existingTask = await findTask(taskId);
        const error = await validateTask(existingTask, goalId, user.id);
        if (error) {
            return c.json({ message: error.message }, error.status);
        }

        return c.json(existingTask, 200);
    })
    .get('/:goalId{[0-9]+}/tasks', getUser, async (c) => {
        const user = c.var.user;
        const goalId = Number.parseInt(c.req.param('goalId'));

        const error = await validateGoalId(goalId, user.id);
        if (error) {
            return c.json({ message: error.message }, error.status);
        }

        const tasks = await getTasks(goalId);
        return c.json({ tasks }, 200);
    })
    .put(
        '/:goalId{[0-9]+}/tasks/:taskId{[0-9]+}',
        getUser,
        zValidator('json', taskPutSchema),
        async (c) => {
            const user = c.var.user;
            const goalId = Number.parseInt(c.req.param('goalId'));
            const taskId = Number.parseInt(c.req.param('taskId'));

            const existingTask = await findTask(taskId);
            const error = await validateTask(existingTask, goalId, user.id);
            if (error) {
                return c.json({ message: error.message }, error.status);
            }

            const taskUpdateJson = c.req.valid('json');
            const taskUpdate = { ...taskUpdateJson, id: taskId };
            const updatedTask = await updateTask(taskUpdate);

            return c.json(updatedTask);
        }
    )
    .delete('/:goalId{[0-9]+}/tasks/:taskId{[0-9]+}', getUser, async (c) => {
        const user = c.var.user;
        const goalId = Number.parseInt(c.req.param('goalId'));
        const taskId = Number.parseInt(c.req.param('taskId'));

        const existingTask = await findTask(taskId);
        const error = await validateTask(existingTask, goalId, user.id);
        if (error) {
            return c.json({ message: error.message }, error.status);
        }

        await deleteTask(taskId);

        c.status(204);
        return c.body('');
    });
