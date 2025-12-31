
import { getConnection, closeConnection, getSqliteDb, getPostgresPool } from './connection';

/**
 * Close database connection
 */
export const closeDb = closeConnection;

/**
 * Reset database state (truncate tables)
 */
export async function resetDb(): Promise<void> {
    const conn = getConnection();

    const tables = ['nonces', 'access_logs', 'documents'];

    if (conn.type === 'sqlite') {
        const db = conn.db;
        for (const table of tables) {
            try {
                db.prepare(`DELETE FROM ${table}`).run();
            } catch (error) {
                // Ignore errors if table doesn't exist
            }
        }
    } else {
        const pool = conn.pool;
        for (const table of tables) {
            try {
                await pool.query(`TRUNCATE TABLE ${table} CASCADE`);
            } catch (error) {
                // Ignore
            }
        }
    }
}
