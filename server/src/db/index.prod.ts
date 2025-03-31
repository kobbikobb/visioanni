import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as migrator from 'drizzle-orm/postgres-js/migrator';

export const getDb = async () => {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL environment variable is not set.');
    }

    const queryClient = postgres(process.env.DATABASE_URL);
    return drizzle({ client: queryClient });
};

export const migrate = async () => {
    const db = await getDb();
    await migrator.migrate(db, { migrationsFolder: './migrations' });
};
