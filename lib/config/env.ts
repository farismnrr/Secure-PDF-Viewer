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
    const dbType = process.env.DB_TYPE;

    if (!dbType) {
        throw new Error('DB_TYPE must be configured (sqlite or postgres)');
    }
    if (dbType !== 'sqlite' && dbType !== 'postgres') {
        throw new Error(`Invalid DB_TYPE: ${dbType}. Must be 'sqlite' or 'postgres'`);
    }
    return dbType;
}

export function getDbConfig(): DbConfig {
    const type = getDbType();

    if (type === 'sqlite') {
        const path = process.env.DB_PATH;
        if (!path) {
            throw new Error('DB_PATH must be configured when using SQLite');
        }
        return {
            type,
            path
        };
    }

    // PostgreSQL
    const host = process.env.DB_HOST;
    const port = process.env.DB_PORT;
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const database = process.env.DB_NAME;

    if (!host) {
        throw new Error('DB_HOST must be configured when using PostgreSQL');
    }
    if (!port) {
        throw new Error('DB_PORT must be configured when using PostgreSQL');
    }
    if (!user) {
        throw new Error('DB_USER must be configured when using PostgreSQL');
    }
    if (!password) {
        throw new Error('DB_PASSWORD must be configured when using PostgreSQL');
    }
    if (!database) {
        throw new Error('DB_NAME must be configured when using PostgreSQL');
    }

    return {
        type,
        host,
        port: parseInt(port, 10),
        user,
        password,
        database
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
    const url = process.env.NEXT_PUBLIC_SSO_URL;
    const apiKey = process.env.NEXT_PUBLIC_API_KEY;
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID;

    if (!url) {
        throw new Error('NEXT_PUBLIC_SSO_URL must be configured');
    }
    if (!apiKey) {
        throw new Error('NEXT_PUBLIC_API_KEY must be configured');
    }
    if (!tenantId) {
        throw new Error('NEXT_PUBLIC_TENANT_ID must be configured');
    }

    return {
        url,
        apiKey,
        tenantId
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
