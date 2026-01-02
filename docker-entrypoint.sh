#!/bin/bash
set -e

echo "🚀 Starting PDF Viewer..."

# Trap signals for graceful shutdown
trap 'echo "🛑 Shutting down..."' SIGTERM SIGINT


# ============================================================================
# Auto Migration
# ============================================================================
npx drizzle-kit push


# ============================================================================
# Start Application
# ============================================================================
echo "🚀 Starting Next.js server..."
exec node server.js
