/**
 * Admin Documents API
 * GET /api/admin/documents - List all documents
 * POST /api/admin/documents - Upload new document
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, execute, placeholder } from '@/lib/db/query';
import { encryptBuffer, getMasterKey, hashPassword, generateDocId } from '@/lib/utils/crypto';
import fs from 'fs';
import path from 'path';

interface Document {
    id: number;
    doc_id: string;
    tenant_id: string;
    title: string;
    encrypted_path: string;
    content_type: string;
    page_count: number | null;
    is_encrypted: boolean | number;
    password_hash: string | null;
    watermark_policy: string | null;
    status: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

// =============================================================================
// GET - List all documents
// =============================================================================

export async function GET(request: NextRequest) {
    try {
        const tenantId = request.headers.get('X-Tenant-Id');
        const userId = request.headers.get('X-User-Id');

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

        // Query documents for this tenant
        const documents = await query<Document>(
            `SELECT * FROM documents 
       WHERE tenant_id = ${placeholder(1)} 
       AND status = ${placeholder(2)}
       ORDER BY created_at DESC
       LIMIT ${placeholder(3)} OFFSET ${placeholder(4)}`,
            [tenantId, status, limit, offset]
        );

        // Get total count
        const countResult = await query<{ count: number }>(
            `SELECT COUNT(*) as count FROM documents 
       WHERE tenant_id = ${placeholder(1)} AND status = ${placeholder(2)}`,
            [tenantId, status]
        );

        const total = countResult[0]?.count || 0;

        // Format response
        const formattedDocs = documents.map(doc => ({
            id: doc.id,
            docId: doc.doc_id,
            title: doc.title,
            contentType: doc.content_type,
            pageCount: doc.page_count,
            isEncrypted: Boolean(doc.is_encrypted),
            hasPassword: Boolean(doc.password_hash),
            status: doc.status,
            createdBy: doc.created_by,
            createdAt: doc.created_at,
            updatedAt: doc.updated_at
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
        console.error('List documents error:', error);
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
        const tenantId = request.headers.get('X-Tenant-Id');
        const userId = request.headers.get('X-User-Id');

        if (!tenantId || !userId) {
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

        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { status: false, message: 'Only PDF files are allowed' },
                { status: 400 }
            );
        }

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

        // Save to storage
        const filename = `${docId}.pdf${shouldEncrypt ? '.enc' : ''}`;
        const storagePath = path.join(process.cwd(), 'storage', filename);

        // Ensure storage directory exists
        const storageDir = path.dirname(storagePath);
        if (!fs.existsSync(storageDir)) {
            fs.mkdirSync(storageDir, { recursive: true });
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

        // Insert into database
        await execute(
            `INSERT INTO documents 
       (doc_id, tenant_id, title, encrypted_path, content_type, is_encrypted, password_hash, watermark_policy, status, created_by)
       VALUES (${placeholder(1)}, ${placeholder(2)}, ${placeholder(3)}, ${placeholder(4)}, ${placeholder(5)}, ${placeholder(6)}, ${placeholder(7)}, ${placeholder(8)}, ${placeholder(9)}, ${placeholder(10)})`,
            [
                docId,
                tenantId,
                title.trim(),
                `storage/${filename}`,
                'application/pdf',
                shouldEncrypt ? 1 : 0,
                passwordHash,
                watermarkPolicy,
                'active',
                userId
            ]
        );

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
        console.error('Upload document error:', error);
        return NextResponse.json(
            { status: false, message: 'Failed to upload document' },
            { status: 500 }
        );
    }
}
