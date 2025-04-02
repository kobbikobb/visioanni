import { migrate } from './';

export const runMigrations = async () => {
    await migrate();
    console.log('Migration completed!');
};

await runMigrations();
