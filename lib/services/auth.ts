/**
 * SSO Authentication service
 */

import { getSsoConfig } from '../config';

// =============================================================================
// Types
// =============================================================================

export interface User {
    id: string;
    email: string;
    role: string;
    tenant_id: string;
    [key: string]: unknown;
}

export interface VerifyResult {
    valid: boolean;
    error?: string;
    user?: User;
}

// =============================================================================
// Authentication
// =============================================================================

/**
 * Verify admin access via SSO service
 */
export async function verifyAdminAccess(token: string): Promise<VerifyResult> {
    const config = getSsoConfig();

    if (!config.url || !config.apiKey) {
        console.error('SSO_URL or API_KEY is not defined');
        return { valid: false, error: 'System configuration error' };
    }

    try {
        const response = await fetch(`${config.url}/auth/verify`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-API-Key': config.apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                valid: false,
                error: errorData.message || 'Token verification failed'
            };
        }

        const user = decodeJwt(token);
        if (!user) {
            return { valid: false, error: 'Invalid token format' };
        }

        return { valid: true, user };

    } catch (error) {
        console.error('Verify admin access error:', error);
        return { valid: false, error: 'Service unavailable' };
    }
}

/**
 * Decode JWT payload (without verification - for reading claims after SSO verified)
 */
export function decodeJwt(token: string): User | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = parts[1];
        const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = atob(base64);

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Failed to decode JWT:', e);
        return null;
    }
}
