import * as pglite from 'drizzle-orm/pglite';
import { PGlite } from '@electric-sql/pglite';
import * as migrator from 'drizzle-orm/pglite/migrator';

let i = 1;
export const getDb = async () => {
    const client = new PGlite();
    const db = pglite.drizzle({ client });
    console.log('migrate');
    i = i + 1;
    console.log(i);
    await migrator.migrate(db, { migrationsFolder: './migrations' });
    return db;
};

export const migrate = async () => {
    // We migrate on get DB for dev
};
