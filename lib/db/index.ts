import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from './schema';

// =============================================================================
// Database Connection
// =============================================================================

const DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db';

// Determine database type from URL
const isPostgres = DATABASE_URL.startsWith('postgres://') || DATABASE_URL.startsWith('postgresql://');
const isSqlite = DATABASE_URL.startsWith('file:') || !isPostgres;

// =============================================================================
// PostgreSQL Connection
// =============================================================================

let pgClient: ReturnType<typeof postgres> | null = null;
let pgDb: ReturnType<typeof drizzlePg> | null = null;

if (isPostgres) {
    pgClient = postgres(DATABASE_URL);
    pgDb = drizzlePg(pgClient, { schema });
}

// =============================================================================
// SQLite Connection
// =============================================================================

let sqliteClient: Database.Database | null = null;
let sqliteDb: ReturnType<typeof drizzleSqlite> | null = null;

if (isSqlite) {
    const dbPath = DATABASE_URL.replace('file:', '');
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
