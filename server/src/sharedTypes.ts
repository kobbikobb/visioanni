import { z } from 'zod';

export const goalSchema = z.object({
    id: z.number().int().positive(),
    userId: z.string(),
    title: z.string().min(1),
    date: z
        .string()
        .nonempty('Date is required')
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in the format yyyy-MM-dd'),
    completed: z.boolean()
});

export type Goal = z.infer<typeof goalSchema>;

export const goalInputSchema = goalSchema.omit({
    id: true,
    userId: true,
    completed: true
});

export type GoalInput = Omit<Goal, 'id'>;
