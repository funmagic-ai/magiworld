# ============================================
# Task Worker Dockerfile
# 任务 Worker Dockerfile
# ============================================

FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.2 --activate

# ============================================
# Dependencies stage
# ============================================
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/queue/package.json ./packages/queue/
COPY packages/db/package.json ./packages/db/
COPY packages/utils/package.json ./packages/utils/
COPY packages/types/package.json ./packages/types/
COPY packages/config/package.json ./packages/config/
COPY apps/worker/package.json ./apps/worker/

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Build stage
# ============================================
FROM base AS builder
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/queue/node_modules ./packages/queue/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/utils/node_modules ./packages/utils/node_modules
COPY --from=deps /app/apps/worker/node_modules ./apps/worker/node_modules

# Copy source files
COPY packages/ ./packages/
COPY apps/worker/ ./apps/worker/
COPY tsconfig.json ./

# Build packages
RUN pnpm --filter @magiworld/utils build || true
RUN pnpm --filter @magiworld/queue build || true
RUN pnpm --filter @magiworld/worker build

# ============================================
# Production stage
# ============================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker
USER worker

# Copy built files
COPY --from=builder --chown=worker:nodejs /app/packages/queue/dist ./packages/queue/dist
COPY --from=builder --chown=worker:nodejs /app/packages/queue/package.json ./packages/queue/
COPY --from=builder --chown=worker:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=builder --chown=worker:nodejs /app/packages/db/package.json ./packages/db/
COPY --from=builder --chown=worker:nodejs /app/packages/utils/dist ./packages/utils/dist
COPY --from=builder --chown=worker:nodejs /app/packages/utils/package.json ./packages/utils/
COPY --from=builder --chown=worker:nodejs /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=worker:nodejs /app/apps/worker/package.json ./apps/worker/
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules

WORKDIR /app/apps/worker

CMD ["node", "dist/index.js"]
