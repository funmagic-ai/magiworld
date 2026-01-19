## Step 9: Deploy to AWS EC2 with Docker

This guide uses a **simple EC2 + Docker** approach for easy setup. You can migrate to ECS later if needed.

### 9.1 Prerequisites

- AWS CLI configured
- SSH key pair created in AWS EC2 console
- Docker images ready (we'll build them on EC2)

### 9.2 Create Security Group

1. Go to **EC2** → **Security Groups** → **Create security group**
2. **Name**: `funmagic-ec2-sg`
3. **Description**: Security group for Funmagic EC2 instance
4. **VPC**: Default VPC (or your VPC)
5. **Inbound rules**:

| Type | Port | Source | Description |
|------|------|--------|-------------|
| SSH | 22 | Your IP | SSH access |
| HTTP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | 443 | 0.0.0.0/0 | Secure web traffic |

6. **Outbound rules**: Keep default (all traffic allowed)
7. Click **Create security group**

### 9.3 Launch EC2 Instance

1. Go to **EC2** → **Instances** → **Launch instances**
2. **Name**: `funmagic-server`
3. **AMI**: Amazon Linux 2023 (or Ubuntu 22.04 LTS)
4. **Instance type**: `t3.small` (2 vCPU, 2GB RAM) - can run both apps
   - For lower cost: `t3.micro` (1 vCPU, 1GB RAM) - tight but works
5. **Key pair**: Select your SSH key pair
6. **Network settings**:
   - **VPC**: Default VPC
   - **Subnet**: Any public subnet
   - **Auto-assign public IP**: Enable
   - **Security group**: Select `funmagic-ec2-sg`
7. **Storage**: 20 GB gp3 (default is fine)
8. Click **Launch instance**

### 9.4 Allocate Elastic IP (Recommended)

An Elastic IP ensures your server IP doesn't change on reboot:

1. Go to **EC2** → **Elastic IPs** → **Allocate Elastic IP address**
2. Click **Allocate**
3. Select the new IP → **Actions** → **Associate Elastic IP address**
4. **Instance**: Select `funmagic-server`
5. Click **Associate**

> Note the Elastic IP address (e.g., `3.15.xxx.xxx`) - you'll use this for DNS.

### 9.5 Connect to EC2 and Install Docker

```bash
# SSH into your instance
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP

# For Ubuntu: ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
```

**Install Docker (Amazon Linux 2023)**:

```bash
# Update system
sudo dnf update -y

# Install Docker
sudo dnf install docker -y

# Start Docker and enable on boot
sudo systemctl start docker
sudo systemctl enable docker

# Add current user to docker group (avoid sudo)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Log out and back in for group changes
exit
```

**Install Docker (Ubuntu)**:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin -y

# Log out and back in
exit
```

### 9.6 Set Up Project on EC2

SSH back in and set up your project:

```bash
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP

# Create app directory
mkdir -p ~/funmagic
cd ~/funmagic

# Install git
sudo dnf install git -y  # Amazon Linux
# sudo apt install git -y  # Ubuntu
```

### 9.7 Create Docker Files

**Create `docker-compose.yml`** in `~/funmagic`:
nano docker-compose.yml


```yaml
# =============================================================================
# Docker Compose Configuration for Magiworld
# =============================================================================
# This file defines 4 services that run together:
# 1. web    - Next.js frontend for end users (port 3000)
# 2. admin  - Next.js admin dashboard (port 3001)
# 3. worker - BullMQ worker for processing AI tasks
# 4. nginx  - Reverse proxy handling SSL and routing (ports 80, 443)
#
# Architecture:
#   Internet → Nginx (SSL termination) → web/admin containers → RDS database
#   web/admin → Redis (task queue) → worker → AI providers → Redis (results)
#
# Commands:
#   docker-compose up -d --build    # Build and start all services
#   docker-compose logs -f web      # View web app logs
#   docker-compose logs -f worker   # View worker logs
#   docker-compose restart web      # Restart a specific service
#   docker-compose down             # Stop and remove all containers
# =============================================================================

version: '3.8'  # Docker Compose file format version

# 定义统一的日志管理模板，防止磁盘被日志塞满
x-logging: &default-logging
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

services:
  # ---------------------------------------------------------------------------
  # Web App Service (User-facing Next.js application)
  # ---------------------------------------------------------------------------
  web:
    build:
      context: .                    # Build context is current directory (repo root),CHECK THE PATH OF Package and env,etc
      dockerfile: Dockerfile.web    # Use web-specific Dockerfile
    container_name: funmagic-web    # Fixed container name for easy reference
    restart: unless-stopped         # Auto-restart on crash, but not on manual stop
    ports:
      - "3000:3000"                 # Map host:container ports (internal only, Nginx proxies)
    environment:
      - NODE_ENV=production         # Enable Next.js production optimizations
      - HOSTNAME=0.0.0.0  # 核心：允许外部访问容器
      - PORT=3000         # 核心：明确端口
    env_file:
      - .env.web                    # Load environment variables from file
    # Note: No healthcheck needed for simple setup; add if using load balancer
    logging: *default-logging
    deploy:
      resources:
        limits:
          memory: 1G  # 限制内存，防止单个服务耗尽内存导致系统 OOM

  # ---------------------------------------------------------------------------
  # Admin App Service (Admin dashboard Next.js application)
  # ---------------------------------------------------------------------------
  admin:
    build:
      context: .                    # Same build context as web,,CHECK THE PATH OF Package and env,etc
      dockerfile: Dockerfile.admin  # Use admin-specific Dockerfile
    container_name: funmagic-admin
    restart: unless-stopped
    ports:
      - "3001:3001"                 # Different port to avoid conflict with web
    environment:
      - NODE_ENV=production
      - HOSTNAME=0.0.0.0  # 核心：允许外部访问容器
      - PORT=3001         # 核心：明确端口
    env_file:
      - .env.admin                  # Separate env file with admin-specific configs
    logging: *default-logging
    deploy:
      resources:
        limits:
          memory: 1G  # 限制内存，防止单个服务耗尽内存导致系统 OOM

  # ---------------------------------------------------------------------------
  # Worker Service (BullMQ task processor)
  # ---------------------------------------------------------------------------
  # Processes AI tasks from the queue:
  # - Image generation (Flux, DALL-E)
  # - Background removal (BRIA RMBG)
  # - Image upscaling, etc.
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    container_name: funmagic-worker
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env.worker                 # Worker-specific config (Redis, AI keys, etc.)
    logging: *default-logging
    deploy:
      resources:
        limits:
          memory: 1G  # Worker memory limit
    # No ports exposed - worker only connects outbound to Redis and AI APIs

  # ---------------------------------------------------------------------------
  # Nginx Reverse Proxy Service
  # ---------------------------------------------------------------------------
  # Handles:
  # - SSL/TLS termination (HTTPS)
  # - Routing: funmagic.ai → web:3000, admin.funmagic.ai → admin:3001
  # - Security headers, compression, caching
  nginx:
    image: nginx:alpine             # Lightweight Alpine-based Nginx image
    container_name: funmagic-nginx
    restart: unless-stopped
    ports:
      - "80:80"                     # HTTP (redirects to HTTPS)
      - "443:443"                   # HTTPS (main traffic)
    volumes:
      # Mount nginx config as read-only (:ro) for security
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      # Mount SSL certificates (origin.pem + origin.key from Cloudflare)
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - web                         # Wait for web to start before nginx
      - admin                       # Wait for admin to start before nginx
   logging: *default-logging
    deploy:
      resources:
        limits:
          memory: 512M  # 限制内存，防止单个服务耗尽内存导致系统 OOM
    # Note: depends_on only waits for container start, not app readiness
```

**Create `Dockerfile.web`**:
nano Dockerfile.web

```dockerfile
# =============================================================================
# Multi-Stage Dockerfile for Next.js Web Application
# =============================================================================
# This Dockerfile uses multi-stage builds to create a minimal production image:
#
# Stage 1 (base):   Base Node.js Alpine image
# Stage 2 (deps):   Install all dependencies (dev + prod)
# Stage 3 (builder): Build the Next.js application
# Stage 4 (runner):  Minimal runtime image with only production files
#
# Benefits of multi-stage builds:
# - Final image is ~150MB instead of ~1GB (no dev dependencies, build tools)
# - Faster container startup and lower memory usage
# - Better security (fewer packages = smaller attack surface)
#
# Next.js Standalone Output:
# - Requires `output: 'standalone'` in next.config.js
# - Creates server.js with all dependencies bundled
# - No need to copy node_modules to production image
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base Image
# -----------------------------------------------------------------------------
# Alpine Linux is a minimal distro (~5MB), perfect for containers
FROM node:20-alpine AS base

# -----------------------------------------------------------------------------
# Stage 2: Dependencies
# -----------------------------------------------------------------------------
# Install all dependencies (including devDependencies for build)
FROM base AS deps

# libc6-compat: Fixes Alpine compatibility issues with some npm packages
# Alpine uses musl libc, but some packages expect glibc
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files for dependency installation
# This is done first to leverage Docker layer caching:
# - If package.json doesn't change, deps layer is cached
# - Even if source code changes, we skip npm install (saves ~60s)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

# Enable pnpm and install dependencies
# --frozen-lockfile: Fail if lock file is out of sync (ensures reproducibility)
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 3: Builder
# -----------------------------------------------------------------------------
# Build the Next.js application
FROM base AS builder
WORKDIR /app

# Copy installed dependencies from deps stage
# IMPORTANT: Copy entire /app, not just node_modules!
# pnpm creates symlinks in workspace packages (apps/web/node_modules)
# that point back to root node_modules/.pnpm - we need the full structure
COPY --from=deps /app ./

# Copy all source code (overwrites package.json files, but node_modules remain)
COPY . .

# Skip environment variable validation during build
# The apps validate env vars at import time (lib/env.ts), but env vars are only
# available at runtime via docker-compose env_file, not during Docker build.
# This tells lib/env.ts to skip validation and return process.env as-is.
ENV SKIP_ENV_VALIDATION=true

# Increase Node.js memory limit for large builds (default is ~1.7GB)
# This helps prevent "JavaScript heap out of memory" errors on smaller EC2 instances
# Adjust value based on your instance size (4096 = 4GB)
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build only the web app (monorepo filter)
# This runs: next build --filter=web
RUN corepack enable pnpm && pnpm --filter web build

# -----------------------------------------------------------------------------
# Stage 4: Runner (Production)
# -----------------------------------------------------------------------------
# Minimal production image
FROM base AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Security: Create non-root user to run the app
# Running as root is a security risk; containers should use least privilege
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy public assets (images, fonts, etc.)
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy the standalone server output
# standalone/ contains:
# - server.js: The Node.js server
# - Bundled dependencies (no node_modules needed)
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./

# Copy static files (CSS, JS bundles)
# These are served directly by Next.js
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

# Switch to non-root user for security
USER nextjs

# Expose port 3000 (documentation only, actual mapping is in docker-compose)
EXPOSE 3000

# Configure Next.js to listen on all interfaces (required for Docker)
# Without HOSTNAME="0.0.0.0", the app only listens on localhost (unreachable from outside)
ENV PORT=3000 HOSTNAME="0.0.0.0"

# Start the Next.js server
# server.js is created by Next.js standalone output mode
CMD ["node", "apps/web/server.js"]
```

**Create `Dockerfile.admin`**:

```dockerfile
# =============================================================================
# Multi-Stage Dockerfile for Next.js Admin Application
# =============================================================================
# Same structure as Dockerfile.web, but builds the admin app instead.
#
# Key differences from Dockerfile.web:
# - Builds apps/admin instead of apps/web
# - Runs on port 3001 instead of 3000
# - Used for internal admin dashboard, not public-facing
#
# See Dockerfile.web comments for detailed explanation of each step.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base Image
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base

# -----------------------------------------------------------------------------
# Stage 2: Dependencies
# -----------------------------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files for all workspace packages needed by admin
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin/package.json ./apps/admin/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

RUN corepack enable pnpm && pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 3: Builder
# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copy entire /app from deps (includes workspace node_modules symlinks)
COPY --from=deps /app ./
COPY . .

# Skip environment variable validation during build
# (env vars are only available at runtime via docker-compose env_file)
ENV SKIP_ENV_VALIDATION=true

# Increase Node.js memory limit for large builds
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build only the admin app (monorepo filter)
RUN corepack enable pnpm && pnpm --filter admin build

# -----------------------------------------------------------------------------
# Stage 4: Runner (Production)
# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy production files from builder
COPY --from=builder /app/apps/admin/public ./apps/admin/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs

# Admin runs on port 3001 (web uses 3000)
EXPOSE 3001
ENV PORT=3001 HOSTNAME="0.0.0.0"

CMD ["node", "apps/admin/server.js"]
```

**Create `Dockerfile.worker`**:
nano Dockerfile.worker

```dockerfile
# =============================================================================
# Multi-Stage Dockerfile for BullMQ Worker Application
# =============================================================================
# This Dockerfile builds the worker service that processes AI tasks from Redis.
#
# Key differences from web/admin Dockerfiles:
# - Builds apps/worker (Node.js app, not Next.js)
# - No ports exposed (worker connects outbound only)
# - Runs continuously processing queue jobs
# - Requires AI provider API keys at runtime
#
# The worker:
# - Connects to Redis to receive jobs from BullMQ queues
# - Calls AI providers (Fal.ai, OpenAI, etc.) to process tasks
# - Uploads results to S3
# - Publishes status updates via Redis Pub/Sub
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base Image
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base

# -----------------------------------------------------------------------------
# Stage 2: Dependencies
# -----------------------------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files for all workspace packages needed by worker
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json ./apps/worker/
COPY packages/db/package.json ./packages/db/
COPY packages/queue/package.json ./packages/queue/
COPY packages/types/package.json ./packages/types/
COPY packages/utils/package.json ./packages/utils/

RUN corepack enable pnpm && pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 3: Builder
# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

# Copy dependencies and source
COPY --from=deps /app ./
COPY . .

# Skip environment variable validation during build
ENV SKIP_ENV_VALIDATION=true

# Build the worker app (TypeScript compilation)
RUN corepack enable pnpm && pnpm --filter @magiworld/worker build

# -----------------------------------------------------------------------------
# Stage 4: Runner (Production)
# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

# Copy built worker files
# Worker uses compiled JS from dist/ directory
COPY --from=builder --chown=worker:nodejs /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=worker:nodejs /app/apps/worker/package.json ./apps/worker/

# Copy workspace dependencies (node_modules with symlinks resolved)
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/packages ./packages

USER worker

# No port needed - worker only makes outbound connections
# to Redis (ElastiCache) and AI APIs

# Start the worker
CMD ["node", "apps/worker/dist/index.js"]
```

**Create `nginx.conf`**:
nano nginx.conf
```nginx
# =============================================================================
# Nginx Reverse Proxy Configuration
# =============================================================================
# This configuration handles:
# 1. SSL/TLS termination (HTTPS)
# 2. Domain-based routing to different Next.js apps
# 3. WebSocket support (required for Next.js hot reload in dev, optional in prod)
# 4. Proper header forwarding for the apps to know the original client info
#
# Traffic Flow:
#   Client → Nginx (443) → web container (3000) or admin container (3001)
#
# File locations (inside container):
#   /etc/nginx/nginx.conf  - This config file
#   /etc/nginx/ssl/        - SSL certificates (Cloudflare Origin or Let's Encrypt)
# =============================================================================

# -----------------------------------------------------------------------------
# Events Block - Worker Connection Settings
# -----------------------------------------------------------------------------
events {
    # Maximum simultaneous connections per worker process
    # 1024 is suitable for most small-medium sites
    # For high traffic: increase to 4096 or higher
    worker_connections 1024;
}

# -----------------------------------------------------------------------------
# HTTP Block - Main Configuration
# -----------------------------------------------------------------------------
http {
    # -------------------------------------------------------------------------
    # Upstream Definitions - Backend Server Groups
    # -------------------------------------------------------------------------
    # Define backend servers that Nginx will proxy to
    # Docker Compose service names (web, admin) are used as hostnames

    upstream web {
        server web:3000;  # Docker service name:port
    }

    upstream admin {
        server admin:3001;
    }

    # -------------------------------------------------------------------------
    # HTTP → HTTPS Redirect Server
    # -------------------------------------------------------------------------
    # All HTTP traffic is permanently redirected to HTTPS
    # 301 = permanent redirect (browsers cache this)
    server {
        listen 80;
        server_name funmagic.ai www.funmagic.ai admin.funmagic.ai;

        # Redirect to HTTPS, preserving the host and full URI
        return 301 https://$host$request_uri;
    }

    # -------------------------------------------------------------------------
    # Main Website Server (funmagic.ai)
    # -------------------------------------------------------------------------
    server {
        listen 443 ssl;
        server_name funmagic.ai www.funmagic.ai;

        # SSL certificates
        # Option A (Cloudflare Origin): origin.pem + origin.key (15-year validity)
        # Option B (Let's Encrypt):     fullchain.pem + privkey.pem (90-day validity)
        ssl_certificate /etc/nginx/ssl/origin.pem;         # Certificate
        ssl_certificate_key /etc/nginx/ssl/origin.key;     # Private key

        location / {
            # Forward requests to the web upstream
            proxy_pass http://web;

            # HTTP/1.1 required for WebSocket and keepalive
            proxy_http_version 1.1;

            # WebSocket support (for Next.js HMR, real-time features)
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';

            # Forward original client information to the app
            proxy_set_header Host $host;                           # Original domain
            proxy_set_header X-Real-IP $remote_addr;               # Client IP
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  # Proxy chain
            proxy_set_header X-Forwarded-Proto $scheme;            # http or https

            # Don't cache WebSocket connections
            proxy_cache_bypass $http_upgrade;
        }
    }

    # -------------------------------------------------------------------------
    # Admin Dashboard Server (admin.funmagic.ai)
    # -------------------------------------------------------------------------
    server {
        listen 443 ssl;
        server_name admin.funmagic.ai;

        # Same SSL certificates (wildcard covers *.funmagic.ai)
        ssl_certificate /etc/nginx/ssl/origin.pem;
        ssl_certificate_key /etc/nginx/ssl/origin.key;

        location / {
            # Forward requests to the admin upstream
            proxy_pass http://admin;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

### 9.7.1 Prerequisites: Next.js Standalone Output

**IMPORTANT**: The Dockerfiles require Next.js standalone output mode. Add this to both `next.config.ts` files:

**`apps/web/next.config.ts`**:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',  // Required for Docker deployment
  // ... other config (images, etc.)
};
```

**`apps/admin/next.config.ts`**:
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',  // Required for Docker deployment
  transpilePackages: ['@magiworld/db', '@magiworld/types', '@magiworld/utils'],
  // ... other config
};
```

This setting makes Next.js:
- Bundle all dependencies into `.next/standalone/`
- Create a minimal `server.js` that doesn't need `node_modules`
- Reduce Docker image size from ~1GB to ~150MB

### 9.7.2 ARM64 Architecture Support (AWS Graviton / Apple Silicon)

The Dockerfiles work on both AMD64 (x86_64) and ARM64 (aarch64) architectures without modification. Here's what you need to know:

**Why ARM64?**
- **AWS Graviton** (t4g, m7g, c7g instances): Up to 40% better price-performance than x86
- **Apple Silicon** (M1/M2/M3): Native development on Mac

**Compatibility Notes:**

| Component | ARM64 Compatible | Notes |
|-----------|------------------|-------|
| `node:20-alpine` | ✅ Yes | Multi-arch image (amd64, arm64) |
| `nginx:alpine` | ✅ Yes | Multi-arch image |
| `libc6-compat` | ✅ Yes | Available on ARM64 Alpine |
| `pnpm` | ✅ Yes | Pure JavaScript |
| `drizzle-orm` | ✅ Yes | Pure JavaScript |
| `@aws-sdk/*` | ✅ Yes | Pure JavaScript |
| `next` | ✅ Yes | Pure JavaScript |

**Building for ARM64:**

Option 1: **Build on ARM64 instance** (recommended for production)
```bash
# SSH to your ARM64 EC2 instance (t4g.medium, etc.)
# Build normally - Docker auto-detects architecture
docker-compose up -d --build
```

Option 2: **Cross-compile from AMD64/x86** (for testing)
```bash
# Specify target platform in docker-compose.yml
# Add under each service that needs building:
services:
  web:
    platform: linux/arm64  # Add this line
    build:
      context: .
      dockerfile: Dockerfile.web
```

Or build with platform flag:
```bash
docker-compose build --platform linux/arm64
```

Option 3: **Multi-arch build with buildx** (for registries)
```bash
# Create multi-arch builder
docker buildx create --name multiarch --use

# Build and push to registry (supports both architectures)
docker buildx build --platform linux/amd64,linux/arm64 \
  -t your-registry/funmagic-web:latest \
  -f Dockerfile.web --push .
```

**EC2 Instance Types for ARM64:**

| Type | vCPU | RAM | Use Case |
|------|------|-----|----------|
| t4g.micro | 2 | 1 GB | Testing |
| t4g.small | 2 | 2 GB | Light production |
| t4g.medium | 2 | 4 GB | Recommended for start |
| t4g.large | 2 | 8 GB | Production with headroom |

> **Note**: When using ARM64 instances, make sure to select an ARM64-compatible AMI (e.g., "Amazon Linux 2023 ARM" or "Ubuntu 22.04 LTS ARM").

### 9.8 Create Environment Files

**Create `.env.web`**:

```bash
DATABASE_URL=postgresql://user:password@your-db-host:5432/funmagic
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_WEB_PRIVATE_BUCKET=funmagic-web-users-assets-private
S3_WEB_SHARED_BUCKET=funmagic-web-users-assets-shared
S3_PUBLIC_ASSETS_BUCKET=funmagic-web-public-assets
CLOUDFRONT_WEB_PRIVATE_URL=https://dXXXX.cloudfront.net
CLOUDFRONT_WEB_SHARED_URL=https://shared.funmagic.ai
CLOUDFRONT_PUBLIC_URL=https://cdn.funmagic.ai
CLOUDFRONT_KEY_PAIR_ID=K2XXXXXX
CLOUDFRONT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
CLOUDFRONT_SIGNED_URL_EXPIRY=3600
LOGTO_ENDPOINT=https://your-tenant.logto.app/
LOGTO_APP_ID=your-app-id
LOGTO_APP_SECRET=your-app-secret
LOGTO_COOKIE_SECRET=random-32-char-string
LOGTO_BASE_URL=https://funmagic.ai
# Redis - ElastiCache endpoint (with TLS)
REDIS_URL=rediss://funmagic-redis.abc123.use2.cache.amazonaws.com:6379
REDIS_TLS=true
```

**Create `.env.admin`**:

```bash
DATABASE_URL=postgresql://user:password@your-db-host:5432/funmagic
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_ADMIN_ASSETS_BUCKET=funmagic-admin-users-assets
S3_PUBLIC_ASSETS_BUCKET=funmagic-web-public-assets
# S3_ENV_PREFIX auto-detects 'prod' from NODE_ENV=production
CLOUDFRONT_ADMIN_PRIVATE_URL=https://dXXXX.cloudfront.net
CLOUDFRONT_PUBLIC_URL=https://cdn.funmagic.ai
CLOUDFRONT_KEY_PAIR_ID=K2XXXXXX
CLOUDFRONT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
CLOUDFRONT_SIGNED_URL_EXPIRY=3600
LOGTO_ENDPOINT=https://your-admin-tenant.logto.app/
LOGTO_APP_ID=your-admin-app-id
LOGTO_APP_SECRET=your-admin-app-secret
LOGTO_COOKIE_SECRET=random-32-char-string-for-admin
LOGTO_BASE_URL=https://admin.funmagic.ai
# Redis - ElastiCache endpoint (with TLS)
REDIS_URL=rediss://funmagic-redis.abc123.use2.cache.amazonaws.com:6379
REDIS_TLS=true
QUEUE_PREFIX=admin
```

**Create `.env.worker`**:

```bash
# Database (same as web app)
DATABASE_URL=postgresql://user:password@your-db-host:5432/funmagic

# Redis - ElastiCache endpoint (with TLS)
REDIS_URL=rediss://funmagic-redis.abc123.use2.cache.amazonaws.com:6379
REDIS_TLS=true
# Leave empty for web tasks, set to "admin" for admin-only worker
QUEUE_PREFIX=

# AWS S3 (for uploading task results)
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_WEB_PRIVATE_BUCKET=funmagic-web-users-assets-private
CLOUDFRONT_WEB_PRIVATE_URL=https://dXXXX.cloudfront.net

# Worker Configuration
WORKER_CONCURRENCY=5           # Number of parallel jobs per queue
LOG_LEVEL=info                 # debug, info, warn, error
```

> **Note**: AI provider API keys (FAL, OpenAI, Google) are loaded from the database (`providers` table for web, `adminProviders` table for admin). Configure them in the Admin dashboard under Providers, not in environment variables.

> **Note**: For running separate admin worker, create `.env.worker.admin` with `QUEUE_PREFIX=admin` and start a second worker container.

### 9.9 Set Up SSL Certificates

You have two options for SSL certificates. **Option A (Cloudflare Origin Certificate)** is recommended if you're using Cloudflare proxy.

#### Comparison

| Feature | Cloudflare Origin Cert | Let's Encrypt |
|---------|----------------------|---------------|
| **Validity** | 15 years | 90 days |
| **Renewal** | None needed | Auto-renew required |
| **Setup** | Simple (download files) | Complex (certbot) |
| **Wildcard** | ✅ Yes (free) | ❌ Requires DNS challenge |
| **Works without Cloudflare** | ❌ No | ✅ Yes |
| **Trust** | Cloudflare only | Publicly trusted |

---

#### Option A: Cloudflare Origin Certificate (Recommended)

This creates a certificate trusted by Cloudflare for the connection between Cloudflare and your server. Combined with Cloudflare's edge SSL, you get full end-to-end encryption.

**Step 1: Configure Cloudflare SSL Mode**

1. Go to **Cloudflare Dashboard** → Your domain → **SSL/TLS** → **Overview**
2. Set encryption mode to: **Full (strict)**

```
┌──────────────┐      HTTPS       ┌──────────────┐      HTTPS       ┌──────────────┐
│   Browser    │ ◄──────────────► │  Cloudflare  │ ◄──────────────► │   Server     │
│              │   Edge SSL       │   (Proxy)    │   Origin Cert    │   (Nginx)    │
└──────────────┘   (auto)         └──────────────┘                  └──────────────┘
```

**Step 2: Create Origin Certificate**

1. Go to **SSL/TLS** → **Origin Server** → **Create Certificate**
2. Configure:
   - **Private key type**: RSA (2048)
   - **Hostnames**:
     - `funmagic.ai`
     - `*.funmagic.ai` (wildcard - covers www, admin, etc.)
   - **Validity**: 15 years
3. Click **Create**
4. **IMPORTANT**: Download both files immediately (private key is shown only once!):
   - `origin.pem` (Certificate)
   - `origin.key` (Private Key)

**Step 3: Install Certificate on Server**

```bash
# Create SSL directory
mkdir -p ~/funmagic/ssl

# Upload the certificate files to your server
# Option 1: SCP from your local machine
scp origin.pem origin.key ec2-user@YOUR_EC2_IP:~/funmagic/ssl/

# Option 2: Copy-paste content (if SCP not available)
nano ~/funmagic/ssl/origin.pem   # Paste certificate content
nano ~/funmagic/ssl/origin.key   # Paste private key content

# Set proper permissions
chmod 600 ~/funmagic/ssl/origin.key
chmod 644 ~/funmagic/ssl/origin.pem
```

**Step 4: Update nginx.conf for Cloudflare Origin Cert**

Update the SSL certificate paths in your `nginx.conf`:

```nginx
# In both server blocks (funmagic.ai and admin.funmagic.ai):
ssl_certificate /etc/nginx/ssl/origin.pem;
ssl_certificate_key /etc/nginx/ssl/origin.key;
```

**Step 5: Update docker-compose.yml volume mount**

The volume mount should map to the new files:
```yaml
volumes:
  - ./ssl:/etc/nginx/ssl:ro  # origin.pem and origin.key should be in ./ssl/
```

**Done!** No renewal needed for 15 years.

---

#### Option B: Let's Encrypt (Alternative)

Use this if you need certificates that work without Cloudflare proxy, or for other services.

```bash
# Install Certbot
sudo dnf install certbot -y  # Amazon Linux
# sudo apt install certbot -y  # Ubuntu

# IMPORTANT: Temporarily set Cloudflare DNS to "DNS only" (grey cloud)
# Let's Encrypt needs to reach your server directly on port 80

# Stop nginx temporarily (if running)
docker-compose stop nginx 2>/dev/null || true

# Get certificates
sudo certbot certonly --standalone \
  -d funmagic.ai \
  -d www.funmagic.ai \
  -d admin.funmagic.ai \
  --email magify@funmagic.ai \
  --agree-tos

# Copy certificates to your project
mkdir -p ~/funmagic/ssl
sudo cp /etc/letsencrypt/live/funmagic.ai/fullchain.pem ~/funmagic/ssl/
sudo cp /etc/letsencrypt/live/funmagic.ai/privkey.pem ~/funmagic/ssl/
sudo chown -R $USER:$USER ~/funmagic/ssl

# IMPORTANT: Re-enable Cloudflare proxy (orange cloud) after success
```

**Set up auto-renewal** (required - certificates expire in 90 days):

```bash
# Create renewal script
cat > ~/funmagic/renew-ssl.sh << 'EOF'
#!/bin/bash
cd ~/funmagic
docker-compose stop nginx
sudo certbot renew --quiet
sudo cp /etc/letsencrypt/live/funmagic.ai/fullchain.pem ~/funmagic/ssl/
sudo cp /etc/letsencrypt/live/funmagic.ai/privkey.pem ~/funmagic/ssl/
sudo chown -R $USER:$USER ~/funmagic/ssl
docker-compose start nginx
EOF

chmod +x ~/funmagic/renew-ssl.sh

# Add to crontab (runs monthly at 3 AM on the 1st)
(crontab -l 2>/dev/null; echo "0 3 1 * * ~/funmagic/renew-ssl.sh") | crontab -
```

> **Note**: For Let's Encrypt with Cloudflare proxy enabled, you need to use the DNS challenge method instead of standalone. This is more complex and requires Cloudflare API tokens.

### 9.10 Update Cloudflare DNS

Point your domains to the EC2 Elastic IP:

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A | `@` | `YOUR_ELASTIC_IP` | Proxied (orange) |
| A | `www` | `YOUR_ELASTIC_IP` | Proxied (orange) |
| A | `admin` | `YOUR_ELASTIC_IP` | Proxied (orange) |

> **Note**: Using A records (not CNAME) because we have a static Elastic IP.

### 9.11 Cost Estimate

**Minimal EC2 setup**:
- 1x t3.small EC2 (On-Demand): ~$15/month
- Elastic IP (while attached): Free
- 20GB EBS storage: ~$2/month
- Data transfer: ~$5/month
- **Total: ~$22/month**

**Even cheaper options**:
- Use t3.micro: ~$8/month (free tier eligible for 12 months)
- Use Spot instance: 60-90% savings (can be interrupted)
- Reserved instance (1 year): 30-40% savings

### 9.12 Future Migration to ECS

When you're ready to scale, you can migrate to ECS:
1. Push your Docker images to ECR
2. Create ECS task definitions using the same Dockerfiles
3. Set up an Application Load Balancer
4. Create ECS services
5. Update Cloudflare DNS to point to ALB

The Dockerfiles you created here will work directly with ECS.

---

