import {
    serial,
    text,
    char,
    boolean,
    pgTable,
    index,
    timestamp
} from 'drizzle-orm/pg-core';

export const goals = pgTable(
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
