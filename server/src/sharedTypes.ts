import { z } from 'zod';
import {
    insertGoalSchema,
    selectGoalSchema,
    updateGoalSchema
} from './db/schema/goals';
import {
    insertTaskSchema,
    selectTaskSchema,
    updateTaskSchema
} from './db/schema/tasks';

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

export type TaskInsert = z.infer<typeof insertTaskSchema>;
export type TaskUpdate = z.infer<typeof updateTaskSchema>;
export type Task = z.infer<typeof selectTaskSchema>;

export const taskPostSchema = insertTaskSchema.omit({
    goalId: true
});

export const taskPutSchema = updateTaskSchema.omit({
    goalId: true
});
