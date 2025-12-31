#!/usr/bin/env npx tsx
/**
 * Migration CLI
 * Usage:
 *   npx tsx migrations/run.ts up      - Run pending migrations
 *   npx tsx migrations/run.ts down    - Rollback last migration
 *   npx tsx migrations/run.ts fresh   - Drop all and re-run
 *   npx tsx migrations/run.ts status  - Show migration status
 */

import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import { createMigrationRunner, getMigrationTableSQL, DbType, Migration } from './runner';

// Get database type from environment
function getDbType(): DbType {
    const dbType = process.env.DB_TYPE || 'sqlite';

    if (dbType !== 'sqlite' && dbType !== 'postgres') {
        throw new Error(`Invalid DB_TYPE: ${dbType}. Must be 'sqlite' or 'postgres'`);
    }

    return dbType;
}

// Create SQLite connection
function createSqliteConnection(): Database.Database {
    const dbPath = process.env.DB_PATH || 'data/viewer.db';
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    return new Database(dbPath);
}

// Create PostgreSQL connection
function createPostgresConnection(): Pool {
    return new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'pdf_viewer'
    });
}

// Load all migration files
async function loadMigrations(): Promise<Migration[]> {
    const migrationsDir = path.dirname(__filename);
    const files = fs.readdirSync(migrationsDir)
        .filter(f => /^\d{3}_.*\.(ts|js)$/.test(f))
        .filter(f => !f.endsWith('.d.ts')) // exclude type definitions
        .sort();

    const migrations: Migration[] = [];

    for (const file of files) {
        const mod = await import(path.join(migrationsDir, file));
        migrations.push({
            name: mod.name || file.replace('.ts', ''),
            up: mod.up,
            down: mod.down
        });
    }

    return migrations;
}

// Get executed migrations from database
async function getExecutedMigrations(
    dbType: DbType,
    sqlite?: Database.Database,
    postgres?: Pool
): Promise<string[]> {
    if (dbType === 'sqlite' && sqlite) {
        try {
            const rows = sqlite.prepare('SELECT name FROM _migrations ORDER BY id').all() as { name: string }[];
            return rows.map(r => r.name);
        } catch {
            return [];
        }
    }

    if (dbType === 'postgres' && postgres) {
        try {
            const result = await postgres.query('SELECT name FROM _migrations ORDER BY id');
            return result.rows.map((r: { name: string }) => r.name);
        } catch {
            return [];
        }
    }

    return [];
}

// Record migration as executed
async function recordMigration(
    name: string,
    dbType: DbType,
    sqlite?: Database.Database,
    postgres?: Pool
): Promise<void> {
    if (dbType === 'sqlite' && sqlite) {
        sqlite.prepare('INSERT INTO _migrations (name) VALUES (?)').run(name);
        return;
    }

    if (dbType === 'postgres' && postgres) {
        await postgres.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
    }
}

// Remove migration record
async function removeMigrationRecord(
    name: string,
    dbType: DbType,
    sqlite?: Database.Database,
    postgres?: Pool
): Promise<void> {
    if (dbType === 'sqlite' && sqlite) {
        sqlite.prepare('DELETE FROM _migrations WHERE name = ?').run(name);
        return;
    }

    if (dbType === 'postgres' && postgres) {
        await postgres.query('DELETE FROM _migrations WHERE name = $1', [name]);
    }
}

// Main CLI handler
async function main() {
    const command = process.argv[2] || 'status';
    const dbType = getDbType();

    console.log(`📦 Database type: ${dbType}`);

    let sqlite: Database.Database | undefined;
    let postgres: Pool | undefined;

    if (dbType === 'sqlite') {
        sqlite = createSqliteConnection();
    } else {
        postgres = createPostgresConnection();
    }

    // Create execute function
    const executeFn = async (sql: string): Promise<void> => {
        if (sqlite) {
            sqlite.exec(sql);
            return;
        }

        if (postgres) {
            await postgres.query(sql);
        }
    };

    const runner = createMigrationRunner(dbType, executeFn);

    // Ensure migrations table exists
    await executeFn(getMigrationTableSQL(runner));

    const migrations = await loadMigrations();
    const executed = await getExecutedMigrations(dbType, sqlite, postgres);

    switch (command) {
        case 'up': {
            const pending = migrations.filter(m => !executed.includes(m.name));

            if (pending.length === 0) {
                console.log('✅ No pending migrations');
                break;
            }

            for (const migration of pending) {
                console.log(`⬆️  Running: ${migration.name}`);
                await migration.up(runner);
                await recordMigration(migration.name, dbType, sqlite, postgres);
                console.log(`   ✅ Done`);
            }

            console.log(`\n✅ Ran ${pending.length} migration(s)`);
            break;
        }

        case 'down': {
            if (executed.length === 0) {
                console.log('✅ No migrations to rollback');
                break;
            }

            const lastExecuted = executed[executed.length - 1];
            const migration = migrations.find(m => m.name === lastExecuted);

            if (!migration) {
                console.error(`❌ Migration not found: ${lastExecuted}`);
                break;
            }

            console.log(`⬇️  Rolling back: ${migration.name}`);
            await migration.down(runner);
            await removeMigrationRecord(migration.name, dbType, sqlite, postgres);
            console.log(`   ✅ Done`);
            break;
        }

        case 'fresh': {
            console.log('🔄 Dropping all tables...');

            // Get all tables and drop them
            if (sqlite) {
                const tables = sqlite.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `).all() as { name: string }[];

                for (const { name } of tables) {
                    sqlite.exec(`DROP TABLE IF EXISTS "${name}"`);
                    console.log(`   Dropped: ${name}`);
                }
            }

            if (postgres) {
                const result = await postgres.query(`
          SELECT tablename FROM pg_tables 
          WHERE schemaname = 'public'
        `);

                for (const { tablename } of result.rows) {
                    await postgres.query(`DROP TABLE IF EXISTS "${tablename}" CASCADE`);
                    console.log(`   Dropped: ${tablename}`);
                }
            }

            // Re-create migrations table and run all
            await executeFn(getMigrationTableSQL(runner));

            for (const migration of migrations) {
                console.log(`⬆️  Running: ${migration.name}`);
                await migration.up(runner);
                await recordMigration(migration.name, dbType, sqlite, postgres);
                console.log(`   ✅ Done`);
            }

            console.log(`\n✅ Fresh migration complete (${migrations.length} migrations)`);
            break;
        }

        case 'status':
        default: {
            console.log('\n📋 Migration Status:\n');

            for (const migration of migrations) {
                const status = executed.includes(migration.name) ? '✅' : '⏳';
                console.log(`   ${status} ${migration.name}`);
            }

            const pending = migrations.filter(m => !executed.includes(m.name));
            console.log(`\n   Total: ${migrations.length} | Executed: ${executed.length} | Pending: ${pending.length}`);
            break;
        }
    }

    // Cleanup
    if (sqlite) sqlite.close();
    if (postgres) await postgres.end();
}

main().catch(err => {
    console.error('❌ Migration error:', err);
    process.exit(1);
});
