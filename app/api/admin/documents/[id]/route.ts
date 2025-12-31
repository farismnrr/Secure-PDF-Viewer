/**
 * Admin Document API - Single Document Operations
 * GET /api/admin/documents/[id] - Get document detail
 * PUT /api/admin/documents/[id] - Update document
 * DELETE /api/admin/documents/[id] - Soft delete document
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryOne, execute, placeholder, nowSQL } from '@/lib/db/query';
import { hashPassword } from '@/lib/utils/crypto';
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

interface RouteParams {
    params: Promise<{ id: string }>;
}

// =============================================================================
// GET - Get document detail
// =============================================================================

export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: docId } = await params;
        const tenantId = request.headers.get('X-Tenant-Id');

        if (!tenantId) {
            return NextResponse.json(
                { status: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const document = await queryOne<Document>(
            `SELECT * FROM documents 
       WHERE doc_id = ${placeholder(1)} AND tenant_id = ${placeholder(2)}`,
            [docId, tenantId]
        );

        if (!document) {
            return NextResponse.json(
                { status: false, message: 'Document not found' },
                { status: 404 }
            );
        }

        // Parse watermark policy
        let watermarkPolicy = null;
        try {
            watermarkPolicy = document.watermark_policy
                ? JSON.parse(document.watermark_policy)
                : null;
        } catch {
            // Ignore parse errors
        }

        return NextResponse.json({
            status: true,
            data: {
                id: document.id,
                docId: document.doc_id,
                title: document.title,
                contentType: document.content_type,
                pageCount: document.page_count,
                isEncrypted: Boolean(document.is_encrypted),
                hasPassword: Boolean(document.password_hash),
                watermarkPolicy,
                status: document.status,
                createdBy: document.created_by,
                createdAt: document.created_at,
                updatedAt: document.updated_at,
                viewUrl: `/v/${document.doc_id}`
            }
        });
    } catch (error) {
        console.error('Get document error:', error);
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
        const tenantId = request.headers.get('X-Tenant-Id');

        if (!tenantId) {
            return NextResponse.json(
                { status: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check document exists and belongs to tenant
        const existing = await queryOne<Document>(
            `SELECT * FROM documents 
       WHERE doc_id = ${placeholder(1)} AND tenant_id = ${placeholder(2)}`,
            [docId, tenantId]
        );

        if (!existing) {
            return NextResponse.json(
                { status: false, message: 'Document not found' },
                { status: 404 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { title, status, watermarkPolicy } = body;

        // Build update fields
        const updates: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;

        if (title !== undefined) {
            updates.push(`title = ${placeholder(paramIndex++)}`);
            values.push(title.trim());
        }

        if (status !== undefined) {
            if (!['active', 'inactive'].includes(status)) {
                return NextResponse.json(
                    { status: false, message: 'Invalid status. Must be "active" or "inactive"' },
                    { status: 400 }
                );
            }
            updates.push(`status = ${placeholder(paramIndex++)}`);
            values.push(status);
        }

        if (watermarkPolicy !== undefined) {
            updates.push(`watermark_policy = ${placeholder(paramIndex++)}`);
            values.push(JSON.stringify(watermarkPolicy));
        }

        // Handle password update
        if (body.password !== undefined) {
            if (body.password === '' || body.password === null) {
                // Remove password
                updates.push(`password_hash = NULL`);
                updates.push(`is_encrypted = 0`); // Optionally disable encryption flag if it implies password
            } else {
                // Set new password
                const hashedPassword = await hashPassword(body.password);
                updates.push(`password_hash = ${placeholder(paramIndex++)}`);
                values.push(hashedPassword);
                updates.push(`is_encrypted = 1`);
            }
        }

        if (updates.length === 0) {
            return NextResponse.json(
                { status: false, message: 'No fields to update' },
                { status: 400 }
            );
        }

        // Add updated_at
        updates.push(`updated_at = ${nowSQL()}`);

        // Add WHERE conditions
        values.push(docId, tenantId);

        await execute(
            `UPDATE documents SET ${updates.join(', ')} 
       WHERE doc_id = ${placeholder(paramIndex++)} AND tenant_id = ${placeholder(paramIndex)}`,
            values
        );

        return NextResponse.json({
            status: true,
            message: 'Document updated successfully'
        });
    } catch (error) {
        console.error('Update document error:', error);
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
        const tenantId = request.headers.get('X-Tenant-Id');

        if (!tenantId) {
            return NextResponse.json(
                { status: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Check document exists and belongs to tenant
        const existing = await queryOne<Document>(
            `SELECT * FROM documents 
       WHERE doc_id = ${placeholder(1)} AND tenant_id = ${placeholder(2)}`,
            [docId, tenantId]
        );

        if (!existing) {
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
            const filePath = path.join(process.cwd(), existing.encrypted_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Delete from database
            await execute(
                `DELETE FROM documents 
         WHERE doc_id = ${placeholder(1)} AND tenant_id = ${placeholder(2)}`,
                [docId, tenantId]
            );

            return NextResponse.json({
                status: true,
                message: 'Document permanently deleted'
            });
        }

        // Soft delete - just update status
        await execute(
            `UPDATE documents SET status = 'inactive', updated_at = ${nowSQL()}
       WHERE doc_id = ${placeholder(1)} AND tenant_id = ${placeholder(2)}`,
            [docId, tenantId]
        );

        return NextResponse.json({
            status: true,
            message: 'Document deleted successfully'
        });
    } catch (error) {
        console.error('Delete document error:', error);
        return NextResponse.json(
            { status: false, message: 'Failed to delete document' },
            { status: 500 }
        );
    }
}
