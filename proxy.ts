/**
 * Next.js Middleware
 * Protects admin routes with JWT + tenant + role verification
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminAccess } from '@/lib/services/auth';

// Routes that require admin authentication
const PROTECTED_ROUTES = ['/admin', '/api/admin'];

// Routes that are always public
const PUBLIC_ROUTES = ['/admin/login', '/admin/callback', '/api/auth'];

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Skip non-admin routes
    const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
    if (!isProtectedRoute) return NextResponse.next();

    // Skip public admin routes
    const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));
    if (isPublicRoute) return NextResponse.next();

    // Get token from cookie or Authorization header
    const token = extractToken(request);

    if (!token) {
        return handleUnauthorized(request);
    }

    // Verify token with SSO service
    let verifyResult;
    try {
        verifyResult = await verifyAdminAccess(token);
    } catch (error) {
        console.error('Auth config error:', error);
        return handleUnauthorized(request, 'System configuration error');
    }

    if (!verifyResult.valid) {
        console.log(`Auth failed: ${verifyResult.error}`);
        return handleUnauthorized(request, verifyResult.error);
    }

    // Add user info to request headers for downstream use
    const response = NextResponse.next();
    response.headers.set('X-User-Id', verifyResult.user!.id);
    response.headers.set('X-User-Email', verifyResult.user!.email);
    response.headers.set('X-User-Role', verifyResult.user!.role);
    response.headers.set('X-Tenant-Id', verifyResult.user!.tenant_id);

    return response;
}

// =============================================================================
// Helper Functions
// =============================================================================

function extractToken(request: NextRequest): string | null {
    // Try Authorization header first
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.substring(7);
    }

    // Try cookie
    const tokenCookie = request.cookies.get('access_token');
    if (tokenCookie?.value) {
        return tokenCookie.value;
    }

    return null;
}



function handleUnauthorized(request: NextRequest, message?: string): NextResponse {
    const { pathname } = request.nextUrl;

    // For API routes, return JSON error
    if (pathname.startsWith('/api/')) {
        return NextResponse.json(
            { status: false, message: message || 'Unauthorized' },
            { status: 401 }
        );
    }

    // For page routes, redirect to login
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);

    if (message) {
        loginUrl.searchParams.set('error', message);
    }

    return NextResponse.redirect(loginUrl);
}

// =============================================================================
// Middleware Config
// =============================================================================

export const config = {
    matcher: [
        // Match admin pages
        '/admin/:path*',
        // Match admin API routes
        '/api/admin/:path*'
    ]
};
