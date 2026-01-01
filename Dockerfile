# ============================================================================
# Stage 1: Dependencies (cache-friendly)
# ============================================================================
FROM node:25-bookworm-slim AS deps
WORKDIR /app

# Native build deps (ONLY for build)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg62-turbo-dev \
    libgif-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy ONLY dependency manifests
COPY package.json package-lock.json ./

# Install deps
RUN npm ci --ignore-scripts

# ============================================================================
# Stage 2: Build
# ============================================================================
FROM node:25-bookworm-slim AS builder
WORKDIR /app

# Same build deps (must match deps stage)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg62-turbo-dev \
    libgif-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy dependencies
COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules

# Copy configuration files
COPY next.config.ts ./
COPY tailwind.config.ts ./
COPY postcss.config.mjs ./
COPY tsconfig.json ./
COPY jest.config.ts ./
COPY eslint.config.mjs ./

# Copy source code
COPY public ./public
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY scripts ./scripts
COPY prisma ./prisma

# Build
ENV NODE_ENV=production

# Run checks before build (CI style)
# Run checks before build (CI style)
RUN mkdir -p data
RUN npm rebuild better-sqlite3
RUN npm rebuild canvas
RUN npm run lint

# Run Unit Tests (using SQLite ephemeral DB)
# 1. Switch to SQLite
RUN cat prisma/schema.base.prisma prisma/schema.sqlite.prisma > prisma/schema.prisma
ENV DATABASE_URL="file:./test.db"
# 2. Generate Client for SQLite
RUN npx prisma generate
# 3. Push schema to test DB
RUN npx prisma db push
# 4. Run Tests
RUN npm test

# Clean up and Prepare for Production Build (Postgres)
# 1. Switch back to Postgres
RUN cat prisma/schema.base.prisma prisma/schema.postgres.prisma > prisma/schema.prisma
# 2. Generate Client for Postgres (Implicitly done by npm run build -> prisma generate, but good to be explicit)
RUN npx prisma generate

RUN npm run build


# ============================================================================
# Stage 3: Runtime (minimal & safe)
# ============================================================================
FROM node:25-bookworm-slim AS runner
WORKDIR /app

# Runtime libs ONLY
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    curl \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Install Prisma CLI for removals/migrations (Global)
RUN npm install -g prisma@6.19.1


ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Non-root user
RUN useradd -r -u 1001 nextjs

# Copy standalone output
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public

COPY --chown=nextjs:nextjs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
COPY --from=builder --chown=nextjs:nextjs /app/prisma ./prisma

# Create storage and data directories with correct permissions
RUN mkdir -p storage data
RUN chown -R nextjs:nextjs storage data

USER nextjs

EXPOSE 3000

# Health check (use 127.0.0.1 to avoid ipv6 resolution issues)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/ || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
