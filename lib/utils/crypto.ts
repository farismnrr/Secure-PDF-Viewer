/**
 * Cryptographic utilities for encryption/decryption and hashing
 */

import crypto from 'crypto';
import { getEncryptionMasterKey } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

// =============================================================================
// Encryption Key
// =============================================================================

/**
 * Get the master key from environment
 */
export function getMasterKey(): Buffer {
    const keyHex = getEncryptionMasterKey();
    return Buffer.from(keyHex, 'hex');
}

// =============================================================================
// Encryption / Decryption
// =============================================================================

/**
 * Encrypt a buffer using AES-256-GCM
 * Output format: [IV (12 bytes)][Auth Tag (16 bytes)][Ciphertext]
 */
export function encryptBuffer(plainBuffer: Buffer, key: Buffer): Buffer {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
        cipher.update(plainBuffer),
        cipher.final()
    ]);

    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypt a buffer encrypted with encryptBuffer
 */
export function decryptBuffer(encryptedBuffer: Buffer, key: Buffer): Buffer {
    if (encryptedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        throw new Error('Invalid encrypted data: too short');
    }

    const iv = encryptedBuffer.subarray(0, IV_LENGTH);
    const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
        decipher.update(ciphertext),
        decipher.final()
    ]);
}

// =============================================================================
// Random Generation
// =============================================================================

/**
 * Generate a cryptographically secure nonce
 */
export function generateNonce(): string {
    return crypto.randomBytes(24).toString('hex');
}

/**
 * Generate a session ID
 */
export function generateSessionId(): string {
    return crypto.randomUUID();
}

/**
 * Generate a random document ID
 */
export function generateDocId(): string {
    return `doc-${crypto.randomBytes(8).toString('hex')}`;
}

// =============================================================================
// Password Hashing
// =============================================================================

const SCRYPT_SALT_LENGTH = 16;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1 };

/**
 * Hash a password using scrypt
 * Returns format: salt:hash (both hex encoded)
 */
export async function hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(SCRYPT_SALT_LENGTH);

        crypto.scrypt(
            password,
            salt,
            SCRYPT_KEY_LENGTH,
            SCRYPT_OPTIONS,
            (err, derivedKey) => {
                if (err) return reject(err);
                resolve(`${salt.toString('hex')}:${derivedKey.toString('hex')}`);
            }
        );
    });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        const [saltHex, hashHex] = storedHash.split(':');

        if (!saltHex || !hashHex) {
            return resolve(false);
        }

        const salt = Buffer.from(saltHex, 'hex');
        const expectedHash = Buffer.from(hashHex, 'hex');

        crypto.scrypt(
            password,
            salt,
            SCRYPT_KEY_LENGTH,
            SCRYPT_OPTIONS,
            (err, derivedKey) => {
                if (err) return reject(err);
                resolve(crypto.timingSafeEqual(derivedKey, expectedHash));
            }
        );
    });
}
