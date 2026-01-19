## 步骤 9：使用 Docker 部署到 AWS EC2

本指南使用**简单的 EC2 + Docker** 方案以便于设置。您可以在需要时稍后迁移到 ECS。

### 9.1 前置要求

- 已配置 AWS CLI
- 在 AWS EC2 控制台创建 SSH 密钥对
- Docker 镜像准备就绪（我们将在 EC2 上构建它们）

### 9.2 创建安全组

1. 进入 **EC2** → **Security Groups** → **Create security group**
2. **名称**：`funmagic-ec2-sg`
3. **描述**：Funmagic EC2 实例的安全组
4. **VPC**：默认 VPC（或您的 VPC）
5. **入站规则**：

| 类型 | 端口 | 来源 | 描述 |
|------|------|------|------|
| SSH | 22 | 您的 IP | SSH 访问 |
| HTTP | 80 | 0.0.0.0/0 | Web 流量 |
| HTTPS | 443 | 0.0.0.0/0 | 安全 Web 流量 |

6. **出站规则**：保持默认（允许所有流量）
7. 点击 **Create security group**

### 9.3 启动 EC2 实例

1. 进入 **EC2** → **Instances** → **Launch instances**
2. **名称**：`funmagic-server`
3. **AMI**：Amazon Linux 2023（或 Ubuntu 22.04 LTS）
4. **实例类型**：`t3.small`（2 vCPU，2GB RAM）- 可以运行两个应用
   - 更低成本：`t3.micro`（1 vCPU，1GB RAM）- 紧凑但可用
5. **密钥对**：选择您的 SSH 密钥对
6. **网络设置**：
   - **VPC**：默认 VPC
   - **子网**：任意公共子网
   - **自动分配公共 IP**：启用
   - **安全组**：选择 `funmagic-ec2-sg`
7. **存储**：20 GB gp3（默认即可）
8. 点击 **Launch instance**

### 9.4 分配弹性 IP（推荐）

弹性 IP 确保您的服务器 IP 在重启时不会更改：

1. 进入 **EC2** → **Elastic IPs** → **Allocate Elastic IP address**
2. 点击 **Allocate**
3. 选择新 IP → **Actions** → **Associate Elastic IP address**
4. **实例**：选择 `funmagic-server`
5. 点击 **Associate**

> 记录弹性 IP 地址（例如 `3.15.xxx.xxx`）- 您将用它来配置 DNS。

### 9.5 连接到 EC2 并安装 Docker

```bash
# SSH into your instance
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP

# For Ubuntu: ssh -i your-key.pem ubuntu@YOUR_ELASTIC_IP
```

**安装 Docker（Amazon Linux 2023）**：

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

**安装 Docker（Ubuntu）**：

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

### 9.6 在 EC2 上设置项目

重新 SSH 登录并设置您的项目：

```bash
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP

# Create app directory
mkdir -p ~/funmagic
cd ~/funmagic

# Install git
sudo dnf install git -y  # Amazon Linux
# sudo apt install git -y  # Ubuntu
```

### 9.7 创建 Docker 文件

在 `~/funmagic` 中**创建 `docker-compose.yml`**：
nano docker-compose.yml


```yaml
# =============================================================================
# Docker Compose Configuration for Magiworld
# =============================================================================
# 本文件定义了 4 个一起运行的服务：
# 1. web    - 面向用户的 Next.js 前端（端口 3000）
# 2. admin  - Next.js 管理后台（端口 3001）
# 3. worker - 处理 AI 任务的 BullMQ 工作进程
# 4. nginx  - 处理 SSL 和路由的反向代理（端口 80, 443）
#
# 架构：
#   互联网 → Nginx (SSL 终止) → web/admin 容器 → RDS 数据库
#   web/admin → Redis (任务队列) → worker → AI 服务商 → Redis (结果)
#
# 命令：
#   docker-compose up -d --build    # 构建并启动所有服务
#   docker-compose logs -f web      # 查看 web 应用日志
#   docker-compose logs -f worker   # 查看 worker 日志
#   docker-compose restart web      # 重启特定服务
#   docker-compose down             # 停止并删除所有容器
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
  # Worker Service (BullMQ 任务处理器)
  # ---------------------------------------------------------------------------
  # 处理队列中的 AI 任务：
  # - 图像生成 (Flux, DALL-E)
  # - 背景移除 (BRIA RMBG)
  # - 图像放大等
  worker:
    build:
      context: .
      dockerfile: Dockerfile.worker
    container_name: funmagic-worker
    restart: unless-stopped
    environment:
      - NODE_ENV=production
    env_file:
      - .env.worker                 # Worker 配置（Redis、AI 密钥等）
    logging: *default-logging
    deploy:
      resources:
        limits:
          memory: 1G  # Worker 内存限制
    # 不暴露端口 - Worker 只对外连接 Redis 和 AI API

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

**创建 `Dockerfile.web`**：
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

**创建 `Dockerfile.admin`**：

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

**创建 `Dockerfile.worker`**：
nano Dockerfile.worker

```dockerfile
# =============================================================================
# Multi-Stage Dockerfile for BullMQ Worker Application
# BullMQ 工作进程的多阶段 Dockerfile
# =============================================================================
# 本 Dockerfile 构建从 Redis 处理 AI 任务的 Worker 服务。
#
# 与 web/admin Dockerfile 的主要区别：
# - 构建 apps/worker（Node.js 应用，非 Next.js）
# - 不暴露端口（Worker 只进行出站连接）
# - 持续运行处理队列任务
# - 运行时需要 AI 服务商 API 密钥
#
# Worker 功能：
# - 连接 Redis 接收 BullMQ 队列中的任务
# - 调用 AI 服务商（Fal.ai、OpenAI 等）处理任务
# - 将结果上传到 S3
# - 通过 Redis Pub/Sub 发布状态更新
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

# 复制 worker 所需的所有工作区包的 package 文件
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

# 复制依赖和源代码
COPY --from=deps /app ./
COPY . .

# 构建时跳过环境变量验证
ENV SKIP_ENV_VALIDATION=true

# 构建 worker 应用（TypeScript 编译）
RUN corepack enable pnpm && pnpm --filter @magiworld/worker build

# -----------------------------------------------------------------------------
# Stage 4: Runner (Production)
# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# 为安全创建非 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 worker

# 复制构建好的 worker 文件
# Worker 使用 dist/ 目录中编译好的 JS
COPY --from=builder --chown=worker:nodejs /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder --chown=worker:nodejs /app/apps/worker/package.json ./apps/worker/

# 复制工作区依赖（解析符号链接后的 node_modules）
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/packages ./packages

USER worker

# 不需要端口 - Worker 只对外连接
# Redis (ElastiCache) 和 AI API

# 启动 worker
CMD ["node", "apps/worker/dist/index.js"]
```

**创建 `nginx.conf`**：
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

### 9.7.1 前置条件：Next.js 独立输出模式

**重要提示**：Dockerfile 需要 Next.js 独立输出模式。将以下内容添加到两个 `next.config.ts` 文件中：

**`apps/web/next.config.ts`**：
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',  // Required for Docker deployment
  // ... other config (images, etc.)
};
```

**`apps/admin/next.config.ts`**：
```typescript
const nextConfig: NextConfig = {
  output: 'standalone',  // Required for Docker deployment
  transpilePackages: ['@magiworld/db', '@magiworld/types', '@magiworld/utils'],
  // ... other config
};
```

此设置使 Next.js：
- 将所有依赖项打包到 `.next/standalone/`
- 创建一个不需要 `node_modules` 的最小化 `server.js`
- 将 Docker 镜像大小从约 1GB 减少到约 150MB

### 9.7.2 ARM64 架构支持（AWS Graviton / Apple Silicon）

这些 Dockerfile 无需修改即可在 AMD64 (x86_64) 和 ARM64 (aarch64) 架构上运行。以下是您需要了解的内容：

**为什么选择 ARM64？**
- **AWS Graviton**（t4g、m7g、c7g 实例）：比 x86 高达 40% 的性价比
- **Apple Silicon**（M1/M2/M3）：Mac 上的原生开发

**兼容性说明：**

| 组件 | ARM64 兼容 | 备注 |
|------|------------|------|
| `node:20-alpine` | ✅ 是 | 多架构镜像（amd64、arm64） |
| `nginx:alpine` | ✅ 是 | 多架构镜像 |
| `libc6-compat` | ✅ 是 | ARM64 Alpine 可用 |
| `pnpm` | ✅ 是 | 纯 JavaScript |
| `drizzle-orm` | ✅ 是 | 纯 JavaScript |
| `@aws-sdk/*` | ✅ 是 | 纯 JavaScript |
| `next` | ✅ 是 | 纯 JavaScript |

**为 ARM64 构建：**

选项 1：**在 ARM64 实例上构建**（推荐用于生产环境）
```bash
# SSH to your ARM64 EC2 instance (t4g.medium, etc.)
# Build normally - Docker auto-detects architecture
docker-compose up -d --build
```

选项 2：**从 AMD64/x86 交叉编译**（用于测试）
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

或使用平台标志构建：
```bash
docker-compose build --platform linux/arm64
```

选项 3：**使用 buildx 进行多架构构建**（用于镜像仓库）
```bash
# Create multi-arch builder
docker buildx create --name multiarch --use

# Build and push to registry (supports both architectures)
docker buildx build --platform linux/amd64,linux/arm64 \
  -t your-registry/funmagic-web:latest \
  -f Dockerfile.web --push .
```

**ARM64 的 EC2 实例类型：**

| 类型 | vCPU | RAM | 用途 |
|------|------|-----|------|
| t4g.micro | 2 | 1 GB | 测试 |
| t4g.small | 2 | 2 GB | 轻量生产环境 |
| t4g.medium | 2 | 4 GB | 推荐起步配置 |
| t4g.large | 2 | 8 GB | 生产环境（有余量） |

> **注意**：使用 ARM64 实例时，请确保选择 ARM64 兼容的 AMI（例如"Amazon Linux 2023 ARM"或"Ubuntu 22.04 LTS ARM"）。

### 9.8 创建环境变量文件

**创建 `.env.web`**：

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
# Redis - ElastiCache 端点（启用 TLS）
REDIS_URL=rediss://funmagic-redis.abc123.use2.cache.amazonaws.com:6379
REDIS_TLS=true
```

**创建 `.env.admin`**：

```bash
DATABASE_URL=postgresql://user:password@your-db-host:5432/funmagic
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_ADMIN_ASSETS_BUCKET=funmagic-admin-users-assets
S3_PUBLIC_ASSETS_BUCKET=funmagic-web-public-assets
# S3_ENV_PREFIX 从 NODE_ENV=production 自动检测为 'prod'
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
# Redis - ElastiCache 端点（启用 TLS）
REDIS_URL=rediss://funmagic-redis.abc123.use2.cache.amazonaws.com:6379
REDIS_TLS=true
QUEUE_PREFIX=admin
```

**创建 `.env.worker`**：

```bash
# 数据库（与 web 应用相同）
DATABASE_URL=postgresql://user:password@your-db-host:5432/funmagic

# Redis - ElastiCache 端点（启用 TLS）
REDIS_URL=rediss://funmagic-redis.abc123.use2.cache.amazonaws.com:6379
REDIS_TLS=true
# 留空处理 web 任务，设为 "admin" 处理 admin 任务
QUEUE_PREFIX=

# AWS S3（用于上传任务结果）
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
S3_WEB_PRIVATE_BUCKET=funmagic-web-users-assets-private
CLOUDFRONT_WEB_PRIVATE_URL=https://dXXXX.cloudfront.net

# Worker 配置
WORKER_CONCURRENCY=5           # 每个队列的并行任务数
LOG_LEVEL=info                 # debug, info, warn, error
```

> **注意**：AI 服务商 API 密钥（FAL、OpenAI、Google）从数据库加载（web 任务用 `providers` 表，admin 任务用 `adminProviders` 表）。请在管理后台的"提供商"页面配置，不要在环境变量中设置。

> **注意**：如需运行单独的 admin worker，创建 `.env.worker.admin` 并设置 `QUEUE_PREFIX=admin`，然后启动第二个 worker 容器。

### 9.9 设置 SSL 证书

您有两个 SSL 证书选项。如果您使用 Cloudflare 代理，推荐使用**选项 A（Cloudflare 源证书）**。

#### 对比

| 特性 | Cloudflare 源证书 | Let's Encrypt |
|------|-------------------|---------------|
| **有效期** | 15 年 | 90 天 |
| **续期** | 无需 | 需要自动续期 |
| **设置** | 简单（下载文件） | 复杂（certbot） |
| **通配符** | ✅ 是（免费） | ❌ 需要 DNS 验证 |
| **无 Cloudflare 可用** | ❌ 否 | ✅ 是 |
| **信任** | 仅 Cloudflare | 公开信任 |

---

#### 选项 A：Cloudflare 源证书（推荐）

这将创建一个受 Cloudflare 信任的证书，用于 Cloudflare 与您服务器之间的连接。结合 Cloudflare 的边缘 SSL，您可以获得完整的端到端加密。

**第 1 步：配置 Cloudflare SSL 模式**

1. 进入 **Cloudflare 控制面板** → 您的域名 → **SSL/TLS** → **Overview**
2. 将加密模式设置为：**Full (strict)**

```
┌──────────────┐      HTTPS       ┌──────────────┐      HTTPS       ┌──────────────┐
│   Browser    │ ◄──────────────► │  Cloudflare  │ ◄──────────────► │   Server     │
│              │   Edge SSL       │   (Proxy)    │   Origin Cert    │   (Nginx)    │
└──────────────┘   (auto)         └──────────────┘                  └──────────────┘
```

**第 2 步：创建源证书**

1. 进入 **SSL/TLS** → **Origin Server** → **Create Certificate**
2. 配置：
   - **私钥类型**：RSA (2048)
   - **主机名**：
     - `funmagic.ai`
     - `*.funmagic.ai`（通配符 - 涵盖 www、admin 等）
   - **有效期**：15 年
3. 点击 **Create**
4. **重要提示**：立即下载两个文件（私钥只显示一次！）：
   - `origin.pem`（证书）
   - `origin.key`（私钥）

**第 3 步：在服务器上安装证书**

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

**第 4 步：更新 nginx.conf 以使用 Cloudflare 源证书**

更新 `nginx.conf` 中的 SSL 证书路径：

```nginx
# In both server blocks (funmagic.ai and admin.funmagic.ai):
ssl_certificate /etc/nginx/ssl/origin.pem;
ssl_certificate_key /etc/nginx/ssl/origin.key;
```

**第 5 步：更新 docker-compose.yml 卷挂载**

卷挂载应映射到新文件：
```yaml
volumes:
  - ./ssl:/etc/nginx/ssl:ro  # origin.pem 和 origin.key 应在 ./ssl/ 中
```

**完成！** 15 年内无需续期。

---

#### 选项 B：Let's Encrypt（备选方案）

如果您需要在没有 Cloudflare 代理的情况下使用证书，或用于其他服务，请使用此选项。

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

**设置自动续期**（必需 - 证书 90 天后过期）：

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

> **注意**：如果启用了 Cloudflare 代理并使用 Let's Encrypt，您需要使用 DNS 验证方法而不是独立模式。这更复杂，需要 Cloudflare API 令牌。

### 9.10 更新 Cloudflare DNS

将您的域名指向 EC2 弹性 IP：

| 类型 | 名称 | 内容 | 代理 |
|------|------|------|------|
| A | `@` | `YOUR_ELASTIC_IP` | 已代理（橙色） |
| A | `www` | `YOUR_ELASTIC_IP` | 已代理（橙色） |
| A | `admin` | `YOUR_ELASTIC_IP` | 已代理（橙色） |

> **注意**：使用 A 记录（而非 CNAME），因为我们有静态弹性 IP。

### 9.11 成本估算

**最小 EC2 配置**：
- 1x t3.small EC2（按需）：约 $15/月
- 弹性 IP（已关联时）：免费
- 20GB EBS 存储：约 $2/月
- 数据传输：约 $5/月
- **总计：约 $22/月**

**更便宜的选项**：
- 使用 t3.micro：约 $8/月（12 个月免费套餐资格）
- 使用 Spot 实例：节省 60-90%（可能被中断）
- 预留实例（1 年）：节省 30-40%

### 9.12 未来迁移到 ECS

当您准备好扩展时，可以迁移到 ECS：
1. 将 Docker 镜像推送到 ECR
2. 使用相同的 Dockerfile 创建 ECS 任务定义
3. 设置应用程序负载均衡器
4. 创建 ECS 服务
5. 更新 Cloudflare DNS 指向 ALB

您在此处创建的 Dockerfile 可直接用于 ECS。

---

