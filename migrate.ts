import { migrate } from './server/src/db';

export const runMigrations = async () => {
    await migrate();
    console.log('Migration completed!');
}

await runMigrations();
