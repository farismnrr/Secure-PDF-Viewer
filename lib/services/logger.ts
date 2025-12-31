/**
 * Access logging service
 */

import { query, execute, placeholder, getDbType } from '../db';

// =============================================================================
// Types
// =============================================================================

export interface LogEntry {
    id: number;
    doc_id: string;
    session_id: string | null;
    ip: string | null;
    user_agent: string | null;
    action: string;
    metadata: string | null;
    created_at: string;
}

export type LogAction =
    | 'nonce_mint'
    | 'page_request'
    | 'invalid_nonce'
    | 'rate_limited'
    | 'fullscreen_exit'
    | 'capture_detected'
    | 'view'
    | 'print_attempt'
    | 'download_attempt'
    | 'auth_fail';

// =============================================================================
// Logging Functions
// =============================================================================

/**
 * Log an access event
 */
export async function logAccess(
    docId: string,
    action: LogAction,
    options: {
        sessionId?: string;
        ip?: string;
        userAgent?: string;
        metadata?: Record<string, unknown>;
    } = {}
): Promise<void> {
    const metadataStr = options.metadata ? JSON.stringify(options.metadata) : null;

    await execute(
        `INSERT INTO access_logs (doc_id, session_id, ip, user_agent, action, metadata)
         VALUES (${placeholder(1)}, ${placeholder(2)}, ${placeholder(3)}, ${placeholder(4)}, ${placeholder(5)}, ${placeholder(6)})`,
        [docId, options.sessionId || null, options.ip || null, options.userAgent || null, action, metadataStr]
    );
}

/**
 * Get access logs for a document
 */
export async function getAccessLogs(
    docId: string,
    options: { limit?: number; offset?: number; action?: LogAction } = {}
): Promise<LogEntry[]> {
    const { limit = 100, offset = 0, action } = options;

    let sql = `SELECT * FROM access_logs WHERE doc_id = ${placeholder(1)}`;
    const params: (string | number | null)[] = [docId];
    let paramIndex = 2;

    if (action) {
        sql += ` AND action = ${placeholder(paramIndex++)}`;
        params.push(action);
    }

    sql += ` ORDER BY created_at DESC LIMIT ${placeholder(paramIndex++)} OFFSET ${placeholder(paramIndex)}`;
    params.push(limit, offset);

    return query<LogEntry>(sql, params);
}

/**
 * Get logs by session ID
 */
export async function getLogsBySession(sessionId: string): Promise<LogEntry[]> {
    return query<LogEntry>(
        `SELECT * FROM access_logs WHERE session_id = ${placeholder(1)} ORDER BY created_at ASC`,
        [sessionId]
    );
}

/**
 * Get recent suspicious activity
 */
export async function getSuspiciousActivity(
    options: { sinceMinutes?: number; minInvalidAttempts?: number } = {}
): Promise<{ ip: string; count: number }[]> {
    const { sinceMinutes = 60, minInvalidAttempts = 5 } = options;
    const dbType = getDbType();

    if (dbType === 'sqlite') {
        return query<{ ip: string; count: number }>(
            `SELECT ip, COUNT(*) as count FROM access_logs
             WHERE action = 'invalid_nonce' AND created_at >= datetime('now', ${placeholder(1)})
             GROUP BY ip HAVING count >= ${placeholder(2)} ORDER BY count DESC`,
            [`-${sinceMinutes} minutes`, minInvalidAttempts]
        );
    }

    return query<{ ip: string; count: number }>(
        `SELECT ip, COUNT(*) as count FROM access_logs
         WHERE action = 'invalid_nonce' AND created_at >= NOW() - INTERVAL '${sinceMinutes} minutes'
         GROUP BY ip HAVING COUNT(*) >= ${placeholder(1)} ORDER BY count DESC`,
        [minInvalidAttempts]
    );
}
