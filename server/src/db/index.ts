// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedImpl: any; // Cache to avoid multiple imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cachedDb: any; // Cache to avoid multiple DB instances

const getImpl = async () => {
    if (!cachedImpl) {
        cachedImpl =
            process.env.NODE_ENV === 'production'
                ? await import('./index.prod')
                : await import('./index.dev');
    }
    return cachedImpl;
};

export const getDb = async () => {
    if (!cachedDb) {
        const impl = await getImpl();
        cachedDb = await impl.getDb();
    }
    return cachedDb;
};

export const migrate = async () => {
    const impl = await getImpl();
    await impl.migrate();
};
