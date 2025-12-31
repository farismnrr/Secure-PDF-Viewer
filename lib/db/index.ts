/**
 * Database module exports
 */

// Config
export { getDbType, getDbConfig, type DbType, type DbConfig } from '../config';

// Connection
export {
    getConnection,
    closeConnection,
    getSqliteDb,
    getPostgresPool,
    type DbConnection
} from './connection';

// Async queries
export {
    query,
    queryOne,
    execute,
    placeholder,
    placeholders,
    nowSQL,
    type ExecuteResult
} from './query';

// Sync queries (SQLite only)
export { querySync, queryOneSync } from './sync-query';
