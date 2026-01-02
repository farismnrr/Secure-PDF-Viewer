import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from './schema';

// =============================================================================
// Database Connection
// =============================================================================

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
