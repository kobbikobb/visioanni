import { z } from 'zod';
import { getDb } from '../db';
import { goals as goalsTable } from '../db/schema/goals';
import { eq, desc } from 'drizzle-orm';

export const goalSchema = z.object({
    id: z.number().int().positive(),
    userId: z.string(),
    title: z.string().min(1),
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in the format yyyy-MM-dd'),
    completed: z.boolean()
});

export type Goal = z.infer<typeof goalSchema>;
export type GoalInput = Omit<Goal, 'id'>;

export const getGoals = async (userId: string): Promise<Goal[]> => {
    const db = await getDb();
    const goals = await db
        .select()
        .from(goalsTable)
        .where(eq(goalsTable.userId, userId))
        .orderBy(desc(goalsTable.createdAt));
    return goals;
};

export const addGoal = async (goal: GoalInput): Promise<Goal> => {
    const db = await getDb();
    const created = await db.insert(goalsTable).values(goal).returning();
    return created[0];
};

export const findGoal = async (id: number): Promise<Goal | undefined> => {
    const db = await getDb();
    const goals = await db
        .select()
        .from(goalsTable)
        .where(eq(goalsTable.id, id))
        .limit(1);
    return goals.length === 0 ? undefined : goals[0];
};

export const deleteGoal = async (id: number): Promise<void> => {
    const db = await getDb();
    await db.delete(goalsTable).where(eq(goalsTable.id, id));
};
