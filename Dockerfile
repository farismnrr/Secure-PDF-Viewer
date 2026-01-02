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
COPY drizzle.config.ts ./

# Build
ENV NODE_ENV=production

# Run checks before build (CI style)
# Run checks before build (CI style)
RUN mkdir -p data
RUN npm rebuild better-sqlite3
RUN npm rebuild canvas
RUN npm run lint

# Run Unit Tests
RUN npm test

# Build
RUN npm run build

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



# Install Drizzle CLI, ORM, and TSX for migrations (Global)
RUN npm install -g drizzle-kit@0.30.4 drizzle-orm@0.39.1 tsx

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

# Copy config for migrations
COPY --from=builder --chown=nextjs:nextjs /app/drizzle.config.ts ./
# Schema is needed for migration, ensure directory exists
RUN mkdir -p lib/db
COPY --from=builder --chown=nextjs:nextjs /app/lib/db/schema.ts ./lib/db/

# Create storage and data directories with correct permissions
RUN mkdir -p storage data
RUN chown -R nextjs:nextjs storage data

USER nextjs

EXPOSE 3000

# Health check (use 127.0.0.1 to avoid ipv6 resolution issues)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://127.0.0.1:3000/ || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
