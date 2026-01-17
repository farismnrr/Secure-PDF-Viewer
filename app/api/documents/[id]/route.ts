/**
 * Document API - Single Document Operations
 * GET /api/documents/[id] - Get document detail
 * PUT /api/documents/[id] - Update document
 * DELETE /api/documents/[id] - Soft delete document
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, documents } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { hashPassword, getStoragePath } from '@/lib/utils';
import { extractAuthInfo } from '@/lib/auth/helper';
import fs from 'fs';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// =============================================================================
// GET - Get document detail
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: docId } = await params;
        const { tenantId } = extractAuthInfo(request);

        if (!tenantId) {
            return NextResponse.json(
                { status: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.docId, docId))
            .limit(1);

        // Ensure tenant match
        if (!document || document.tenantId !== tenantId) {
            return NextResponse.json(
                { status: false, message: 'Document not found' },
                { status: 404 }
            );
        }

        // Parse watermark policy
        let watermarkPolicy = null;
        try {
            watermarkPolicy = document.watermarkPolicy
                ? JSON.parse(document.watermarkPolicy)
                : null;
        } catch {
            // Ignore parse errors
        }

        return NextResponse.json({
            status: true,
            data: {
                id: document.id,
                docId: document.docId,
                title: document.title,
                contentType: document.contentType,
                pageCount: document.pageCount,
                isEncrypted: document.isEncrypted,
                hasPassword: Boolean(document.passwordHash),
                watermarkPolicy,
                status: document.status,
                createdBy: document.createdBy,
                createdAt: document.createdAt,
                updatedAt: document.updatedAt,
                viewUrl: `/v/${document.docId}`
            }
        });
    } catch {

        return NextResponse.json(
            { status: false, message: 'Failed to get document' },
            { status: 500 }
        );
    }
}

// =============================================================================
// PUT - Update document
// =============================================================================

export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: docId } = await params;
        const { tenantId } = extractAuthInfo(request);

        if (!tenantId) {
            return NextResponse.json(
                { status: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check document exists and belongs to tenant
        const [existing] = await db
            .select()
            .from(documents)
            .where(eq(documents.docId, docId))
            .limit(1);

        if (!existing || existing.tenantId !== tenantId) {
            return NextResponse.json(
                { status: false, message: 'Document not found' },
                { status: 404 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { title, status, watermarkPolicy } = body;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {
            updated_at: new Date()
        };

        if (title !== undefined) updateData.title = title.trim();
        if (status !== undefined) {
            if (!['active', 'inactive'].includes(status)) {
                return NextResponse.json(
                    { status: false, message: 'Invalid status. Must be "active" or "inactive"' },
                    { status: 400 }
                );
            }
            updateData.status = status;
        }
        if (watermarkPolicy !== undefined) updateData.watermarkPolicy = JSON.stringify(watermarkPolicy);

        // Handle password update
        if (body.password !== undefined) {
            if (body.password === '' || body.password === null) {
                // Remove password
                updateData.passwordHash = null;
                // Optionally disable encryption flag if it implies password? 
                // Legacy code did `is_encrypted = 0`.
                updateData.isEncrypted = false;
            } else {
                // Set new password
                updateData.passwordHash = await hashPassword(body.password);
                updateData.isEncrypted = true;
            }
        }

        if (Object.keys(updateData).length <= 1) { // 1 because updatedAt is always there
            return NextResponse.json(
                { status: false, message: 'No fields to update' },
                { status: 400 }
            );
        }

        await db
            .update(documents)
            .set(updateData)
            .where(eq(documents.docId, docId));

        return NextResponse.json({
            status: true,
            message: 'Document updated successfully'
        });
    } catch {

        return NextResponse.json(
            { status: false, message: 'Failed to update document' },
            { status: 500 }
        );
    }
}

// =============================================================================
// DELETE - Soft delete document
// =============================================================================

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: docId } = await params;
        const { tenantId } = extractAuthInfo(request);

        if (!tenantId) {
            return NextResponse.json(
                { status: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check document exists and belongs to tenant
        const [existing] = await db
            .select()
            .from(documents)
            .where(eq(documents.docId, docId))
            .limit(1);

        if (!existing || existing.tenantId !== tenantId) {
            return NextResponse.json(
                { status: false, message: 'Document not found' },
                { status: 404 }
            );
        }

        // Check if hard delete requested
        const { searchParams } = new URL(request.url);
        const hardDelete = searchParams.get('hard') === 'true';

        if (hardDelete) {
            // Delete file from storage
            const filePath = getStoragePath(existing.encryptedPath);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Delete from database
            await db
                .delete(documents)
                .where(eq(documents.docId, docId));

            return NextResponse.json({
                status: true,
                message: 'Document permanently deleted'
            });
        }

        // Soft delete - just update status
        await db
            .update(documents)
            .set({
                status: 'inactive',
                updatedAt: new Date()
            })
            .where(eq(documents.docId, docId));

        return NextResponse.json({
            status: true,
            message: 'Document deleted successfully'
        });
    } catch {

        return NextResponse.json(
            { status: false, message: 'Failed to delete document' },
            { status: 500 }
        );
    }
}
