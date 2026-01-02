import { pgTable, serial, text, boolean, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { sqliteTable, text as sqliteText, integer as sqliteInteger, index as sqliteIndex } from 'drizzle-orm/sqlite-core';

// =============================================================================
// PostgreSQL Schema (Production)
// =============================================================================

export const pgNonces = pgTable('nonces', {
    id: serial('id').primaryKey(),
    docId: text('doc_id').notNull(),
    nonce: text('nonce').notNull().unique(),
    sessionId: text('session_id').notNull(),
    used: boolean('used').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
    docIdIdx: index('idx_nonces_doc_id').on(table.docId),
    nonceIdx: index('idx_nonces_nonce').on(table.nonce),
}));

export const pgAccessLogs = pgTable('access_logs', {
    id: serial('id').primaryKey(),
    docId: text('doc_id').notNull(),
    sessionId: text('session_id'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    action: text('action').notNull(),
    metadata: text('metadata'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
    docIdIdx: index('idx_access_logs_doc_id').on(table.docId),
}));

export const pgDocuments = pgTable('documents', {
    id: serial('id').primaryKey(),
    docId: text('doc_id').notNull().unique(),
    tenantId: text('tenant_id').notNull(),
    title: text('title').notNull(),
    encryptedPath: text('encrypted_path').notNull(),
    contentType: text('content_type').default('application/pdf'),
    pageCount: integer('page_count'),
    isEncrypted: boolean('is_encrypted').notNull().default(false),
    passwordHash: text('password_hash'),
    watermarkPolicy: text('watermark_policy'),
    status: text('status').notNull().default('active'),
    createdBy: text('created_by').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
    tenantIdIdx: index('idx_documents_tenant').on(table.tenantId),
    docIdIdx: index('idx_documents_doc_id').on(table.docId),
    statusIdx: index('idx_documents_status').on(table.status),
    createdByIdx: index('idx_documents_created_by').on(table.createdBy),
}));

// =============================================================================
// SQLite Schema (Development/Testing)
// =============================================================================

export const sqliteNonces = sqliteTable('nonces', {
    id: sqliteInteger('id').primaryKey({ autoIncrement: true }),
    docId: sqliteText('doc_id').notNull(),
    nonce: sqliteText('nonce').notNull().unique(),
    sessionId: sqliteText('session_id').notNull(),
    used: sqliteInteger('used', { mode: 'boolean' }).notNull().default(false),
    createdAt: sqliteInteger('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    docIdIdx: sqliteIndex('idx_nonces_doc_id').on(table.docId),
    nonceIdx: sqliteIndex('idx_nonces_nonce').on(table.nonce),
}));

export const sqliteAccessLogs = sqliteTable('access_logs', {
    id: sqliteInteger('id').primaryKey({ autoIncrement: true }),
    docId: sqliteText('doc_id').notNull(),
    sessionId: sqliteText('session_id'),
    ip: sqliteText('ip'),
    userAgent: sqliteText('user_agent'),
    action: sqliteText('action').notNull(),
    metadata: sqliteText('metadata'),
    createdAt: sqliteInteger('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    docIdIdx: sqliteIndex('idx_access_logs_doc_id').on(table.docId),
}));

export const sqliteDocuments = sqliteTable('documents', {
    id: sqliteInteger('id').primaryKey({ autoIncrement: true }),
    docId: sqliteText('doc_id').notNull().unique(),
    tenantId: sqliteText('tenant_id').notNull(),
    title: sqliteText('title').notNull(),
    encryptedPath: sqliteText('encrypted_path').notNull(),
    contentType: sqliteText('content_type').default('application/pdf'),
    pageCount: sqliteInteger('page_count'),
    isEncrypted: sqliteInteger('is_encrypted', { mode: 'boolean' }).notNull().default(false),
    passwordHash: sqliteText('password_hash'),
    watermarkPolicy: sqliteText('watermark_policy'),
    status: sqliteText('status').notNull().default('active'),
    createdBy: sqliteText('created_by').notNull(),
    createdAt: sqliteInteger('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: sqliteInteger('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    tenantIdIdx: sqliteIndex('idx_documents_tenant').on(table.tenantId),
    docIdIdx: sqliteIndex('idx_documents_doc_id').on(table.docId),
    statusIdx: sqliteIndex('idx_documents_status').on(table.status),
    createdByIdx: sqliteIndex('idx_documents_created_by').on(table.createdBy),
}));

// Type exports for use in application
export type PgNonce = typeof pgNonces.$inferSelect;
export type PgAccessLog = typeof pgAccessLogs.$inferSelect;
export type PgDocument = typeof pgDocuments.$inferSelect;

export type SqliteNonce = typeof sqliteNonces.$inferSelect;
export type SqliteAccessLog = typeof sqliteAccessLogs.$inferSelect;
export type SqliteDocument = typeof sqliteDocuments.$inferSelect;
