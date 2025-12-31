#!/bin/bash
set -e

echo "🚀 Starting PDF Viewer..."

# Trap signals for graceful shutdown
trap 'echo "🛑 Shutting down..."' SIGTERM SIGINT

# ============================================================================
# Auto Migration
# ============================================================================
echo "📦 Running database migrations..."

# We don't need to construct DATABASE_URL here because migrations/run.js
# reads individual env vars (DB_TYPE, DB_HOST, etc.) directly.

if [ -f "migrations/run.js" ]; then
    echo "⬆️  Running migrations script..."
    node migrations/run.js up
    echo "✅ Migrations completed successfully"
else
    echo "⚠️  Migration script not found at migrations/run.js, skipping migrations"
fi

# ============================================================================
# Start Application
# ============================================================================
echo "🚀 Starting Next.js server..."
exec node server.js
