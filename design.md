# Magiworld AI Platform - Design Specification

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Core Architecture Principles](#4-core-architecture-principles)
5. [Data Model Design (Payload CMS)](#5-data-model-design-payload-cms)
6. [Module Requirements](#6-module-requirements)
7. [Internationalization](#7-internationalization)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [File Storage Strategy](#9-file-storage-strategy)
10. [Task Processing & Queue](#10-task-processing--queue)
11. [API Security](#11-api-security)
12. [Performance Optimization](#12-performance-optimization)
13. [Environment Configuration](#13-environment-configuration)
14. [Development Workflow](#14-development-workflow)
15. [Open Questions](#15-open-questions)

---

## 1. Project Overview

Magiworld is an AI-powered creative platform that provides various AI tools for image stylization, editing, 3D generation, and physical fabrication (e.g., crystal engraving). The platform is configuration-driven, allowing new tools to be added via CMS without frontend code changes.

### Key Goals
- **Flexibility**: Support diverse AI tool types through a unified interface
- **Scalability**: Handle growing tool catalog and user base
- **Performance**: Fast loading with aggressive code splitting
- **Maintainability**: Clean separation between CMS configuration and frontend rendering

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.1.1 |
| CMS | Payload CMS | 3.x |
| ORM (Web App) | Drizzle ORM | latest |
| Database | PostgreSQL | 15+ |
| Styling | Tailwind CSS | v4 |
| UI Components | shadcn/ui | latest |
| Monorepo | Turborepo + pnpm | latest |
| i18n | next-intl | latest |
| Icons | Hugeicons | (via shadcn preset) |
| Font | Inter | (via shadcn preset) |

---

## 3. Monorepo Structure

```
magiworld/
├── apps/
│   ├── web/                    # Next.js 16 frontend application
│   │   ├── app/
│   │   │   ├── [locale]/       # i18n routing
│   │   │   │   ├── (marketing)/
│   │   │   │   │   └── page.tsx        # Homepage (Explore)
│   │   │   │   ├── studio/
│   │   │   │   │   └── [toolTypeSlug]/
│   │   │   │   │       └── [toolSlug]/
│   │   │   │   │           └── page.tsx
│   │   │   │   └── assets/
│   │   │   │       └── page.tsx        # Personal Library
│   │   │   └── api/            # API Routes (AI proxy)
│   │   ├── components/
│   │   │   ├── ui/             # shadcn components
│   │   │   ├── tools/          # Tool-specific interfaces
│   │   │   │   ├── StylizeInterface.tsx
│   │   │   │   ├── EditInterface.tsx
│   │   │   │   ├── ThreeDGenInterface.tsx
│   │   │   │   └── CrystalEngraveInterface.tsx
│   │   │   └── shared/         # Shared app components
│   │   ├── lib/
│   │   │   ├── db/                 # Drizzle ORM
│   │   │   │   ├── index.ts        # Database connection
│   │   │   │   ├── schema.ts       # Tasks table schema
│   │   │   │   └── migrations/     # SQL migrations
│   │   │   ├── tool-registry.ts    # toolType → Component mapping
│   │   │   └── payload-client.ts   # CMS API client
│   │   └── messages/           # i18n translation files
│   │       ├── en.json
│   │       ├── ja.json
│   │       ├── pt.json
│   │       └── zh.json
│   │
│   └── cms/                    # Payload CMS application
│       ├── src/
│       │   ├── collections/
│       │   │   ├── Users.ts
│       │   │   ├── Media.ts
│       │   │   ├── Tools.ts
│       │   │   └── Categories.ts
│       │   ├── globals/
│       │   │   └── HomeConfig.ts
│       │   └── payload.config.ts
│       └── components/         # CMS-specific UI (if needed)
│
├── packages/
│   ├── types/                  # @magiworld/types
│   │   └── src/
│   │       ├── tool.ts
│   │       ├── task.ts
│   │       └── index.ts
│   ├── utils/                  # @magiworld/utils
│   │   └── src/
│   │       ├── format.ts
│   │       └── index.ts
│   └── config/                 # @magiworld/config
│       ├── eslint/
│       ├── typescript/
│       └── tailwind/
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

### Package Responsibilities

| Package | Purpose |
|---------|---------|
| `@magiworld/types` | Shared TypeScript interfaces (Tool, Task, User, etc.) |
| `@magiworld/utils` | Common utilities (date formatting, slug generation, etc.) |
| `@magiworld/config` | Shared ESLint, TypeScript, and Tailwind configurations |

> **Note**: Each app (`web`, `cms`) maintains its own UI components. No shared UI package.

---

## 4. Core Architecture Principles

### 4.1 Configuration-Driven UI

The frontend **must not hard-code business logic**. All tool behavior is determined by data from Payload CMS.

```typescript
// lib/tool-registry.ts
import dynamic from 'next/dynamic';

export const TOOL_COMPONENTS = {
  stylize: dynamic(() => import('@/components/tools/StylizeInterface')),
  edit: dynamic(() => import('@/components/tools/EditInterface')),
  '3d_gen': dynamic(() => import('@/components/tools/ThreeDGenInterface')),
  crystal_engrave: dynamic(() => import('@/components/tools/CrystalEngraveInterface')),
} as const;

export type ToolType = keyof typeof TOOL_COMPONENTS;
```

### 4.2 Component Registry Pattern

One-to-one mapping between `toolType` and React components:

```typescript
// In page.tsx
const tool = await fetchToolBySlug(toolSlug);
const ToolInterface = TOOL_COMPONENTS[tool.toolType];

return <ToolInterface tool={tool} />;
```

### 4.3 Dynamic Imports

All tool interfaces are loaded on-demand using `next/dynamic`:

```typescript
const StylizeInterface = dynamic(
  () => import('@/components/tools/StylizeInterface'),
  {
    loading: () => <ToolSkeleton />,
    ssr: false  // Client-side only for interactive tools
  }
);
```

### 4.4 Responsive Design

All layouts **must** be responsive. Use Tailwind's responsive prefixes consistently:

| Breakpoint | Prefix | Min Width |
|------------|--------|-----------|
| Mobile | (default) | 0px |
| Tablet | `md:` | 768px |
| Desktop | `lg:` | 1024px |
| Large Desktop | `xl:` | 1280px |

---

## 5. Data Model Design

### Data Separation Strategy

| Data Type | Storage | ORM/CMS | Rationale |
|-----------|---------|---------|-----------|
| Categories, Tools, Media | PostgreSQL | Payload CMS | Content (admin-managed, low frequency) |
| HomeConfig | PostgreSQL | Payload CMS | Marketing content |
| Tasks | PostgreSQL | Drizzle ORM | Transactional (user-generated, high volume) |
| Users | PostgreSQL | Drizzle ORM (future) | Will sync with Logto |

```
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                           │
├─────────────────────┬───────────────────────────────────┤
│  Payload Tables     │  Drizzle Tables                   │
│  - categories       │  - tasks                          │
│  - tools            │  - (users - future via Logto)     │
│  - media            │                                   │
│  - home_config      │                                   │
│  - users (cms admin)│                                   │
└─────────────────────┴───────────────────────────────────┘
         ▲                         ▲
         │                         │
    Payload CMS              Web App (Drizzle)
    (port 3001)                (port 3000)
```

### 5.1 Global: HomeConfig (Payload CMS)

Controls marketing content on the homepage.

```typescript
// globals/HomeConfig.ts
{
  slug: 'home-config',
  fields: [
    {
      name: 'mainBanners',
      type: 'array',
      maxRows: 3,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'subtitle', type: 'text' },
        { name: 'link', type: 'relationship', relationTo: 'tools' },
      ],
    },
    {
      name: 'sideBanners',
      type: 'array',
      minRows: 2,
      maxRows: 2,
      fields: [
        { name: 'image', type: 'upload', relationTo: 'media', required: true },
        { name: 'title', type: 'text', required: true },
        { name: 'link', type: 'relationship', relationTo: 'tools' },
      ],
    },
  ],
}
```

### 5.2 Collection: Categories

```typescript
// collections/Categories.ts
{
  slug: 'categories',
  admin: { useAsTitle: 'name' },
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'icon', type: 'text' },  // Icon name from Hugeicons
    { name: 'order', type: 'number', defaultValue: 0 },
  ],
}
```

### 5.3 Collection: Tools

```typescript
// collections/Tools.ts
{
  slug: 'tools',
  admin: { useAsTitle: 'title' },
  fields: [
    // Base fields
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
    { name: 'category', type: 'relationship', relationTo: 'categories', required: true },
    { name: 'thumbnail', type: 'upload', relationTo: 'media' },

    // Type dispatcher
    {
      name: 'toolType',
      type: 'select',
      required: true,
      options: [
        { label: 'Stylize', value: 'stylize' },
        { label: 'Edit', value: 'edit' },
        { label: '3D Generation', value: '3d_gen' },
        { label: 'Crystal Engrave', value: 'crystal_engrave' },
      ],
    },

    // Conditional fields based on toolType
    {
      name: 'promptTemplate',
      type: 'textarea',
      admin: {
        condition: (data) => data.toolType === 'stylize',
      },
    },
    {
      name: 'configJson',
      type: 'json',
      admin: {
        condition: (data) => ['edit', '3d_gen', 'crystal_engrave'].includes(data.toolType),
      },
    },

    // AI Backend configuration
    {
      name: 'aiEndpoint',
      type: 'text',
      admin: { position: 'sidebar' },
    },

    // Metadata
    { name: 'isActive', type: 'checkbox', defaultValue: true },
    { name: 'isFeatured', type: 'checkbox', defaultValue: false },
  ],
}
```

### 5.4 Tasks Table (Drizzle ORM - Web App)

The Tasks table is managed by Drizzle ORM in the web app (not Payload CMS) for better performance with high-volume transactional data.

```typescript
// lib/db/schema.ts
import { pgTable, uuid, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

export const taskStatusEnum = pgEnum('task_status', [
  'pending', 'processing', 'success', 'failed'
]);

export const outputTypeEnum = pgEnum('output_type', [
  'image', 'model_3d', 'fabrication'
]);

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull(),        // External ID from Logto
  toolSlug: text('tool_slug').notNull(),    // Reference to Tool by slug
  inputParams: jsonb('input_params'),
  outputType: outputTypeEnum('output_type'),
  outputData: jsonb('output_data'),
  status: taskStatusEnum('status').notNull().default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Drizzle Commands:**
```bash
pnpm --filter web db:generate   # Generate migrations
pnpm --filter web db:push       # Push schema to database
pnpm --filter web db:studio     # Open Drizzle Studio
```

### 5.5 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────┐
│                      PostgreSQL                          │
├────────────────────────┬────────────────────────────────┤
│    Payload CMS         │         Drizzle ORM            │
│                        │                                │
│  ┌─────────────┐       │       ┌─────────────┐         │
│  │  Categories │       │       │    Tasks    │         │
│  └──────┬──────┘       │       └──────┬──────┘         │
│         │ 1:N          │              │                │
│         ▼              │              │ references     │
│  ┌─────────────┐       │              │ by slug        │
│  │    Tools    │◄──────┼──────────────┘                │
│  └─────────────┘       │                                │
│                        │                                │
│  ┌─────────────┐       │       ┌─────────────┐         │
│  │    Media    │       │       │ Users (Logto)│         │
│  └─────────────┘       │       └─────────────┘         │
│                        │         (future)               │
└────────────────────────┴────────────────────────────────┘
```

---

## 6. Module Requirements

### 6.1 Module 1: Explore (Homepage)

**Route**: `/[locale]`

#### Hero Layout (Responsive)

**Desktop (lg and above)**:
```
┌────────────────────────────────┬──────────────┐
│                                │   Side 1     │
│       Main Carousel            ├──────────────┤
│       (8 columns)              │   Side 2     │
│                                │  (4 columns) │
└────────────────────────────────┴──────────────┘
```

**Mobile**:
```
┌────────────────────────────────┐
│       Main Carousel            │
│       (full width)             │
└────────────────────────────────┘
┌───────────────┬────────────────┐
│    Side 1     │     Side 2     │
└───────────────┴────────────────┘
```

#### Tool Discovery Section
- Display tools grouped by category
- Each tool card shows: thumbnail, title, last updated time
- Support infinite scroll or pagination

### 6.2 Module 2: Studio (Dynamic Workspace)

**Route**: `/[locale]/studio/[toolTypeSlug]/[toolSlug]`

#### Dynamic Interface Loading

```typescript
// app/[locale]/studio/[toolTypeSlug]/[toolSlug]/page.tsx
export default async function ToolPage({ params }) {
  const { toolSlug } = await params;
  const tool = await getToolBySlug(toolSlug);

  if (!tool) notFound();

  const ToolInterface = TOOL_COMPONENTS[tool.toolType];

  return (
    <Suspense fallback={<ToolSkeleton />}>
      <ToolInterface tool={tool} />
    </Suspense>
  );
}
```

#### Features
- Search tools by name
- Filter by category
- Masonry/waterfall layout for tool list
- Real-time task status updates

### 6.3 Module 3: Assets (Personal Library)

**Route**: `/[locale]/assets`

#### Polymorphic Viewer

```typescript
// components/shared/AssetViewer.tsx
function AssetViewer({ task }: { task: Task }) {
  switch (task.outputType) {
    case 'image':
      return <ImageViewer src={task.outputData.previewUrl} />;
    case 'model_3d':
      return <ModelViewer src={task.outputData.glbUrl} />;
    case 'fabrication':
      return <FabricationPreview data={task.outputData} />;
  }
}
```

#### "Re-create" Workflow
1. User clicks on an existing asset
2. Navigate to original tool: `/studio/[toolType]/[toolSlug]?recreate=[taskId]`
3. Pre-fill `inputParams` from the original task
4. User can modify and regenerate

---

## 7. Internationalization

### Strategy
- **Routing**: Prefix-based (`/en/...`, `/ja/...`, `/pt/...`, `/zh/...`)
- **Library**: next-intl (latest)
- **Default Locale**: `en`

### Supported Locales

| Code | Language | Region |
|------|----------|--------|
| `en` | English | Global |
| `ja` | Japanese | Japan |
| `pt` | Portuguese | Brazil |
| `zh` | Chinese | Simplified |

### File Structure

```
apps/web/
├── messages/
│   ├── en.json
│   ├── ja.json
│   ├── pt.json
│   └── zh.json
├── i18n/
│   ├── request.ts
│   └── routing.ts
└── middleware.ts
```

### Implementation

```typescript
// i18n/routing.ts
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ja', 'pt', 'zh'],
  defaultLocale: 'en',
});
```

```typescript
// middleware.ts
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/', '/(en|ja|pt|zh)/:path*'],
};
```

---

## 8. Authentication & Authorization

> **Status**: Deferred to later phase.

### Planned Solution: Logto

Authentication will be implemented in a future phase using [Logto](https://logto.io/) - an open-source identity solution.

**Why Logto**:
- Open-source and self-hostable (fits AWS deployment strategy)
- Supports social logins, passwordless, MFA
- OIDC/OAuth 2.0 compliant
- Good developer experience with SDKs

### Future Integration Pattern

```typescript
// Example: Sync Logto user to Payload (future implementation)
// api/webhooks/logto/route.ts
export async function POST(req: Request) {
  const { event, user } = await req.json();

  if (event === 'User.Created') {
    await payload.create({
      collection: 'users',
      data: {
        email: user.primaryEmail,
        externalId: user.id,
      },
    });
  }
}
```

### Current Phase

For initial development, we will:
- Skip authentication implementation
- Use Payload's admin panel for content management
- Build UI components without auth guards (to be added later)

---

## 9. File Storage Strategy

> **Decision**: AWS S3

### Why AWS S3

- Industry standard, battle-tested
- Excellent SDK support
- Integrates well with AWS deployment infrastructure
- CloudFront CDN integration for global delivery
- Fits overall AWS hosting strategy

### Bucket Structure

```
magiworld-assets/
├── uploads/              # User uploads (input images)
│   └── {userId}/{taskId}/
├── outputs/              # AI-generated outputs
│   ├── images/
│   ├── models/          # 3D GLB files
│   └── fabrication/
└── media/               # CMS media (banners, thumbnails)
```

### Upload Flow

```
User Upload → Next.js API Route → Pre-signed URL → S3
                                        ↓
                              Store URL in Payload
```

### Implementation

```typescript
// lib/s3.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function getUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3, command, { expiresIn: 3600 });
}
```

### CDN Configuration

Use CloudFront in front of S3 for:
- Global edge caching
- HTTPS termination
- Custom domain (`cdn.magiworld.ai`)

---

## 10. Task Processing & Queue

AI generation tasks are long-running (10s to minutes). A proper queue system is essential.

### Architecture

```
┌─────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────┐
│  Web    │────▶│  API Route  │────▶│  Job Queue   │────▶│  Worker │
│  App    │     │  (enqueue)  │     │  (Redis/BQ)  │     │  (AI)   │
└─────────┘     └─────────────┘     └──────────────┘     └─────────┘
     ▲                                                        │
     │              ┌─────────────┐                          │
     └──────────────│  Webhook    │◀─────────────────────────┘
       (SSE/WS)     │  (update)   │
                    └─────────────┘
```

### Decision: Inngest

Inngest is chosen for its:
- Serverless-friendly architecture
- Built for Next.js integration
- Easy local development
- Automatic retries and error handling
- Event-driven workflow support

### Task Status Updates

Use **Server-Sent Events (SSE)** for real-time task status:

```typescript
// api/tasks/[taskId]/status/route.ts
export async function GET(req: Request, { params }) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Poll task status and send updates
      const interval = setInterval(async () => {
        const task = await getTask(params.taskId);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(task)}\n\n`)
        );

        if (task.status === 'success' || task.status === 'failed') {
          clearInterval(interval);
          controller.close();
        }
      }, 1000);
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

---

## 11. API Security

### 11.1 AI API Proxying

All AI API calls **must** go through Next.js API Routes:

```
Client → /api/ai/stylize → External AI API
              │
              └─── API Key injected server-side
```

```typescript
// api/ai/stylize/route.ts
export async function POST(req: Request) {
  const { prompt, imageUrl } = await req.json();

  // Validate user session
  const session = await getSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit check
  const { success } = await rateLimit.check(session.userId);
  if (!success) {
    return Response.json({ error: 'Rate limited' }, { status: 429 });
  }

  // Call external AI API with server-side key
  const response = await fetch(process.env.AI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({ prompt, imageUrl }),
  });

  return Response.json(await response.json());
}
```

### 11.2 Rate Limiting

Implement per-user rate limiting:

| Tier | Requests/min | Daily Limit |
|------|--------------|-------------|
| Free | 5 | 50 |
| Pro | 30 | 500 |
| Enterprise | Unlimited | Unlimited |

### 11.3 Input Validation

Use Zod for runtime validation:

```typescript
import { z } from 'zod';

const stylizeInputSchema = z.object({
  prompt: z.string().min(1).max(1000),
  imageUrl: z.string().url().optional(),
  seed: z.number().int().positive().optional(),
});
```

---

## 12. Performance Optimization

### 12.1 Code Splitting

Each tool interface is a separate chunk:

```typescript
// Automatic code splitting via next/dynamic
const ToolInterface = dynamic(
  () => import(`@/components/tools/${toolType}Interface`),
  { loading: () => <Skeleton /> }
);
```

### 12.2 Image Optimization

- Use Next.js `<Image>` component
- Configure remote patterns for AI-generated images
- Implement blur placeholders

```typescript
// next.config.ts
export default {
  images: {
    remotePatterns: [
      { hostname: 'cdn.magiworld.ai' },  // CloudFront CDN
      { hostname: 's3.ap-northeast-1.amazonaws.com' },  // Direct S3 (dev)
    ],
  },
};
```

### 12.3 3D Model Loading

- Use `<model-viewer>` web component
- Implement progressive loading for large GLB files
- Consider Draco compression for 3D models

### 12.4 Caching Strategy

| Resource | Cache Strategy |
|----------|----------------|
| Tool metadata | ISR (60s revalidation) |
| User tasks | No cache (dynamic) |
| Static assets | Immutable (1 year) |
| AI outputs | CDN cached |

---

## 13. Environment Configuration

### Required Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/magiworld

# Payload CMS
PAYLOAD_SECRET=your-secret-key

# AWS S3 Storage
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET_NAME=magiworld-assets
CLOUDFRONT_URL=https://cdn.magiworld.ai

# AI APIs
AI_API_KEY=...
AI_API_URL=...

# Inngest (Job Queue)
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# Authentication (Future - Logto)
# LOGTO_ENDPOINT=...
# LOGTO_APP_ID=...
# LOGTO_APP_SECRET=...
```

### Environment-Specific Config

| Variable | Development | Production |
|----------|-------------|------------|
| `DATABASE_URL` | Local PostgreSQL | AWS RDS PostgreSQL |
| `PAYLOAD_SECRET` | Any string | Strong random secret |
| `S3_BUCKET_NAME` | magiworld-dev | magiworld-prod |
| `CLOUDFRONT_URL` | (optional) | https://cdn.magiworld.ai |
| `INNGEST_*` | Dev keys | Production keys |

---

## 14. Development Workflow

### Initial Setup Commands

```bash
# 1. Create monorepo structure
pnpm dlx create-turbo@latest magiworld

# 2. Create web app with shadcn preset
cd apps
pnpm dlx shadcn@latest init --preset "https://ui.shadcn.com/r/nova-neutral" --template next
mv my-app web

# 3. Create CMS app
npx create-payload-app@latest cms --db postgres

# 4. Install dependencies
cd ..
pnpm install
```

### Development Scripts

```json
// package.json (root)
{
  "scripts": {
    "dev": "turbo dev",
    "dev:web": "turbo dev --filter=web",
    "dev:cms": "turbo dev --filter=cms",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck"
  }
}
```

### Git Workflow

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - New features
- `fix/*` - Bug fixes

---

## 15. Decisions Made & Open Questions

### Decisions Made

| # | Question | Decision | Notes |
|---|----------|----------|-------|
| 1 | Authentication | **Logto** (deferred) | Will implement in later phase |
| 2 | File storage | **AWS S3** | With CloudFront CDN |
| 3 | Job queue | **Inngest** | Serverless-friendly |
| 4 | Hosting | **AWS** (deferred) | Will deploy on AWS later |

### Open Questions (Medium Priority)

| # | Question | Options |
|---|----------|---------|
| 1 | Analytics solution? | AWS CloudWatch / Plausible / PostHog |
| 2 | Error monitoring? | Sentry / AWS X-Ray |
| 3 | Payment integration? | Stripe / Paddle / LemonSqueezy |

### Open Questions (Low Priority - Can decide later)

| # | Question |
|---|----------|
| 4 | Email service provider? (transactional emails - AWS SES?) |
| 5 | Log aggregation? (CloudWatch Logs?) |

---

## Appendix A: Reference Designs

### Header Layout
Refer to `reference/layout.png` for header design reference.

*(Additional reference images will be added to the `reference/` folder)*

---

## Appendix B: shadcn Preset Details

The web app uses the following shadcn configuration:

```
Base: base
Style: nova
Base Color: neutral
Theme: neutral
Icon Library: hugeicons
Font: Inter
Menu Accent: subtle
Menu Color: default
Radius: default
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-31 | Initial design specification |
