/**
 * Documents API
 * GET /api/documents - List all documents
 * POST /api/documents - Upload new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { encryptBuffer, getMasterKey, hashPassword, generateDocId } from '@/lib/utils/crypto';
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

        // Query documents for this tenant using Prisma
        const [documents, total] = await Promise.all([
            prisma.documents.findMany({
                where: {
                    tenant_id: tenantId,
                    status: status
                },
                orderBy: { created_at: 'desc' },
                skip: offset,
                take: limit
            }),
            prisma.documents.count({
                where: {
                    tenant_id: tenantId,
                    status: status
                }
            })
        ]);

        // Format response
        const formattedDocs = documents.map(doc => ({
            id: doc.id,
            docId: doc.doc_id,
            title: doc.title,
            contentType: doc.content_type || 'application/pdf',
            pageCount: doc.page_count,
            isEncrypted: doc.is_encrypted,
            hasPassword: Boolean(doc.password_hash),
            status: doc.status,
            createdBy: doc.created_by,
            createdAt: doc.created_at.toISOString(),
            updatedAt: doc.updated_at.toISOString()
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
    } catch {

        return NextResponse.json(
            { status: false, message: 'Failed to list documents' },
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
        const userStorageDir = path.join(process.cwd(), 'storage', userId);
        const storagePath = path.join(userStorageDir, filename);

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

        // Default watermark policy
        const watermarkPolicy = JSON.stringify({
            showIp: true,
            showTimestamp: true,
            showSessionId: true
        });

        // Insert into database using Prisma
        await prisma.documents.create({
            data: {
                doc_id: docId,
                tenant_id: tenantId,
                title: title.trim(),
                encrypted_path: `storage/${userId}/${filename}`,
                content_type: file.type,
                is_encrypted: shouldEncrypt,
                password_hash: passwordHash,
                watermark_policy: watermarkPolicy,
                status: 'active',
                created_by: userId
            }
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
    } catch {

        return NextResponse.json(
            { status: false, message: 'Failed to upload document' },
            { status: 500 }
        );
    }
}
