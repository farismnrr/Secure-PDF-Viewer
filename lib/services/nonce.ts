/**
 * Nonce management - single-use tokens for document access
 */

import { db, nonces } from '../db';
import { eq, and, lt } from 'drizzle-orm';
import { generateNonce as cryptoGenerateNonce, generateSessionId } from '../utils';

// =============================================================================
// Types
// =============================================================================

export interface NonceData {
    nonce: string;
    sessionId: string;
    docId: string;
    issuedAt: string;
}

export interface NonceRecord {
    id: number;
    docId: string;
    nonce: string;
    sessionId: string;
    used: boolean;
    createdAt: Date;
}

// =============================================================================
// Nonce Operations
// =============================================================================

/**
 * Create a new nonce for a document
 */
export async function mintNonce(docId: string): Promise<NonceData> {
    const nonce = cryptoGenerateNonce();
    const sessionId = generateSessionId();
    const issuedAt = new Date();

    await db.insert(nonces).values({
        docId: docId,
        nonce: nonce,
        sessionId: sessionId,
        createdAt: issuedAt,
        used: false
    });

    return { nonce, sessionId, docId, issuedAt: issuedAt.toISOString() };
}

/**
 * Validate a nonce without consuming it
 */
export async function isNonceValid(docId: string, nonce: string): Promise<boolean> {
    const [record] = await db
        .select()
        .from(nonces)
        .where(eq(nonces.nonce, nonce))
        .limit(1);

    if (!record) return false;

    // Check fields matches
    if (record.docId !== docId) return false;
    if (record.used) return false;

    return true;
}

/**
 * Validate and consume a nonce (mark as used)
 * Returns the session ID if valid, null otherwise
 */
export async function validateAndConsumeNonce(docId: string, nonce: string): Promise<string | null> {

    // Find unused nonce matching docId
    const [record] = await db
        .select()
        .from(nonces)
        .where(
            and(
                eq(nonces.nonce, nonce),
                eq(nonces.docId, docId),
                eq(nonces.used, false)
            )
        )
        .limit(1);

    if (!record) return null;

    // Mark as used
    await db
        .update(nonces)
        .set({ used: true })
        .where(eq(nonces.id, record.id));

    return record.sessionId;
}

/**
 * Get nonce info without consuming
 */
export async function getNonceInfo(nonce: string): Promise<NonceRecord | null> {
    const [record] = await db
        .select()
        .from(nonces)
        .where(eq(nonces.nonce, nonce))
        .limit(1);

    return record || null;
}

/**
 * Clean up old nonces
 */
export async function cleanupOldNonces(olderThanDays: number = 7): Promise<number> {
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - olderThanDays);

    const result = await db
        .delete(nonces)
        .where(lt(nonces.createdAt, dateThreshold));

    // Drizzle returns affected rows count differently based on driver
    // For now, we return 0 as placeholder (can be improved with raw SQL if needed)
    return result.rowCount || 0;
}
