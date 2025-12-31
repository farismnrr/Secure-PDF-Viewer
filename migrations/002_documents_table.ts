/**
 * Migration: Documents Table
 * Creates documents table with tenant isolation and password protection
 */

import { MigrationRunner } from './runner';

export const name = '002_documents_table';

export async function up(runner: MigrationRunner): Promise<void> {
    await runner.execute(`
    CREATE TABLE IF NOT EXISTS documents (
      id ${runner.autoIncrement()},
      doc_id TEXT NOT NULL UNIQUE,
      tenant_id TEXT NOT NULL,
      title TEXT NOT NULL,
      encrypted_path TEXT NOT NULL,
      content_type TEXT DEFAULT 'application/pdf',
      page_count INTEGER,
      is_encrypted ${runner.boolean()} DEFAULT ${runner.false()},
      password_hash TEXT,
      watermark_policy TEXT,
      status TEXT DEFAULT 'active',
      created_by TEXT NOT NULL,
      created_at ${runner.timestamp()} DEFAULT ${runner.now()},
      updated_at ${runner.timestamp()} DEFAULT ${runner.now()}
    )
  `);

    // Indexes for performance
    await runner.execute('CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id)');
    await runner.execute('CREATE INDEX IF NOT EXISTS idx_documents_doc_id ON documents(doc_id)');
    await runner.execute('CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status)');
    await runner.execute('CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by)');
}

export async function down(runner: MigrationRunner): Promise<void> {
    await runner.execute('DROP TABLE IF EXISTS documents');
}
