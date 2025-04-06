import * as pglite from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as migrator from 'drizzle-orm/pglite/migrator';

export const getDb = async () => {
    const client = new PGlite();
    const db = pglite.drizzle({ client });
    await migrator.migrate(db, { migrationsFolder: './migrations' });
    return db;
};

export const migrate = async () => {
    // We migrate on get DB for dev
};
