/**
 * Async query helpers for both SQLite and PostgreSQL
 */

import { getDbType } from '../config';
import { getConnection } from './connection';

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Execute a SELECT query (async)
 */
export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const conn = getConnection();

    if (conn.type === 'sqlite') {
        const stmt = conn.db.prepare(sql);
        return (params ? stmt.all(...params) : stmt.all()) as T[];
    }

    const result = await conn.pool.query(sql, params);
    return result.rows as T[];
}

/**
 * Execute a SELECT query returning single row (async)
 */
export async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
    const rows = await query<T>(sql, params);
    return rows[0] || null;
}

// =============================================================================
// Execute Functions (INSERT, UPDATE, DELETE)
// =============================================================================

export interface ExecuteResult {
    lastInsertId?: number;
    rowsAffected: number;
}

/**
 * Execute INSERT/UPDATE/DELETE (async)
 */
export async function execute(sql: string, params?: unknown[]): Promise<ExecuteResult> {
    const conn = getConnection();

    if (conn.type === 'sqlite') {
        const stmt = conn.db.prepare(sql);
        const result = params ? stmt.run(...params) : stmt.run();
        return {
            lastInsertId: result.lastInsertRowid as number,
            rowsAffected: result.changes
        };
    }

    const result = await conn.pool.query(sql, params);
    return {
        lastInsertId: result.rows[0]?.id,
        rowsAffected: result.rowCount || 0
    };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get placeholder syntax (? for SQLite, $N for PostgreSQL)
 */
export function placeholder(index: number): string {
    const dbType = getDbType();
    return dbType === 'sqlite' ? '?' : `$${index}`;
}

/**
 * Build multiple placeholders
 */
export function placeholders(count: number): string {
    const dbType = getDbType();
    if (dbType === 'sqlite') {
        return Array(count).fill('?').join(', ');
    }
    return Array.from({ length: count }, (_, i) => `$${i + 1}`).join(', ');
}

/**
 * Get current timestamp SQL
 */
export function nowSQL(): string {
    const dbType = getDbType();
    return dbType === 'sqlite' ? "datetime('now')" : 'NOW()';
}
