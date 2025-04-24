import {
    serial,
    text,
    pgTable,
    integer,
    foreignKey
} from 'drizzle-orm/pg-core';
import {
    createSelectSchema,
    createInsertSchema,
    createUpdateSchema
} from 'drizzle-zod';
import { z } from 'zod';
import { goalsTable } from './goals';

export const tasksTable = pgTable(
    'tasks',
    {
        id: serial('id').primaryKey(),
        goalId: integer('goal_id').notNull(),
        title: text('title').notNull()
    },
    (table) => [
        foreignKey({
            columns: [table.goalId],
            foreignColumns: [goalsTable.id]
        })
    ]
);

export const insertTaskSchema = createInsertSchema(tasksTable, {
    title: z.string().nonempty('Title is required')
});

export const selectTaskSchema = createSelectSchema(tasksTable);
export const updateTaskSchema = createUpdateSchema(tasksTable);
