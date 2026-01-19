# Task Orchestrator Architecture

## Overview

The Task Orchestrator is a distributed system for processing AI tasks asynchronously. It uses BullMQ for job queuing, Redis for real-time communication, and supports multiple AI providers (Fal.ai, Google Gemini).

**Status: Implemented** - All phases complete.

---

## 1. Core Architecture (Provider-Tool-Task Hierarchy)

The system is organized into three layers for dynamic management and fine-grained rate limiting:

| Layer | Description |
|-------|-------------|
| **Provider** | Manages API configuration, API keys, rate limits, and health status |
| **Tool** | Defines business functionality (text-to-image, 3D generation), links to providers |
| **Task** | Records each user request, real-time status, input/output snapshots, and error logs |

```
┌─────────────────────────────────────────────────────────┐
│                      Provider                           │
│  (fal.ai, Google Gemini, OpenAI...)                    │
│  - API Keys, Rate Limits, Circuit Breaker State        │
└─────────────────────┬───────────────────────────────────┘
                      │ 1:N
┌─────────────────────▼───────────────────────────────────┐
│                        Tool                             │
│  (Text-to-Image, Background Remove, Upscale...)        │
│  - Parameter Schema, Provider Reference                 │
└─────────────────────┬───────────────────────────────────┘
                      │ 1:N
┌─────────────────────▼───────────────────────────────────┐
│                        Task                             │
│  - User Request, Status, Progress, Input/Output        │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Project Structure

### Queue Package (`packages/queue/`)

```
packages/queue/src/
├── index.ts           # Public exports
├── redis.ts           # Redis client singleton (TLS support for AWS ElastiCache)
├── queues.ts          # Queue factory and management
├── types.ts           # TypeScript types and enums
├── pubsub.ts          # Redis Pub/Sub for real-time updates
├── ratelimit.ts       # User concurrency limiting
├── idempotency.ts     # Duplicate request prevention
└── circuit-breaker.ts # Distributed circuit breaker
```

### Worker App (`apps/worker/`)

```
apps/worker/src/
├── index.ts           # Worker entry point
├── config.ts          # Environment configuration (Zod validated)
├── shutdown.ts        # Graceful shutdown handling
├── s3.ts              # S3 upload utilities (env-prefixed paths)
├── dlq.ts             # Dead letter queue handler
└── tools/
    ├── index.ts           # Tool processor registry (maps slug → processor)
    ├── types.ts           # ToolContext, ToolResult interfaces
    ├── wrapper.ts         # Tool wrapper (handles DB updates, Pub/Sub)
    ├── provider-client.ts # Get provider credentials from DB
    ├── background-remove.ts  # fal.ai bria/background/remove
    ├── image-generate.ts     # fal.ai flux/schnell
    ├── image-upscale.ts      # fal.ai real-esrgan
    ├── image-rerender.ts     # fal.ai flux/dev/image-to-image
    └── nanobanana.ts         # Google gemini-2.0-flash image generation
```

**Worker Modes:**
- Web worker (default): Processes tasks for web users, uses `S3_WEB_PRIVATE_BUCKET`
- Admin worker (QUEUE_PREFIX=admin): Processes tasks for admin users, uses `S3_ADMIN_ASSETS_BUCKET`

### Web App APIs (`apps/web/`)

```
apps/web/app/api/tasks/
├── route.ts                    # POST /api/tasks - Create task
└── [taskId]/
    ├── route.ts                # GET /api/tasks/:id - Get task
    └── stream/
        └── route.ts            # GET /api/tasks/:id/stream - SSE updates
```

### Admin App (`apps/admin/`)

```
apps/admin/app/(dashboard)/providers/
├── page.tsx                   # Provider list page
├── new/
│   └── page.tsx               # Create provider page
└── [id]/
    └── page.tsx               # Edit provider page

apps/admin/lib/actions/
└── providers.ts               # Provider CRUD server actions

apps/admin/components/forms/
└── provider-form.tsx          # Provider form component
```

---

## 3. Task Flow

### 3.1 Task Creation Flow

```
Client Request
      │
      ▼
POST /api/tasks
      │
      ├── 1. Authenticate user (Logto)
      ├── 2. Check idempotency key (Redis)
      ├── 3. Check user concurrency limit (Redis)
      ├── 4. Look up tool → provider mapping (PostgreSQL)
      ├── 5. Create task record (PostgreSQL, status: pending)
      ├── 6. Increment user active task count (Redis)
      ├── 7. Enqueue job to BullMQ
      │
      ▼
Return { taskId, status: 'pending' }
```

### 3.2 Task Processing Flow

```
BullMQ Job
      │
      ▼
Worker picks up job
      │
      ├── 1. Get processor for provider (fal_ai, google)
      ├── 2. Update progress (0% → 10% → 50% → 100%)
      ├── 3. Call AI provider API
      ├── 4. Upload result to S3
      ├── 5. Update task in PostgreSQL
      ├── 6. Publish update to Redis Pub/Sub
      ├── 7. Decrement user active task count
      │
      ▼
Job Complete
```

### 3.3 Real-Time Updates Flow

```
GET /api/tasks/:id/stream (SSE)
      │
      ├── Subscribe to Redis channel: task:user:{userId}
      │
      ▼
Worker publishes progress
      │
      ├── Redis Pub/Sub message
      │
      ▼
SSE pushes to client
      │
      ▼
Client UI updates in real-time
```

---

## 4. Dual-Layer Rate Limiting

### 4.1 User-Facing (API Gateway)

Redis-based counter limits concurrent active tasks per user (default: 5).

```typescript
// packages/queue/src/ratelimit.ts
const { allowed, current, max } = await checkUserConcurrency(userId);
if (!allowed) {
  return Response.json({ error: 'Too many active tasks' }, { status: 429 });
}
```

### 4.2 Provider-Facing (Queue Level)

Per-provider queues with exponential backoff:

```typescript
// packages/queue/src/queues.ts
const DEFAULT_QUEUE_CONFIG = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 1000 },
  removeOnComplete: 100,
  removeOnFail: false,
};
```

Queue names: `fal_ai`, `google`, `openai`, `default`

---

## 5. Real-Time Communication (SSE + Redis Pub/Sub)

### Channel Pattern

```
task:user:{userId}
```

### Message Format

```typescript
interface TaskUpdateMessage {
  taskId: string;
  userId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  progress: number;      // 0-100
  message?: string;
  outputData?: object;
  error?: string;
  timestamp: number;
}
```

### Implementation

```typescript
// Worker publishes
await publishTaskUpdate(createTaskUpdateMessage({
  taskId,
  userId,
  status: 'processing',
  progress: 50,
}));

// SSE endpoint subscribes
const subscriber = createTaskSubscriber();
await subscriber.subscribe(getTaskChannel(userId));
subscriber.on('message', (ch, msg) => {
  controller.enqueue(`data: ${msg}\n\n`);
});
```

---

## 6. Fault Tolerance

### 6.1 Circuit Breaker

Redis-backed distributed circuit breaker prevents cascade failures:

| State | Trigger | Behavior |
|-------|---------|----------|
| **Closed** | Normal | All requests pass through |
| **Open** | ≥5 consecutive failures | Immediately reject requests |
| **Half-Open** | 30s after open | Allow 1 test request |

```typescript
// packages/queue/src/circuit-breaker.ts
const breaker = getCircuitBreaker(providerId);
if (!await breaker.canExecute()) {
  throw new CircuitBreakerOpenError('Circuit is OPEN');
}
```

Redis keys:
- `circuit:{providerId}:state`
- `circuit:{providerId}:failures`
- `circuit:{providerId}:opened_at`

### 6.2 Dead Letter Queue

Tasks that exhaust all retries are moved to `dead_letter_tasks` table:

```typescript
// apps/worker/src/dlq.ts
worker.on('failed', async (job, err) => {
  if (shouldMoveToDlq(job)) {
    await handleDeadLetter(job, err);
  }
});
```

DLQ entry includes:
- Original task ID
- Queue name
- Error message and stack
- Number of attempts
- Original payload (for replay)

### 6.3 Idempotency

Prevents duplicate task processing:

```typescript
// packages/queue/src/idempotency.ts
const { exists, taskId } = await checkIdempotency(userId, idempotencyKey);
if (exists) {
  return { taskId, status: 'already_processing' };
}
await setIdempotency(userId, idempotencyKey, newTaskId);
```

TTL: 1 hour

### 6.4 Graceful Shutdown

```typescript
// apps/worker/src/shutdown.ts
process.on('SIGTERM', async () => {
  await worker.pause();     // Stop accepting new jobs
  await worker.close();     // Wait for current jobs
  await closeRedis();       // Clean up connections
  process.exit(0);
});
```

---

## 7. AI Providers

### 7.1 Fal.ai Processor

Supported models:
- `flux/schnell` - Fast text-to-image
- `flux/dev` - High-quality text-to-image
- `bria/background/remove` - Background removal
- `real-esrgan` - Image upscaling
- `flux/dev/image-to-image` - Image transformation

### 7.2 Google Gemini Processor

Supported models:
- `gemini-3-pro-image` - Multimodal image generation

---

## 8. File Storage (S3)

### Environment Isolation

All S3 paths are prefixed with an environment identifier to isolate dev/staging/prod data:

| Environment | Prefix | Source |
|-------------|--------|--------|
| Development | `dev` | NODE_ENV=development or S3_ENV_PREFIX=dev |
| Staging | `staging` | S3_ENV_PREFIX=staging |
| Production | `prod` | NODE_ENV=production or S3_ENV_PREFIX=prod |
| Test | `test` | NODE_ENV=test |

### Path Structure by Application

#### Worker Results (Task Output)

```
{env}/{userType}/{userId}/results/{toolSlug}/{taskId}.{ext}
```

Examples:
- Web user: `dev/users/abc123/results/background-remove/task456.png`
- Admin user: `prod/admins/admin789/results/image-upscale/task012.png`

**Bucket Selection:**
- Web workers use `S3_WEB_PRIVATE_BUCKET`
- Admin workers (QUEUE_PREFIX=admin) use `S3_ADMIN_ASSETS_BUCKET`

#### Web App Uploads

```
{env}/users/{userId}/uploads/{filename}-{timestamp}.{ext}
```

Example: `dev/users/abc123/uploads/photo-1705123456789.jpg`

#### Admin App Uploads

| Purpose | Path Pattern |
|---------|-------------|
| Library uploads | `{env}/admins/{adminId}/library/uploads/{filename}` |
| Magi tool uploads | `{env}/admins/{adminId}/library/magi/{filename}` |
| Public banners | `{env}/public/banners/{adminId}/{filename}` |
| Tool icons/covers | `{env}/public/tools/{toolId}/{type}/{filename}` |
| Brand logos | `{env}/public/brands/{brandSlug}/{filename}` |

### Result Upload API

```typescript
// apps/worker/src/s3.ts
const url = await uploadTaskResult(userId, taskId, base64Data, 'png', toolSlug);
// Returns: https://{cloudfront-url}/{env}/{userType}/{userId}/results/{toolSlug}/{taskId}.png
```

### CloudFront URL Configuration

Results are stored in private S3 buckets and served via CloudFront:
- Worker returns unsigned CloudFront URL
- Web/Admin apps sign URLs when serving to users using CloudFront key pair

| Worker Type | CloudFront URL Config |
|-------------|----------------------|
| Web worker | `CLOUDFRONT_WEB_PRIVATE_URL` |
| Admin worker | `CLOUDFRONT_ADMIN_URL` or `NEXT_PUBLIC_CLOUDFRONT_ADMIN_URL` |

---

## 9. Provider Management (Admin UI)

Access: `https://admin.example.com/providers`

The admin app provides a UI for managing AI providers:

### Features

- **List View**: Table showing all providers with status, rate limits, and circuit breaker state
- **Create/Edit**: Form to configure provider settings
- **Rate Limiting**: Configure max requests and time window per provider
- **Timeout Settings**: Set default request timeout per provider
- **Status Management**: Set provider status (active, inactive, degraded)
- **Circuit Breaker Reset**: Manually reset circuit breaker from open/half-open to closed

### Provider Configuration Fields

| Field | Description |
|-------|-------------|
| `slug` | Queue routing identifier (fal_ai, google, openai) |
| `name` | Display name for the provider |
| `rateLimitMax` | Max requests per rate limit window |
| `rateLimitWindow` | Rate limit window in milliseconds |
| `defaultTimeout` | Request timeout in milliseconds |
| `status` | Operational status (active/inactive/degraded) |
| `isActive` | Enable/disable provider |

### Circuit Breaker Monitoring

The edit page displays real-time circuit breaker information:
- Current state (closed, open, half-open)
- Consecutive failure count
- Time when circuit opened
- Manual reset button (when circuit is not closed)

---

## 12. Database Schema

### Tasks Table

```sql
tasks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tool_id UUID REFERENCES tools(id),
  provider_id UUID REFERENCES providers(id),
  input_params JSONB,
  output_data JSONB,
  status task_status DEFAULT 'pending',  -- pending, processing, success, failed
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  priority INTEGER DEFAULT 5,
  bull_job_id TEXT,
  idempotency_key TEXT UNIQUE,
  request_id TEXT,
  attempts_made INTEGER DEFAULT 0,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Dead Letter Tasks Table

```sql
dead_letter_tasks (
  id UUID PRIMARY KEY,
  original_task_id UUID REFERENCES tasks(id),
  queue TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  attempts_made INTEGER NOT NULL,
  payload JSONB,
  status dead_letter_status DEFAULT 'pending',  -- pending, retried, archived
  review_notes TEXT,
  retried_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)
```

### Providers Table

```sql
providers (
  id UUID PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  api_key_encrypted TEXT,
  rate_limit_max INTEGER DEFAULT 100,
  rate_limit_window INTEGER DEFAULT 60000,
  default_timeout INTEGER DEFAULT 120000,
  status provider_status DEFAULT 'active',  -- active, inactive, degraded
  circuit_state circuit_state DEFAULT 'closed',  -- closed, open, half_open
  circuit_opened_at TIMESTAMP,
  failure_count INTEGER DEFAULT 0
)
```

---

## 13. Environment Variables

### Worker

```env
# Redis
REDIS_URL=redis://...
REDIS_TLS=true

# Database
DATABASE_URL=postgresql://...

# AWS Credentials (optional - uses default credential chain if not set)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2

# S3 Buckets (private - results served via CloudFront signed URLs)
S3_WEB_PRIVATE_BUCKET=magiworld-web-private        # For web worker results
S3_ADMIN_ASSETS_BUCKET=magiworld-admin-assets      # For admin worker results (optional)

# CloudFront URLs (unsigned - apps sign when serving)
CLOUDFRONT_WEB_PRIVATE_URL=https://web.cdn.example.com
CLOUDFRONT_ADMIN_URL=https://admin.cdn.example.com  # Or use NEXT_PUBLIC_CLOUDFRONT_ADMIN_URL

# Environment Prefix (optional - auto-detected from NODE_ENV)
S3_ENV_PREFIX=dev  # dev, staging, prod

# Queue Isolation
QUEUE_PREFIX=       # Empty for web worker, "admin" for admin worker

# Worker Settings
WORKER_CONCURRENCY=5
WORKER_SHUTDOWN_TIMEOUT_MS=30000

# Environment
NODE_ENV=production
LOG_LEVEL=info
```

**Note:** Provider API keys are fetched from database at runtime, not from environment variables.

### Web App

```env
REDIS_URL=redis://...
REDIS_TLS=true
DATABASE_URL=postgresql://...

# S3 Configuration
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2
S3_WEB_PRIVATE_BUCKET=magiworld-web-private
S3_ENV_PREFIX=dev  # Optional - auto-detected from NODE_ENV

# CloudFront (for signing URLs when serving to users)
CLOUDFRONT_WEB_PRIVATE_URL=https://web.cdn.example.com
CLOUDFRONT_KEY_PAIR_ID=...
CLOUDFRONT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
```

### Admin App

```env
REDIS_URL=redis://...
DATABASE_URL=postgresql://...

# S3 Configuration
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2
S3_ADMIN_ASSETS_BUCKET=magiworld-admin-assets
S3_ENV_PREFIX=dev

# CloudFront (for signing URLs when serving to users)
NEXT_PUBLIC_CLOUDFRONT_ADMIN_URL=https://admin.cdn.example.com
CLOUDFRONT_KEY_PAIR_ID=...
CLOUDFRONT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."

# Queue (for task submission)
QUEUE_PREFIX=admin
```

---

## 14. Technology Stack

| Component | Choice | Alternative |
|-----------|--------|-------------|
| Task Queue | BullMQ | AWS SQS + Lambda |
| Cache/Pub-Sub | AWS ElastiCache (Redis) | Upstash Redis |
| Real-time Push | SSE + Redis Pub/Sub | WebSocket |
| File Storage | AWS S3 + CloudFront | - |
| Database | PostgreSQL + Drizzle ORM | - |
| AI Providers | Fal.ai, Google Gemini | OpenAI |
