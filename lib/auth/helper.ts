/**
 * Auth Helper
 * Extract tenant and user info from JWT token
 */

import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

interface TokenPayload {
    sub: string;       // User ID
    tenant_id: string; // Tenant ID
    role?: string;
}

/**
 * Extract tenant and user ID from Authorization header
 */
export function extractAuthInfo(request: NextRequest): { tenantId: string | null; userId: string | null } {
    // First check for direct headers (for backward compatibility)
    const directTenantId = request.headers.get('X-Tenant-Id');
    const directUserId = request.headers.get('X-User-Id');

    if (directTenantId && directUserId && directTenantId !== 'undefined' && directUserId !== 'undefined') {
        return { tenantId: directTenantId, userId: directUserId };
    }

    // Try to extract from Bearer token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { tenantId: null, userId: null };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
        // Decode without verification for now (since we don't have the secret)
        // In production, you should verify the token
        const decoded = jwt.decode(token) as TokenPayload | null;

        if (decoded && decoded.tenant_id && decoded.sub && decoded.sub !== 'undefined' && decoded.tenant_id !== 'undefined') {
            return {
                tenantId: decoded.tenant_id,
                userId: decoded.sub
            };
        }
    } catch {

    }

    return { tenantId: null, userId: null };
}
