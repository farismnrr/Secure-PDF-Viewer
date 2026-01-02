/**
 * API: Mint nonce for document access
 * POST /api/nonces/mint
 */

import { NextRequest, NextResponse } from 'next/server';
import { mintNonce } from '@/lib/services/nonce';
import { getDocument } from '@/lib/document/registry';
import { checkRateLimit } from '@/lib/services/rate-limiter';
import { logAccess } from '@/lib/services/logger';
import { db, documents } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/utils/crypto';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // Get client IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';

        // Rate limiting
        const rateLimit = checkRateLimit(ip, '/api/nonces/mint');
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': rateLimit.resetAt.toISOString()
                    }
                }
            );
        }

        // Parse body
        const body = await request.json();
        const { docId } = body;

        if (!docId || typeof docId !== 'string') {
            return NextResponse.json(
                { error: `docId is required or invalid. Received: ${docId}` },
                { status: 400 }
            );
        }

        // Check if document exists using registry (which uses Drizzle now)
        const document = await getDocument(docId);
        if (!document || document.status !== 'active') {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
        }

        // Check password protection
        // We can query database directly for passwordHash to confirm
        const [dbDoc] = await db
            .select({ passwordHash: documents.passwordHash })
            .from(documents)
            .where(eq(documents.docId, docId))
            .limit(1);

        if (dbDoc && dbDoc.passwordHash) {
            const { password } = body;
            if (!password) {
                return NextResponse.json(
                    { error: 'Password required', requiresPassword: true },
                    { status: 401 }
                );
            }

            const isValid = await verifyPassword(password, dbDoc.passwordHash);

            if (!isValid) {
                await logAccess(docId, 'auth_fail', { ip });
                return NextResponse.json(
                    { error: 'Invalid password' },
                    { status: 401 }
                );
            }
        }

        // Mint new nonce
        const nonceData = await mintNonce(docId);

        // Log access
        await logAccess(docId, 'nonce_mint', {
            sessionId: nonceData.sessionId,
            ip,
            userAgent: request.headers.get('user-agent') || undefined
        });

        return NextResponse.json({
            nonce: nonceData.nonce,
            sessionId: nonceData.sessionId,
            issuedAt: nonceData.issuedAt
        }, {
            headers: {
                'X-RateLimit-Remaining': rateLimit.remaining.toString()
            }
        });

    } catch (error) {

        return NextResponse.json(
            { error: `Server Error: ${error instanceof Error ? error.message : String(error)}` },
            { status: 500 }
        );
    }
}
