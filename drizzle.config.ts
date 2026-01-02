

const DB_TYPE = process.env.DB_TYPE || 'sqlite';
let connectionString = process.env.DATABASE_URL;

// Construct PostgreSQL connection string from decomposed variables if NOT provided
if (DB_TYPE === 'postgres' && (!connectionString || !connectionString.startsWith('postgres'))) {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const user = process.env.DB_USER || 'postgres';
    const password = process.env.DB_PASSWORD || 'postgres';
    const dbName = process.env.DB_NAME || 'postgres';

    connectionString = `postgres://${user}:${encodeURIComponent(password)}@${host}:${port}/${dbName}`;
}

// Fallback for SQLite
if (!connectionString) {
    connectionString = 'file:./dev.db';
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
