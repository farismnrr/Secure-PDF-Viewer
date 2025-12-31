/**
 * Migration: Initial Schema
 * Creates nonces and access_logs tables
 */

import { MigrationRunner } from './runner';

export const name = '001_initial_schema';

export async function up(runner: MigrationRunner): Promise<void> {
    // Nonces table
    await runner.execute(`
    CREATE TABLE IF NOT EXISTS nonces (
      id ${runner.autoIncrement()},
      doc_id TEXT NOT NULL,
      nonce TEXT NOT NULL UNIQUE,
      session_id TEXT NOT NULL,
      used ${runner.boolean()} DEFAULT ${runner.false()},
      created_at ${runner.timestamp()} DEFAULT ${runner.now()}
    )
  `);

    // Access logs table
    await runner.execute(`
    CREATE TABLE IF NOT EXISTS access_logs (
      id ${runner.autoIncrement()},
      doc_id TEXT NOT NULL,
      session_id TEXT,
      ip TEXT,
      user_agent TEXT,
      action TEXT NOT NULL,
      metadata TEXT,
      created_at ${runner.timestamp()} DEFAULT ${runner.now()}
    )
  `);

    // Indexes
    await runner.execute('CREATE INDEX IF NOT EXISTS idx_nonces_doc_id ON nonces(doc_id)');
    await runner.execute('CREATE INDEX IF NOT EXISTS idx_nonces_nonce ON nonces(nonce)');
    await runner.execute('CREATE INDEX IF NOT EXISTS idx_access_logs_doc_id ON access_logs(doc_id)');
}

export async function down(runner: MigrationRunner): Promise<void> {
    await runner.execute('DROP TABLE IF EXISTS access_logs');
    await runner.execute('DROP TABLE IF EXISTS nonces');
}
