import { getDb } from '../db';
import { goalsTable } from '../db/schema/goals';
import { eq, desc } from 'drizzle-orm';
import { type Goal, type GoalInsert, type GoalUpdate } from '../sharedTypes';
import { insertGoalSchema, updateGoalSchema } from '../db/schema/goals';

export const getGoals = async (userId: string): Promise<Goal[]> => {
    const db = await getDb();
    const goals = await db
        .select()
        .from(goalsTable)
        .where(eq(goalsTable.userId, userId))
        .orderBy(desc(goalsTable.createdAt));
    return goals;
};

export const addGoal = async (goal: GoalInsert): Promise<Goal> => {
    const db = await getDb();
    const validated = insertGoalSchema.parse(goal);
    const created = await db.insert(goalsTable).values(validated).returning();
    return created[0];
};

export const updateGoal = async (goal: GoalUpdate): Promise<Goal> => {
    const db = await getDb();
    const validated = updateGoalSchema.parse(goal);
    const updated = await db
        .update(goalsTable)
        .set(validated)
        .where(eq(goalsTable.id, goal.id!))
        .returning();
    return updated[0];
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
