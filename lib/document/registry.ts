/**
 * Document registry management
 */

import fs from 'fs';
import path from 'path';
import { queryOneSync } from '../db';

// =============================================================================
// Types
// =============================================================================

export interface DocumentMetadata {
    docId: string;
    title: string;
    encryptedPath: string;
    contentType: string;
    pageCount?: number;
    watermarkPolicy: {
        showIp: boolean;
        showTimestamp: boolean;
        showSessionId: boolean;
        customText?: string;
    };
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
}

interface RegistryData {
    documents: DocumentMetadata[];
}

// =============================================================================
// Legacy Registry (JSON file)
// =============================================================================

const REGISTRY_PATH = path.join(process.cwd(), 'data', 'registry.json');

function loadRegistry(): RegistryData {
    try {
        const data = fs.readFileSync(REGISTRY_PATH, 'utf-8');
        return JSON.parse(data);
    } catch {
        return { documents: [] };
    }
}

function saveRegistry(registry: RegistryData): void {
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

// =============================================================================
// Document Operations
// =============================================================================

interface DbDocument {
    doc_id: string;
    title: string;
    encrypted_path: string;
    content_type: string;
    page_count: number | null;
    is_encrypted: number;
    watermark_policy: string | null;
    status: string;
    created_at: string;
    updated_at: string;
}

/**
 * Get a specific document by ID
 * Checks database first, then legacy registry.json
 */
export function getDocument(docId: string): DocumentMetadata | null {
    // Try database first (for documents uploaded via admin)
    try {
        const doc = queryOneSync<DbDocument>(
            'SELECT * FROM documents WHERE doc_id = ? LIMIT 1',
            [docId]
        );

        if (doc) {
            const watermarkPolicy = doc.watermark_policy
                ? JSON.parse(doc.watermark_policy)
                : { showIp: true, showTimestamp: true, showSessionId: true };

            return {
                docId: doc.doc_id,
                title: doc.title,
                encryptedPath: doc.encrypted_path,
                contentType: doc.content_type,
                pageCount: doc.page_count ?? undefined,
                watermarkPolicy,
                status: doc.status as 'active' | 'inactive',
                createdAt: doc.created_at,
                updatedAt: doc.updated_at
            };
        }
    } catch {
        // Fallback to legacy registry.json
    }

    // Fallback to legacy registry.json
    const registry = loadRegistry();
    return registry.documents.find(doc => doc.docId === docId) || null;
}

/**
 * Get all active documents (legacy)
 */
export function listDocuments(): DocumentMetadata[] {
    const registry = loadRegistry();
    return registry.documents.filter(doc => doc.status === 'active');
}

/**
 * Add or update a document in legacy registry
 */
export function upsertDocument(doc: DocumentMetadata): void {
    const registry = loadRegistry();
    const index = registry.documents.findIndex(d => d.docId === doc.docId);

    if (index >= 0) {
        registry.documents[index] = { ...doc, updatedAt: new Date().toISOString() };
    } else {
        registry.documents.push({
            ...doc,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
    }

    saveRegistry(registry);
}

/**
 * Deactivate a document (legacy)
 */
export function deactivateDocument(docId: string): boolean {
    const registry = loadRegistry();
    const doc = registry.documents.find(d => d.docId === docId);

    if (doc) {
        doc.status = 'inactive';
        doc.updatedAt = new Date().toISOString();
        saveRegistry(registry);
        return true;
    }

    return false;
}

/**
 * Check if document exists and is active
 */
export function isDocumentActive(docId: string): boolean {
    const doc = getDocument(docId);
    return doc?.status === 'active';
}
