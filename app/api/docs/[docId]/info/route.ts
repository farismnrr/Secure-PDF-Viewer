/**
 * API: Get document info
 * GET /api/docs/[docId]/info
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDocument } from '@/lib/document/registry';
import { isNonceValid, getNonceInfo } from '@/lib/services/nonce';
import { checkRateLimit } from '@/lib/services/rate-limiter';
import { logAccess } from '@/lib/services/logger';
import { getPageCount } from '@/lib/document/renderer';
import { decryptBuffer, getMasterKey, getStoragePath } from '@/lib/utils';
import fs from 'fs';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ docId: string }> }
) {
    try {
        const { docId } = await params;

        // Get client IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';

        // Rate limiting
        const rateLimit = checkRateLimit(ip, '/api/docs/info');
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        // Get nonce from header
        const nonce = request.headers.get('x-nonce');
        if (!nonce) {
            await logAccess(docId, 'invalid_nonce', { ip, metadata: { reason: 'missing' } });
            return NextResponse.json(
                { error: 'Nonce required' },
                { status: 401 }
            );
        }

        // Validate nonce (don't consume - just check)
        if (!(await isNonceValid(docId, nonce))) {
            await logAccess(docId, 'invalid_nonce', { ip, metadata: { nonce: nonce.substring(0, 8) } });
            return NextResponse.json(
                { error: 'Invalid or expired nonce' },
                { status: 401 }
            );
        }

        // Get nonce info for session
        const nonceInfo = await getNonceInfo(nonce);

        // Get document metadata
        const document = await getDocument(docId);
        if (!document || document.status !== 'active') {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
        }

        // Get page count - images have 1 page, PDFs may have multiple
        let pageCount = document.pageCount;
        if (!pageCount) {
            // Check if this is an image file
            const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
            if (imageTypes.includes(document.contentType)) {
                pageCount = 1;
            } else {
                // It's a PDF, decrypt and get page count
                try {
                    const encPath = getStoragePath(document.encryptedPath);
                    const encryptedData = fs.readFileSync(encPath);
                    const key = getMasterKey();
                    const pdfBuffer = decryptBuffer(encryptedData, key);
                    pageCount = await getPageCount(pdfBuffer);
                } catch {

                    pageCount = 0;
                }
            }
        }

        return NextResponse.json({
            docId: document.docId,
            title: document.title,
            pageCount,
            sessionId: nonceInfo?.sessionId
        });

    } catch {

        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
