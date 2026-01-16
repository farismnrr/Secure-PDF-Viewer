

const DB_TYPE = process.env.DB_TYPE;

if (!DB_TYPE) {
    throw new Error('DB_TYPE must be configured (sqlite or postgres)');
}
if (DB_TYPE !== 'sqlite' && DB_TYPE !== 'postgres') {
    throw new Error(`Invalid DB_TYPE: ${DB_TYPE}. Must be 'sqlite' or 'postgres'`);
}

let connectionString = process.env.DATABASE_URL;

// Construct PostgreSQL connection string from decomposed variables if NOT provided
if (DB_TYPE === 'postgres' && (!connectionString || !connectionString.startsWith('postgres'))) {
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const dbName = process.env.DB_NAME;

    if (!host) throw new Error('DB_HOST must be configured for PostgreSQL');
    if (!port) throw new Error('DB_PORT must be configured for PostgreSQL');
    if (!user) throw new Error('DB_USER must be configured for PostgreSQL');
    if (!password) throw new Error('DB_PASSWORD must be configured for PostgreSQL');
    if (!dbName) throw new Error('DB_NAME must be configured for PostgreSQL');

    connectionString = `postgres://${user}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
}

// Validate connection string exists
if (!connectionString) {
    throw new Error('DATABASE_URL must be configured or database connection variables must be set');
}

const isPostgres = DB_TYPE === 'postgres';

const config = {
    schema: './lib/db/schema.ts',
    out: './drizzle',
    dialect: isPostgres ? 'postgresql' : 'sqlite',
    dbCredentials: isPostgres
        ? { url: connectionString }
        : { url: connectionString.replace('file:', '') },
};

export default config;
