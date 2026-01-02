/**
 * API: Get rendered page image
 * GET /api/docs/[docId]/pages/[page]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDocument } from '@/lib/document/registry';
import { validateAndConsumeNonce, getNonceInfo } from '@/lib/services/nonce';
import { checkRateLimit } from '@/lib/services/rate-limiter';
import { logAccess } from '@/lib/services/logger';
import { renderPage, getPageCount } from '@/lib/document/renderer';
import { applyWatermark } from '@/lib/document/watermark';
import { decryptBuffer, getMasterKey } from '@/lib/utils/crypto';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ docId: string; page: string }> }
) {
    try {
        const { docId, page: pageStr } = await params;
        const pageNumber = parseInt(pageStr, 10);

        if (isNaN(pageNumber) || pageNumber < 1) {
            return NextResponse.json(
                { error: 'Invalid page number' },
                { status: 400 }
            );
        }

        // Get client IP
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || 'unknown';

        const userAgent = request.headers.get('user-agent') || undefined;

        // Rate limiting
        const rateLimit = checkRateLimit(ip, '/api/docs/pages');
        if (!rateLimit.allowed) {
            await logAccess(docId, 'rate_limited', { ip });
            return NextResponse.json(
                { error: 'Rate limit exceeded' },
                { status: 429 }
            );
        }

        // Get nonce from query or header
        const nonce = request.nextUrl.searchParams.get('nonce')
            || request.headers.get('x-nonce');

        if (!nonce) {
            await logAccess(docId, 'invalid_nonce', { ip, metadata: { reason: 'missing' } });
            return NextResponse.json(
                { error: 'Nonce required' },
                { status: 401 }
            );
        }

        // Get nonce info before consuming
        const nonceInfo = await getNonceInfo(nonce);

        // For page 1, consume the nonce. For other pages, just validate
        let sessionId: string | null = null;
        if (pageNumber === 1) {
            sessionId = await validateAndConsumeNonce(docId, nonce);
            if (!sessionId) {
                await logAccess(docId, 'invalid_nonce', { ip, metadata: { nonce: nonce.substring(0, 8), page: pageNumber } });
                return NextResponse.json(
                    { error: 'Invalid or expired nonce' },
                    { status: 401 }
                );
            }
        } else {
            // For subsequent pages, check if nonce was valid (consumed for page 1)
            // We use the session from the nonce info
            if (!nonceInfo) {
                await logAccess(docId, 'invalid_nonce', { ip, metadata: { reason: 'not_found', page: pageNumber } });
                return NextResponse.json(
                    { error: 'Invalid nonce' },
                    { status: 401 }
                );
            }
            sessionId = nonceInfo.sessionId;

            // Verify the nonce was consumed (used for page 1)
            if (!nonceInfo.used) {
                // Nonce not yet consumed - must request page 1 first
                return NextResponse.json(
                    { error: 'Must request page 1 first' },
                    { status: 400 }
                );
            }
        }

        // Get document metadata
        const document = await getDocument(docId);
        if (!document || document.status !== 'active') {
            return NextResponse.json(
                { error: 'Document not found' },
                { status: 404 }
            );
        }

        // Check if this is an image file or PDF
        const imageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];
        const isImage = imageTypes.includes(document.contentType);

        let pageImage: Buffer;
        let totalPages: number;

        if (isImage) {
            // For images, there is only 1 page
            totalPages = 1;
            if (pageNumber > 1) {
                return NextResponse.json(
                    { error: `Page ${pageNumber} does not exist. Image has 1 page.` },
                    { status: 404 }
                );
            }

            // Load and decrypt image
            const encPath = path.join(process.cwd(), document.encryptedPath);
            if (!fs.existsSync(encPath)) {
                return NextResponse.json(
                    { error: 'Document file not found' },
                    { status: 500 }
                );
            }
            const encryptedData = fs.readFileSync(encPath);
            const key = getMasterKey();
            pageImage = decryptBuffer(encryptedData, key);
        } else {
            // PDF handling - Load and decrypt PDF (with caching)
            const loadPdfValues = async () => {
                const encPath = path.join(process.cwd(), document.encryptedPath);
                if (!fs.existsSync(encPath)) {
                    throw new Error('Document file not found');
                }
                const encryptedData = fs.readFileSync(encPath);
                const key = getMasterKey();
                return decryptBuffer(encryptedData, key);
            };

            let pdfBuffer: Buffer;
            try {
                const { getCachedDocument } = await import('@/lib/document/cache');
                pdfBuffer = await getCachedDocument(docId, loadPdfValues);
            } catch (err: unknown) {

                const errorMessage = err instanceof Error ? err.message : String(err);

                if (errorMessage.includes('not found')) {
                    return NextResponse.json(
                        { error: 'Document file not found' },
                        { status: 500 }
                    );
                }
                throw err;
            }

            // Check page count
            totalPages = await getPageCount(pdfBuffer);
            if (pageNumber > totalPages) {
                return NextResponse.json(
                    { error: `Page ${pageNumber} does not exist. Document has ${totalPages} pages.` },
                    { status: 404 }
                );
            }

            // Render page to image
            pageImage = await renderPage(pdfBuffer, pageNumber, { scale: 2.0 });
        }

        // Apply watermark
        const timestamp = new Date().toISOString();
        const watermarkedImage = await applyWatermark(pageImage, {
            ip: document.watermarkPolicy.showIp ? ip : undefined,
            timestamp: document.watermarkPolicy.showTimestamp ? timestamp : undefined,
            sessionId: document.watermarkPolicy.showSessionId ? sessionId : undefined,
            customText: document.watermarkPolicy.customText
        });

        // Log access
        await logAccess(docId, 'page_request', {
            sessionId: sessionId || undefined,
            ip,
            userAgent,
            metadata: { page: pageNumber }
        });

        // Return image with cache headers
        return new NextResponse(new Uint8Array(watermarkedImage), {
            headers: {
                'Content-Type': 'image/png',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'X-Page': pageNumber.toString(),
                'X-Total-Pages': totalPages.toString()
            }
        });

    } catch (error) {
        console.error('API Error in pages route:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
