import { z } from 'zod';
import {
    insertGoalSchema,
    selectGoalSchema,
    updateGoalSchema
} from './db/schema/goals';

export type GoalInsert = z.infer<typeof insertGoalSchema>;
export type GoalUpdate = z.infer<typeof updateGoalSchema>;
export type Goal = z.infer<typeof selectGoalSchema>;

export const goalPostSchema = insertGoalSchema.omit({
    userId: true,
    completed: true
});

export const goalPutSchema = updateGoalSchema.omit({
    userId: true
});
