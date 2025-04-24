import {
    serial,
    text,
    char,
    boolean,
    pgTable,
    index,
    timestamp
} from 'drizzle-orm/pg-core';
import {
    createSelectSchema,
    createInsertSchema,
    createUpdateSchema
} from 'drizzle-zod';
import { z } from 'zod';

export const goalsTable = pgTable(
    'goals',
    {
        id: serial('id').primaryKey(),
        userId: text('user_id').notNull(),
        title: text('title').notNull(),
        date: char('date', { length: 10 }).notNull(),
        completed: boolean('completed').notNull(),
        createdAt: timestamp('created_at').defaultNow()
    },
    (table) => [index('user_id_idx').on(table.userId)]
);

export const insertGoalSchema = createInsertSchema(goalsTable, {
    userId: z.string().nonempty('User id is required'),
    title: z.string().nonempty('Title is required'),
    date: z
        .string()
        .nonempty('Date is required')
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in the format yyyy-MM-dd'),
    completed: z.boolean()
});

export const selectGoalSchema = createSelectSchema(goalsTable);
export const updateGoalSchema = createUpdateSchema(goalsTable);
