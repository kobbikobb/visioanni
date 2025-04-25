import { getDb } from '../db';
import { type Task, type TaskInsert, type TaskUpdate } from '../sharedTypes';
import { eq } from 'drizzle-orm';
import {
    insertTaskSchema,
    tasksTable,
    updateTaskSchema
} from '../db/schema/tasks';

export const addTask = async (task: TaskInsert): Promise<Task> => {
    const db = await getDb();
    const validated = insertTaskSchema.parse(task);
    const created = await db.insert(tasksTable).values(validated).returning();
    return created[0];
};

export const findTask = async (id: number): Promise<Task | undefined> => {
    const db = await getDb();
    const tasks = await db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.id, id))
        .limit(1);

    return tasks.length === 1 ? tasks[0] : undefined;
};

export const getTasks = async (goalId: number): Promise<Task[]> => {
    const db = await getDb();
    const tasks = await db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.goalId, goalId));
    return tasks;
};

export const updateTask = async (task: TaskUpdate): Promise<Task> => {
    const db = await getDb();
    const validated = updateTaskSchema.parse(task);
    const updated = await db
        .update(tasksTable)
        .set(validated)
        .where(eq(tasksTable.id, task.id!))
        .returning();
    return updated[0];
};

export const deleteTask = async (id: number): Promise<Task> => {
    const db = await getDb();
    const deleted = await db
        .delete(tasksTable)
        .where(eq(tasksTable.id, id))
        .returning();
    return deleted[0];
};
