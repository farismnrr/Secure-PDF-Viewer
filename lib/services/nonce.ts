/**
 * Nonce management - single-use tokens for document access
 */

import { queryOne, execute, placeholder, getDbType } from '../db';
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
    doc_id: string;
    nonce: string;
    session_id: string;
    used: number;
    created_at: string;
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
    const issuedAt = new Date().toISOString();

    await execute(
        `INSERT INTO nonces (doc_id, nonce, session_id, created_at)
         VALUES (${placeholder(1)}, ${placeholder(2)}, ${placeholder(3)}, ${placeholder(4)})`,
        [docId, nonce, sessionId, issuedAt]
    );

    return { nonce, sessionId, docId, issuedAt };
}

/**
 * Validate a nonce without consuming it
 */
export async function isNonceValid(docId: string, nonce: string): Promise<boolean> {
    const result = await queryOne<NonceRecord>(
        `SELECT * FROM nonces 
         WHERE doc_id = ${placeholder(1)} AND nonce = ${placeholder(2)} AND used = 0`,
        [docId, nonce]
    );
    return !!result;
}

/**
 * Validate and consume a nonce (mark as used)
 * Returns the session ID if valid, null otherwise
 */
export async function validateAndConsumeNonce(docId: string, nonce: string): Promise<string | null> {
    const dbType = getDbType();

    const result = await queryOne<{ session_id: string }>(
        `SELECT session_id FROM nonces 
         WHERE doc_id = ${placeholder(1)} AND nonce = ${placeholder(2)} AND used = 0`,
        [docId, nonce]
    );

    if (!result) return null;

    const usedValue = dbType === 'postgres' ? 'TRUE' : '1';
    await execute(
        `UPDATE nonces SET used = ${usedValue} 
         WHERE doc_id = ${placeholder(1)} AND nonce = ${placeholder(2)}`,
        [docId, nonce]
    );

    return result.session_id;
}

/**
 * Get nonce info without consuming
 */
export async function getNonceInfo(nonce: string): Promise<NonceRecord | null> {
    return queryOne<NonceRecord>(
        `SELECT * FROM nonces WHERE nonce = ${placeholder(1)}`,
        [nonce]
    );
}

/**
 * Clean up old nonces
 */
export async function cleanupOldNonces(olderThanDays: number = 7): Promise<number> {
    const dbType = getDbType();

    if (dbType === 'sqlite') {
        const result = await execute(
            `DELETE FROM nonces WHERE created_at < datetime('now', ${placeholder(1)})`,
            [`-${olderThanDays} days`]
        );
        return result.rowsAffected;
    }

    const result = await execute(
        `DELETE FROM nonces WHERE created_at < NOW() - INTERVAL '${olderThanDays} days'`,
        []
    );
    return result.rowsAffected;
}
