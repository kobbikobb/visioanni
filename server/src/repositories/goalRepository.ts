import { getDb } from '../db';
import { goals as goalsTable } from '../db/schema/goals';
import { eq, desc } from 'drizzle-orm';
import { type Goal, type GoalInput } from '../sharedTypes';

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
