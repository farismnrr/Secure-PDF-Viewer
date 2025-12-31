/**
 * Database connection manager
 * Singleton pattern for connection reuse
 */

import Database from 'better-sqlite3';
import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import { getDbType, getDbConfig } from '../config';

// =============================================================================
// Connection Types
// =============================================================================

interface SqliteConnection {
    type: 'sqlite';
    db: Database.Database;
}

interface PostgresConnection {
    type: 'postgres';
    pool: Pool;
}

type DbConnection = SqliteConnection | PostgresConnection;

// =============================================================================
// Singleton Connection
// =============================================================================

let connection: DbConnection | null = null;

function createSqliteConnection(): SqliteConnection {
    const config = getDbConfig();
    const dbPath = config.path || path.join(process.cwd(), 'data', 'viewer.db');
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    return {
        type: 'sqlite',
        db: new Database(dbPath)
    };
}

function createPostgresConnection(): PostgresConnection {
    const config = getDbConfig();

    return {
        type: 'postgres',
        pool: new Pool({
            host: config.host,
            port: config.port,
            user: config.user,
            password: config.password,
            database: config.database
        })
    };
}

/**
 * Get database connection (creates if not exists)
 */
export function getConnection(): DbConnection {
    if (connection) return connection;

    const dbType = getDbType();
    connection = dbType === 'sqlite'
        ? createSqliteConnection()
        : createPostgresConnection();

    return connection;
}

/**
 * Close database connection
 */
export function closeConnection(): void {
    if (!connection) return;

    if (connection.type === 'sqlite') {
        connection.db.close();
    } else {
        connection.pool.end();
    }

    connection = null;
}

/**
 * Get raw SQLite database instance (for sync operations)
 */
export function getSqliteDb(): Database.Database {
    const conn = getConnection();
    if (conn.type !== 'sqlite') {
        throw new Error('getSqliteDb() only available for SQLite');
    }
    return conn.db;
}

/**
 * Get PostgreSQL pool (for async operations)
 */
export function getPostgresPool(): Pool {
    const conn = getConnection();
    if (conn.type !== 'postgres') {
        throw new Error('getPostgresPool() only available for PostgreSQL');
    }
    return conn.pool;
}

export { type DbConnection };
