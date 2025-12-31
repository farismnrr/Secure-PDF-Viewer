/**
 * Centralized environment variable access
 */

// =============================================================================
// Database Configuration
// =============================================================================

export type DbType = 'sqlite' | 'postgres';

export interface DbConfig {
    type: DbType;
    // SQLite
    path?: string;
    // PostgreSQL
    host?: string;
    port?: number;
    user?: string;
    password?: string;
    database?: string;
}

export function getDbType(): DbType {
    const dbType = process.env.DB_TYPE || 'sqlite';
    if (dbType !== 'sqlite' && dbType !== 'postgres') {
        throw new Error(`Invalid DB_TYPE: ${dbType}. Must be 'sqlite' or 'postgres'`);
    }
    return dbType;
}

export function getDbConfig(): DbConfig {
    const type = getDbType();

    if (type === 'sqlite') {
        return {
            type,
            path: process.env.DB_PATH || 'data/viewer.db'
        };
    }

    return {
        type,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'pdf_viewer'
    };
}

// =============================================================================
// SSO Configuration
// =============================================================================

export interface SsoConfig {
    url: string;
    apiKey: string;
    tenantId: string;
}

export function getSsoConfig(): SsoConfig {
    return {
        url: process.env.SSO_URL || process.env.NEXT_PUBLIC_SSO_URL || '',
        apiKey: process.env.API_KEY || '',
        tenantId: process.env.TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID || ''
    };
}

// =============================================================================
// Rate Limit Configuration
// =============================================================================

export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}

export function getRateLimitConfig(): RateLimitConfig {
    return {
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '200', 10),
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10)
    };
}

// =============================================================================
// Encryption Configuration
// =============================================================================

export function getEncryptionMasterKey(): string {
    const key = process.env.ENCRYPTION_MASTER_KEY || '';
    if (!key || (key.length !== 64 && key.length !== 128)) {
        throw new Error('ENCRYPTION_MASTER_KEY must be a 64 or 128 character hex string');
    }
    return key.substring(0, 64); // Use first 32 bytes for AES-256
}
