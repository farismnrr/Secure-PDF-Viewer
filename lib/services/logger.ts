/**
 * Access logging service
 */

import { db, accessLogs } from '../db';
import { eq, and, gte, sql, count } from 'drizzle-orm';

// =============================================================================
// Types
// =============================================================================

export interface LogEntry {
    id: number;
    docId: string;
    sessionId: string | null;
    ip: string | null;
    userAgent: string | null;
    action: string;
    metadata: string | null;
    createdAt: Date;
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

    await db.insert(accessLogs).values({
        docId: docId,
        sessionId: options.sessionId || null,
        ip: options.ip || null,
        userAgent: options.userAgent || null,
        action: action,
        metadata: metadataStr,
        createdAt: new Date()
    });
}

/**
 * Get access logs for a document
 */
export async function getAccessLogs(
    docId: string,
    options: { limit?: number; offset?: number; action?: LogAction } = {}
): Promise<LogEntry[]> {
    const { limit = 100, offset = 0, action } = options;

    const conditions = [eq(accessLogs.docId, docId)];
    if (action) {
        conditions.push(eq(accessLogs.action, action));
    }

    return db
        .select()
        .from(accessLogs)
        .where(and(...conditions))
        .orderBy(sql`${accessLogs.createdAt} DESC`)
        .limit(limit)
        .offset(offset);
}

/**
 * Get logs by session ID
 */
export async function getLogsBySession(sessionId: string): Promise<LogEntry[]> {
    return db
        .select()
        .from(accessLogs)
        .where(eq(accessLogs.sessionId, sessionId))
        .orderBy(sql`${accessLogs.createdAt} ASC`);
}

/**
 * Get recent suspicious activity
 */
export async function getSuspiciousActivity(
    options: { sinceMinutes?: number; minInvalidAttempts?: number } = {}
): Promise<{ ip: string; count: number }[]> {
    const { sinceMinutes = 60, minInvalidAttempts = 5 } = options;

    const dateThreshold = new Date();
    dateThreshold.setMinutes(dateThreshold.getMinutes() - sinceMinutes);

    // Use Drizzle's groupBy with having
    const results = await db
        .select({
            ip: accessLogs.ip,
            count: count()
        })
        .from(accessLogs)
        .where(
            and(
                eq(accessLogs.action, 'invalid_nonce'),
                gte(accessLogs.createdAt, dateThreshold)
            )
        )
        .groupBy(accessLogs.ip)
        .having(sql`count(*) >= ${minInvalidAttempts}`)
        .orderBy(sql`count(*) DESC`);

    // Filter out null IPs
    return results
        .filter((r: any) => r.ip !== null)
        .map((r: any) => ({
            ip: r.ip as string,
            count: Number(r.count)
        }));
}
