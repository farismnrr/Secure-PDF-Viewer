/**
 * Database Migration Runner
 * Supports SQLite and PostgreSQL with cross-database compatible syntax
 */

export type DbType = 'sqlite' | 'postgres';

export interface MigrationRunner {
    dbType: DbType;
    execute(sql: string): Promise<void>;
    autoIncrement(): string;
    boolean(): string;
    false(): string;
    true(): string;
    timestamp(): string;
    now(): string;
    text(): string;
    uuid(): string;
}

export interface Migration {
    name: string;
    up: (runner: MigrationRunner) => Promise<void>;
    down: (runner: MigrationRunner) => Promise<void>;
}

/**
 * Create a migration runner for the specified database type
 */
export function createMigrationRunner(
    dbType: DbType,
    executeFn: (sql: string) => Promise<void>
): MigrationRunner {
    return {
        dbType,
        execute: executeFn,

        autoIncrement(): string {
            return dbType === 'postgres'
                ? 'SERIAL PRIMARY KEY'
                : 'INTEGER PRIMARY KEY AUTOINCREMENT';
        },

        boolean(): string {
            return dbType === 'postgres' ? 'BOOLEAN' : 'INTEGER';
        },

        false(): string {
            return dbType === 'postgres' ? 'FALSE' : '0';
        },

        true(): string {
            return dbType === 'postgres' ? 'TRUE' : '1';
        },

        timestamp(): string {
            return dbType === 'postgres' ? 'TIMESTAMPTZ' : 'TEXT';
        },

        now(): string {
            return dbType === 'postgres' ? 'NOW()' : 'CURRENT_TIMESTAMP';
        },

        text(): string {
            return 'TEXT';
        },

        uuid(): string {
            return dbType === 'postgres' ? 'UUID' : 'TEXT';
        }
    };
}

/**
 * Migration tracking table schema
 */
export function getMigrationTableSQL(runner: MigrationRunner): string {
    return `
    CREATE TABLE IF NOT EXISTS _migrations (
      id ${runner.autoIncrement()},
      name TEXT NOT NULL UNIQUE,
      executed_at ${runner.timestamp()} DEFAULT ${runner.now()}
    )
  `;
}
