import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from './schema';

// =============================================================================
// Database Connection
// =============================================================================

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

// Determine database type
const isPostgres = DB_TYPE === 'postgres';
const isSqlite = !isPostgres;

// =============================================================================
// PostgreSQL Connection
// =============================================================================

let pgClient: ReturnType<typeof postgres> | null = null;
let pgDb: ReturnType<typeof drizzlePg> | null = null;

if (isPostgres) {
    pgClient = postgres(connectionString);
    pgDb = drizzlePg(pgClient, { schema });
}

// =============================================================================
// SQLite Connection
// =============================================================================

let sqliteClient: Database.Database | null = null;
let sqliteDb: ReturnType<typeof drizzleSqlite> | null = null;

if (isSqlite) {
    const dbPath = connectionString.replace('file:', '');
    sqliteClient = new Database(dbPath);
    sqliteDb = drizzleSqlite(sqliteClient, { schema });
}

// =============================================================================
// Export unified db instance
// =============================================================================

// Export unified db instance with loose typing to allow mixed driver usage
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = (pgDb || sqliteDb)! as any;

// Export schema for queries
export { schema };

// Export table references based on database type
export const nonces = isPostgres ? schema.pgNonces : schema.sqliteNonces;
export const accessLogs = isPostgres ? schema.pgAccessLogs : schema.sqliteAccessLogs;
export const documents = isPostgres ? schema.pgDocuments : schema.sqliteDocuments;

// Cleanup function for graceful shutdown
export async function closeDatabase() {
    if (pgClient) {
        await pgClient.end();
    }
    if (sqliteClient) {
        sqliteClient.close();
    }
}
