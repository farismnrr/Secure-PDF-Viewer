/**
 * Synchronous query helpers for SQLite
 * Used when async operations are not possible
 */

import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { getDbConfig, getDbType } from '../config';

/**
 * Execute a synchronous SELECT query (SQLite only)
 */
export function querySync<T>(sql: string, params?: unknown[]): T[] {
    const dbType = getDbType();
    if (dbType !== 'sqlite') {
        throw new Error('querySync() only available for SQLite');
    }

    const config = getDbConfig();
    const dbPath = config.path || path.join(process.cwd(), 'data', 'viewer.db');

    if (!fs.existsSync(dbPath)) {
        return [];
    }

    const db = new Database(dbPath, { readonly: true });
    try {
        const stmt = db.prepare(sql);
        return (params ? stmt.all(...params) : stmt.all()) as T[];
    } finally {
        db.close();
    }
}

/**
 * Execute a synchronous SELECT query returning single row (SQLite only)
 */
export function queryOneSync<T>(sql: string, params?: unknown[]): T | null {
    const results = querySync<T>(sql, params);
    return results[0] || null;
}
