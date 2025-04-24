import { getDb } from '../db';
import { type Task, type TaskInsert } from '../sharedTypes';
import { insertTaskSchema, tasksTable } from '../db/schema/tasks';

export const addTask = async (task: TaskInsert): Promise<Task> => {
    const db = await getDb();
    const validated = insertTaskSchema.parse(task);
    const created = await db.insert(tasksTable).values(validated).returning();
    return created[0];
};
