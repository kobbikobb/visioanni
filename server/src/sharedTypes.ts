import { z } from 'zod';
import { insertGoalSchema, selectGoalSchema } from './db/schema/goals';

export type GoalInput = z.infer<typeof insertGoalSchema>;
export type Goal = z.infer<typeof selectGoalSchema>;

export const goalPostSchema = insertGoalSchema.omit({
    userId: true,
    completed: true
});
