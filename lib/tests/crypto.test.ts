/**
 * Unit tests for crypto utilities
 */

import { encryptBuffer, decryptBuffer, generateNonce, generateSessionId } from '../utils/crypto';
import crypto from 'crypto';

describe('Crypto Utilities', () => {
    const testKey = crypto.randomBytes(32);

    describe('encryptBuffer / decryptBuffer', () => {
        it('should encrypt and decrypt a buffer correctly', () => {
            const original = Buffer.from('Hello, this is a test message for encryption!');

            const encrypted = encryptBuffer(original, testKey);
            const decrypted = decryptBuffer(encrypted, testKey);

            expect(decrypted.toString()).toBe(original.toString());
        });

        it('should produce different ciphertext for same plaintext (due to random IV)', () => {
            const original = Buffer.from('Same message');

            const encrypted1 = encryptBuffer(original, testKey);
            const encrypted2 = encryptBuffer(original, testKey);

            expect(encrypted1.equals(encrypted2)).toBe(false);
        });

        it('should fail decryption with wrong key', () => {
            const original = Buffer.from('Secret data');
            const wrongKey = crypto.randomBytes(32);

            const encrypted = encryptBuffer(original, testKey);

            expect(() => decryptBuffer(encrypted, wrongKey)).toThrow();
        });

        it('should fail decryption with tampered ciphertext', () => {
            const original = Buffer.from('Important data');

            const encrypted = encryptBuffer(original, testKey);
            // Tamper with ciphertext
            encrypted[encrypted.length - 1] ^= 0xff;

            expect(() => decryptBuffer(encrypted, testKey)).toThrow();
        });

        it('should handle empty buffer', () => {
            const original = Buffer.from('');

            const encrypted = encryptBuffer(original, testKey);
            const decrypted = decryptBuffer(encrypted, testKey);

            expect(decrypted.toString()).toBe('');
        });

        it('should handle large buffer', () => {
            const original = crypto.randomBytes(1024 * 1024); // 1MB

            const encrypted = encryptBuffer(original, testKey);
            const decrypted = decryptBuffer(encrypted, testKey);

            expect(decrypted.equals(original)).toBe(true);
        });
    });

    describe('generateNonce', () => {
        it('should generate a 48-character hex string (24 bytes)', () => {
            const nonce = generateNonce();

            expect(nonce).toHaveLength(48);
            expect(/^[0-9a-f]+$/.test(nonce)).toBe(true);
        });

        it('should generate unique nonces', () => {
            const nonces = new Set<string>();
            for (let i = 0; i < 100; i++) {
                nonces.add(generateNonce());
            }

            expect(nonces.size).toBe(100);
        });
    });

    describe('generateSessionId', () => {
        it('should generate a valid UUID', () => {
            const sessionId = generateSessionId();

            // UUID v4 format
            expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
        });

        it('should generate unique session IDs', () => {
            const ids = new Set<string>();
            for (let i = 0; i < 100; i++) {
                ids.add(generateSessionId());
            }

            expect(ids.size).toBe(100);
        });
    });
});
