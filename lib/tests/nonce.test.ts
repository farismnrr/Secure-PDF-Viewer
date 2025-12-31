/**
 * Unit tests for nonce management
 */

import { mintNonce, isNonceValid, validateAndConsumeNonce, getNonceInfo } from '../services/nonce';
import { resetDb, closeDb } from '../db/test-helpers';

describe('Nonce Management', () => {
    beforeEach(async () => {
        await resetDb();
    });

    afterAll(() => {
        closeDb();
    });

    describe('mintNonce', () => {
        it('should create a new nonce with all required fields', async () => {
            const result = await mintNonce('doc-123');

            expect(result.nonce).toBeDefined();
            expect(result.nonce).toHaveLength(48); // 24 bytes hex
            expect(result.sessionId).toBeDefined();
            expect(result.docId).toBe('doc-123');
            expect(result.issuedAt).toBeDefined();
        });

        it('should create unique nonces for same document', async () => {
            const nonce1 = await mintNonce('doc-123');
            const nonce2 = await mintNonce('doc-123');

            expect(nonce1.nonce).not.toBe(nonce2.nonce);
            expect(nonce1.sessionId).not.toBe(nonce2.sessionId);
        });
    });

    describe('isNonceValid', () => {
        it('should return true for a valid unused nonce', async () => {
            const { nonce, docId } = await mintNonce('doc-123');

            expect(await isNonceValid(docId, nonce)).toBe(true);
        });

        it('should return false for non-existent nonce', async () => {
            expect(await isNonceValid('doc-123', 'fake-nonce')).toBe(false);
        });

        it('should return false for wrong document ID', async () => {
            const { nonce } = await mintNonce('doc-123');

            expect(await isNonceValid('doc-456', nonce)).toBe(false);
        });
    });

    describe('validateAndConsumeNonce', () => {
        it('should return session ID for valid nonce and mark as used', async () => {
            const { nonce, docId, sessionId } = await mintNonce('doc-123');

            const result = await validateAndConsumeNonce(docId, nonce);

            expect(result).toBe(sessionId);
            expect(await isNonceValid(docId, nonce)).toBe(false); // Now marked as used
        });

        it('should return null for already used nonce (single-use)', async () => {
            const { nonce, docId } = await mintNonce('doc-123');

            // First use
            await validateAndConsumeNonce(docId, nonce);

            // Second attempt should fail
            const result = await validateAndConsumeNonce(docId, nonce);
            expect(result).toBeNull();
        });

        it('should return null for invalid nonce', async () => {
            const result = await validateAndConsumeNonce('doc-123', 'invalid-nonce');
            expect(result).toBeNull();
        });
    });

    describe('getNonceInfo', () => {
        it('should return nonce record when exists', async () => {
            const { nonce, docId, sessionId } = await mintNonce('doc-123');

            const info = await getNonceInfo(nonce);

            expect(info).not.toBeNull();
            expect(info?.doc_id).toBe(docId);
            expect(info?.session_id).toBe(sessionId);
            expect(info?.used).toBe(0);
        });

        it('should return null for non-existent nonce', async () => {
            const info = await getNonceInfo('non-existent');
            expect(info).toBeNull();
        });
    });
});
