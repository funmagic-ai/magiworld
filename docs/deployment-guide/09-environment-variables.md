## Step 12: Configure Environment Variables

### For Local Development

**Admin App (`apps/admin/.env.local`)**:

```bash
# ==============================================
# Database
# ==============================================
# PostgreSQL connection string
# For local: localhost:5432 or your Docker port
# For RDS: your-rds-endpoint.region.rds.amazonaws.com:5432
DATABASE_URL=postgresql://user:password@localhost:5432/magi-db

# ==============================================
# AWS S3 Configuration (funmagic-admin-app IAM user)
# ==============================================
AWS_REGION=us-east-2

# From IAM > Users > funmagic-admin-app > Security credentials > Access keys
AWS_ACCESS_KEY_ID=AKIA...your-admin-key
AWS_SECRET_ACCESS_KEY=...your-admin-secret

# ==============================================
# S3 Buckets
# ==============================================
# Admin uploads (library, Magi-generated files) - private with signed URLs
S3_ADMIN_ASSETS_BUCKET=funmagic-admin-users-assets
# Public assets (banners, tool thumbnails) - publicly accessible
S3_PUBLIC_ASSETS_BUCKET=funmagic-web-public-assets

# ==============================================
# S3 Environment Prefix (Optional)
# ==============================================
# Separates files by environment in the same bucket.
# Auto-detects from NODE_ENV if not set:
#   - NODE_ENV=production → 'prod'
#   - NODE_ENV=test → 'test'
#   - Otherwise → 'dev'
# All uploads will be prefixed: e.g., 'dev/banners/image.jpg'
# Set explicitly for staging/uat environments:
# S3_ENV_PREFIX=staging

# ==============================================
# CloudFront URLs
# ==============================================
# Private distribution for admin assets (requires signed URLs)
CLOUDFRONT_ADMIN_PRIVATE_URL=https://d1234admin.cloudfront.net
# Public CDN for banners and tool images
CLOUDFRONT_PUBLIC_URL=https://cdn.funmagic.ai
# Client-side accessible public CDN URL (same as CLOUDFRONT_PUBLIC_URL)
NEXT_PUBLIC_CLOUDFRONT_URL=https://cdn.funmagic.ai

# ==============================================
# CloudFront Signed URLs (for private bucket access)
# ==============================================
# From CloudFront > Key management > Public keys
CLOUDFRONT_KEY_PAIR_ID=K2XXXXXXXXXXXXXX
# Private key (single line with \n escapes)
# Generate with: awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' cloudfront-private-key.pem
CLOUDFRONT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...your-key...==\n-----END PRIVATE KEY-----\n"
# URL expiry in seconds (default: 1 hour)
CLOUDFRONT_SIGNED_URL_EXPIRY=3600

# ==============================================
# Authentication (Logto - Admin Tenant)
# ==============================================
# Admin app uses a separate Logto tenant/application from web app
LOGTO_ENDPOINT=https://your-admin-tenant.logto.app/
LOGTO_APP_ID=your-admin-app-id
LOGTO_APP_SECRET=your-admin-app-secret
LOGTO_COOKIE_SECRET=random-32-char-string-for-admin
LOGTO_BASE_URL=https://admin.funmagic.ai

# ==============================================
# AI APIs - NOT NEEDED IN ENV
# ==============================================
# AI provider API keys (FAL, OpenAI, Google) are loaded from the database:
# - Web tasks: `providers` table
# - Admin tasks: `adminProviders` table
# Configure them in the Admin dashboard under "Providers" section.
# Do NOT add FAL_API_KEY, OPENAI_API_KEY, etc. here.

# ==============================================
# Redis (Task Queue for Magi Tools)
# ==============================================
# ElastiCache Redis endpoint for BullMQ task queue
# Format: redis://host:port or rediss://host:port (for TLS)
# For local development: redis://localhost:6379
# For production: rediss://your-elasticache-endpoint:6379
REDIS_URL=redis://localhost:6379
# Enable TLS for production (use 'true' with rediss:// URLs)
REDIS_TLS=false
# Queue prefix for admin isolation (separates admin jobs from web jobs)
QUEUE_PREFIX=admin

# ==============================================
# Upload Limits
# ==============================================
# Maximum file upload size in MB (server-side validation)
UPLOAD_MAX_SIZE_MB=50
# Maximum file upload size in MB (client-side validation)
NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB=50

# ==============================================
# Debug (optional)
# ==============================================
# Log level: debug, info, warn, error
LOG_LEVEL=info
```

**Web App (`apps/web/.env.local`)**:

```bash
# ==============================================
# Database
# ==============================================
# PostgreSQL connection string
# For local: localhost:5432 or your Docker port
# For RDS: your-rds-endpoint.region.rds.amazonaws.com:5432
DATABASE_URL=postgresql://user:password@localhost:5432/magi-db

# ==============================================
# AWS S3 Configuration (funmagic-web-app IAM user)
# ==============================================
AWS_REGION=us-east-2

# From IAM > Users > funmagic-web-app > Security credentials > Access keys
AWS_ACCESS_KEY_ID=AKIA...your-web-key
AWS_SECRET_ACCESS_KEY=...your-web-secret

# ==============================================
# S3 Buckets
# ==============================================
# User uploads and AI results - private with signed URLs
S3_WEB_PRIVATE_BUCKET=funmagic-web-users-assets-private
# User-shared files (public download links)
S3_WEB_SHARED_BUCKET=funmagic-web-users-assets-shared

# ==============================================
# CloudFront URLs
# ==============================================
# Private distribution for user assets (requires signed URLs)
CLOUDFRONT_WEB_PRIVATE_URL=https://d5678private.cloudfront.net
# Public distribution for shared files
CLOUDFRONT_WEB_SHARED_URL=https://shared.funmagic.ai
# Public CDN for banners and tool images (same as admin)
CLOUDFRONT_PUBLIC_URL=https://cdn.funmagic.ai

# ==============================================
# CloudFront Signed URLs (for private bucket access)
# ==============================================
# From CloudFront > Key management > Public keys
CLOUDFRONT_KEY_PAIR_ID=K2XXXXXXXXXXXXXX
# Private key (single line with \n escapes)
# Generate with: awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' cloudfront-private-key.pem
CLOUDFRONT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...your-key...==\n-----END PRIVATE KEY-----\n"
# URL expiry in seconds (default: 1 hour)
CLOUDFRONT_SIGNED_URL_EXPIRY=3600

# ==============================================
# Authentication (Logto - Web Tenant)
# ==============================================
# Web app uses a separate Logto tenant/application from admin app
LOGTO_ENDPOINT=https://your-web-tenant.logto.app/
LOGTO_APP_ID=your-web-app-id
LOGTO_APP_SECRET=your-web-app-secret
LOGTO_COOKIE_SECRET=random-32-char-string-for-web
# Production URL (must match Logto redirect URI settings)
LOGTO_BASE_URL=https://funmagic.ai

# ==============================================
# Redis (Task Queue)
# ==============================================
# ElastiCache Redis endpoint for BullMQ task queue
# Format: redis://host:port or rediss://host:port (for TLS)
REDIS_URL=rediss://funmagic-redis.abc123.use2.cache.amazonaws.com:6379

# Optional: Separate Redis for different purposes (Future Scaling)
# REDIS_QUEUE_URL=rediss://redis-queue.abc123.use2.cache.amazonaws.com:6379
# REDIS_PUBSUB_URL=rediss://redis-pubsub.abc123.use2.cache.amazonaws.com:6379
# REDIS_TLS=true  # Force TLS when using redis:// URLs

# ==============================================
# Upload Limits
# ==============================================
# Maximum file upload size in MB (server-side validation)
UPLOAD_MAX_SIZE_MB=50
# Maximum file upload size in MB (client-side validation)
NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB=50
```

**Worker (`apps/worker/.env.local`)**:

```bash
# ==============================================
# Database
# ==============================================
# PostgreSQL connection string (same as web app)
DATABASE_URL=postgresql://user:password@localhost:5432/magi-db

# ==============================================
# Redis (Task Queue)
# ==============================================
# ElastiCache Redis endpoint for BullMQ task queue
# Format: redis://host:port or rediss://host:port (for TLS)
REDIS_URL=rediss://funmagic-redis.abc123.use2.cache.amazonaws.com:6379

# Optional: Separate Redis for different purposes (Future Scaling)
# REDIS_QUEUE_URL=rediss://redis-queue.abc123.use2.cache.amazonaws.com:6379
# REDIS_PUBSUB_URL=rediss://redis-pubsub.abc123.use2.cache.amazonaws.com:6379
# REDIS_TLS=true  # Force TLS when using redis:// URLs

# Queue prefix for isolation (leave empty for web, set to "admin" for admin worker)
# QUEUE_PREFIX=admin

# ==============================================
# AWS S3 Configuration (funmagic-web-app IAM user)
# ==============================================
# Worker uses same credentials as web app for uploading task results
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=AKIA...your-web-key
AWS_SECRET_ACCESS_KEY=...your-web-secret

# ==============================================
# S3 Buckets (Task Results)
# ==============================================
# Private bucket for task output (AI-generated images, etc.)
S3_WEB_PRIVATE_BUCKET=funmagic-web-users-assets-private

# ==============================================
# CloudFront (for result URLs)
# ==============================================
# Private distribution for task results
CLOUDFRONT_WEB_PRIVATE_URL=https://d5678private.cloudfront.net

# ==============================================
# AI Provider API Keys - NOT NEEDED IN ENV
# ==============================================
# API keys are loaded from the database at runtime:
# - Web tasks: `providers` table
# - Admin tasks: `adminProviders` table (when QUEUE_PREFIX=admin)
# Configure them in the Admin dashboard under "Providers" section.
# Do NOT add FAL_API_KEY, OPENAI_API_KEY, etc. here.

# ==============================================
# Worker Configuration
# ==============================================
# Worker concurrency (number of parallel jobs per queue)
WORKER_CONCURRENCY=5
# Log level: debug, info, warn, error
LOG_LEVEL=info
```

### For ECS Production

Use **AWS Secrets Manager** or **Parameter Store** to store sensitive values:

```bash
# Create secrets in Secrets Manager
aws secretsmanager create-secret \
  --name magiworld/web/env \
  --secret-string '{"DATABASE_URL":"...","AWS_ACCESS_KEY_ID":"...","AWS_SECRET_ACCESS_KEY":"..."}'
```

Reference in task definition:
```json
{
  "secrets": [
    {
      "name": "DATABASE_URL",
      "valueFrom": "arn:aws:secretsmanager:us-east-2:123456789:secret:magiworld/web/env:DATABASE_URL::"
    }
  ]
}
```

---

