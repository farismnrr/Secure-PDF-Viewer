/**
 * Documents API
 * GET /api/documents - List all documents
 * POST /api/documents - Upload new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, documents } from '@/lib/db';
import { eq, and, count, desc } from 'drizzle-orm';
import { encryptBuffer, getMasterKey, hashPassword, generateDocId, getStoragePath } from '@/lib/utils';
import { extractAuthInfo } from '@/lib/auth/helper';
import fs from 'fs';
import path from 'path';

// =============================================================================
// GET - List all documents
// =============================================================================

export async function GET(request: NextRequest) {
    try {
        const { tenantId, userId } = extractAuthInfo(request);

        if (!tenantId || !userId) {
            return NextResponse.json(
                { status: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get query params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'active';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        // Query documents for this tenant using Drizzle
        const conditions = and(
            eq(documents.tenantId, tenantId),
            eq(documents.status, status)
        );

        const [docs, totalResult] = await Promise.all([
            db
                .select()
                .from(documents)
                .where(conditions)
                .orderBy(desc(documents.createdAt))
                .limit(limit)
                .offset(offset),
            db
                .select({ count: count() })
                .from(documents)
                .where(conditions)
        ]);

        const total = totalResult[0]?.count || 0;




        // Format response
        // Define inferred type for reliability
        type Document = typeof documents.$inferSelect;

        const formattedDocs = docs.map((doc: Document) => ({
            id: doc.id,
            docId: doc.docId,
            title: doc.title,
            contentType: doc.contentType || 'application/pdf',
            pageCount: doc.pageCount,
            isEncrypted: doc.isEncrypted,
            hasPassword: Boolean(doc.passwordHash),
            status: doc.status,
            createdBy: doc.createdBy,
            createdAt: doc.createdAt.toISOString(),
            updatedAt: doc.updatedAt.toISOString()
        }));

        return NextResponse.json({
            status: true,
            data: {
                documents: formattedDocs,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        // console.error('[GET /api/documents] List failed:', error);
        // console.error('Error details:', {
        //   message: error instanceof Error ? error.message : 'Unknown error',
        //   stack: error instanceof Error ? error.stack : undefined
        // });

        return NextResponse.json(
            {
                status: false,
                message: 'Failed to list documents',
                debug: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// =============================================================================
// POST - Upload new document
// =============================================================================

export async function POST(request: NextRequest) {
    try {
        const { tenantId, userId } = extractAuthInfo(request);

        if (!tenantId || !userId || tenantId === 'undefined' || userId === 'undefined') {
            return NextResponse.json(
                { status: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const title = formData.get('title') as string | null;
        const shouldEncrypt = formData.get('encrypt') === 'true';
        const useWatermark = formData.get('watermark') === 'true';
        const password = formData.get('password') as string | null;

        // Validation
        if (!file) {
            return NextResponse.json(
                { status: false, message: 'File is required' },
                { status: 400 }
            );
        }

        if (!title || title.trim() === '') {
            return NextResponse.json(
                { status: false, message: 'Title is required' },
                { status: 400 }
            );
        }

        // File type validation (PDF and image files)
        const allowedMimeTypes = [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/bmp'
        ];
        if (!allowedMimeTypes.includes(file.type)) {
            return NextResponse.json(
                { status: false, message: 'Only PDF and image files (JPG, JPEG, PNG, WEBP, BMP) are allowed' },
                { status: 400 }
            );
        }

        // Map MIME type to file extension
        const mimeToExt: Record<string, string> = {
            'application/pdf': 'pdf',
            'image/jpeg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/bmp': 'bmp'
        };
        const fileExt = mimeToExt[file.type] || 'bin';

        // Generate document ID
        const docId = generateDocId();

        // Read file buffer
        const arrayBuffer = await file.arrayBuffer();
        let fileBuffer: Buffer = Buffer.from(new Uint8Array(arrayBuffer));

        // Encrypt if requested
        if (shouldEncrypt) {
            const masterKey = getMasterKey();
            fileBuffer = encryptBuffer(fileBuffer, masterKey) as Buffer;
        }

        // Save to storage - organize by user folder
        const filename = `${docId}.${fileExt}${shouldEncrypt ? '.enc' : ''}`;
        const relativePath = `${userId}/${filename}`;
        const storagePath = getStoragePath(relativePath);
        const userStorageDir = path.dirname(storagePath);

        // Ensure user storage directory exists
        if (!fs.existsSync(userStorageDir)) {
            fs.mkdirSync(userStorageDir, { recursive: true });
        }

        fs.writeFileSync(storagePath, fileBuffer);

        // Hash password if provided
        let passwordHash: string | null = null;
        if (password && password.trim() !== '') {
            passwordHash = await hashPassword(password);
        }

        // Conditional watermark policy based on user choice
        const watermarkPolicy = useWatermark
            ? JSON.stringify({
                showIp: true,
                showTimestamp: true,
                showSessionId: true
            })
            : null;

        // Insert into database using Drizzle
        await db.insert(documents).values({
            docId: docId,
            tenantId: tenantId,
            title: title.trim(),
            encryptedPath: `storage/${userId}/${filename}`,
            contentType: file.type,
            isEncrypted: shouldEncrypt,
            passwordHash: passwordHash,
            watermarkPolicy: watermarkPolicy,
            status: 'active',
            createdBy: userId,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        return NextResponse.json({
            status: true,
            message: 'Document uploaded successfully',
            data: {
                docId,
                title: title.trim(),
                isEncrypted: shouldEncrypt,
                hasPassword: Boolean(passwordHash),
                viewUrl: `/v/${docId}`
            }
        }, { status: 201 });
    } catch (error) {
        // console.error('[POST /api/documents] Upload failed:', error);
        // console.error('[POST /api/documents] Error details:', {
        //   message: error instanceof Error ? error.message : 'Unknown error',
        //   stack: error instanceof Error ? error.stack : undefined
        // });

        return NextResponse.json(
            {
                status: false,
                message: 'Failed to upload document',
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
