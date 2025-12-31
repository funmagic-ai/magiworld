# Magiworld AI Platform - Design Specification

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Core Architecture Principles](#4-core-architecture-principles)
5. [Data Model Design](#5-data-model-design)
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

Magiworld is an AI-powered creative platform that provides various AI tools for image stylization, editing, 3D generation, and physical fabrication (e.g., crystal engraving). The platform is configuration-driven, allowing new tools to be added via the Admin panel without frontend code changes.

### Key Goals
- **Flexibility**: Support diverse AI tool types through a unified interface
- **Scalability**: Handle growing tool catalog and user base
- **Performance**: Fast loading with aggressive code splitting
- **Maintainability**: Clean separation between admin configuration and frontend rendering

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.1.1 |
| Database ORM | Drizzle ORM | latest |
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
│   │   │   ├── data/           # Data fetching (from shared db)
│   │   │   │   └── index.ts
│   │   │   └── tool-registry.ts    # toolType → Component mapping
│   │   └── messages/           # i18n translation files
│   │       ├── en.json
│   │       ├── ja.json
│   │       ├── pt.json
│   │       └── zh.json
│   │
│   └── admin/                  # Admin dashboard application
│       ├── app/
│       │   ├── page.tsx            # Dashboard
│       │   ├── tools/              # Tools CRUD
│       │   ├── tool-types/         # Tool Types CRUD
│       │   ├── categories/         # Categories CRUD
│       │   ├── banners/            # Banners CRUD
│       │   └── media/              # Media management
│       └── lib/
│           └── utils.ts
│
├── packages/
│   ├── db/                    # @magiworld/db - Shared database
│   │   └── src/
│   │       ├── schema.ts      # Drizzle schema
│   │       ├── index.ts       # Database client
│   │       └── seed.ts        # Seed script
│   ├── types/                 # @magiworld/types
│   │   └── src/
│   │       └── index.ts
│   └── utils/                 # @magiworld/utils
│       └── src/
│           └── index.ts
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── .env.example
```

### Package Responsibilities

| Package | Purpose |
|---------|---------|
| `@magiworld/db` | Shared Drizzle schema and database client |
| `@magiworld/types` | Shared TypeScript interfaces (Tool, Task, User, etc.) |
| `@magiworld/utils` | Common utilities (date formatting, slug generation, etc.) |

> **Note**: Both apps (`web`, `admin`) share the same database via `@magiworld/db` package.

---

## 4. Core Architecture Principles

### 4.1 Configuration-Driven UI

The frontend **must not hard-code business logic**. All tool behavior is determined by data from the database.

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

### 4.3 Shared Database Architecture

Both web and admin apps connect to the same PostgreSQL database via the shared `@magiworld/db` package:

```
┌─────────────────────────────────────────────────────────┐
│                      PostgreSQL                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 Shared Tables                      │  │
│  │  - tool_types / tool_type_translations            │  │
│  │  - categories / category_translations              │  │
│  │  - tools / tool_translations                       │  │
│  │  - home_banners / home_banner_translations         │  │
│  │  - media                                           │  │
│  │  - tasks                                           │  │
│  └──────────────────────────────────────────────────┘  │
│           ▲                         ▲                   │
│           │                         │                   │
│      Admin App                  Web App                 │
│      (port 3002)               (port 3000)              │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Translation Tables Pattern

For i18n support, each content table has a corresponding translation table:

```typescript
// Base table (language-agnostic data)
export const toolTypes = pgTable('tool_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  badgeColor: badgeColorEnum('badge_color').notNull(),
  componentKey: text('component_key').notNull(),
  order: integer('order').notNull().default(0),
});

// Translation table (localized content)
export const toolTypeTranslations = pgTable('tool_type_translations', {
  id: uuid('id').primaryKey().defaultRandom(),
  toolTypeId: uuid('tool_type_id').references(() => toolTypes.id),
  locale: localeEnum('locale').notNull(),  // 'en' | 'ja' | 'pt' | 'zh'
  name: text('name').notNull(),
  description: text('description'),
});
```

---

## 5. Data Model Design

### 5.1 Database Schema (Drizzle ORM)

All tables are defined in `packages/db/src/schema.ts`:

#### Enums
```typescript
export const badgeColorEnum = pgEnum('badge_color', ['default', 'secondary', 'outline']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'processing', 'success', 'failed']);
export const outputTypeEnum = pgEnum('output_type', ['image', 'model_3d', 'fabrication']);
export const localeEnum = pgEnum('locale', ['en', 'ja', 'pt', 'zh']);
```

#### Content Tables
- `tool_types` + `tool_type_translations` - Tool classifications
- `categories` + `category_translations` - Tool categories
- `tools` + `tool_translations` - Individual AI tools
- `home_banners` + `home_banner_translations` - Homepage banners
- `media` - Uploaded media files

#### Task Tables
- `tasks` - User-generated AI tasks (high volume, transactional)

### 5.2 Entity Relationship

```
┌─────────────────┐     ┌─────────────────────────┐
│   tool_types    │────▶│  tool_type_translations │
└────────┬────────┘     └─────────────────────────┘
         │ 1:N
         ▼
┌─────────────────┐     ┌─────────────────────────┐
│     tools       │────▶│    tool_translations    │
└────────┬────────┘     └─────────────────────────┘
         │
         │ N:1
         ▼
┌─────────────────┐     ┌─────────────────────────┐
│   categories    │────▶│  category_translations  │
└─────────────────┘     └─────────────────────────┘

┌─────────────────┐     ┌─────────────────────────┐
│  home_banners   │────▶│ home_banner_translations│
└─────────────────┘     └─────────────────────────┘

┌─────────────────┐
│      tasks      │ (references tools by toolId)
└─────────────────┘
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

### 6.3 Module 3: Assets (Personal Library)

**Route**: `/[locale]/assets`

#### Polymorphic Viewer

```typescript
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

---

## 7. Internationalization

### Strategy
- **Routing**: Prefix-based (`/en/...`, `/ja/...`, `/pt/...`, `/zh/...`)
- **Library**: next-intl (latest)
- **Default Locale**: `en`
- **Content i18n**: Translation tables in database

### Supported Locales

| Code | Language | Region |
|------|----------|--------|
| `en` | English | Global |
| `ja` | Japanese | Japan |
| `pt` | Portuguese | Brazil |
| `zh` | Chinese | Simplified |

---

## 8. Authentication & Authorization

### Solution: Logto

Both web and admin apps use [Logto](https://logto.io/) for authentication.

**Why Logto**:
- Open-source and self-hostable
- Supports social logins, passwordless, MFA
- OIDC/OAuth 2.0 compliant
- Good developer experience with SDKs

---

## 9. File Storage Strategy

> **Decision**: AWS S3

### Bucket Structure

```
magiworld-assets/
├── uploads/              # User uploads (input images)
│   └── {userId}/{taskId}/
├── outputs/              # AI-generated outputs
│   ├── images/
│   ├── models/          # 3D GLB files
│   └── fabrication/
└── media/               # Admin media (banners, thumbnails)
```

---

## 10. Task Processing & Queue

### Decision: Inngest

Inngest is chosen for its:
- Serverless-friendly architecture
- Built for Next.js integration
- Easy local development
- Automatic retries and error handling

---

## 11. API Security

### AI API Proxying

All AI API calls **must** go through Next.js API Routes:

```
Client → /api/ai/stylize → External AI API
              │
              └─── API Key injected server-side
```

---

## 12. Performance Optimization

### Code Splitting
Each tool interface is a separate chunk via `next/dynamic`.

### Image Optimization
Use Next.js `<Image>` component with remote patterns configured.

### Caching Strategy

| Resource | Cache Strategy |
|----------|----------------|
| Tool metadata | ISR (60s revalidation) |
| User tasks | No cache (dynamic) |
| Static assets | Immutable (1 year) |

---

## 13. Environment Configuration

### Required Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgresql://user:password@localhost:9000/magi-db

# AWS S3 Storage
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
S3_BUCKET_NAME=magiworld-assets
CLOUDFRONT_URL=https://cdn.magiworld.ai

# AI APIs
AI_API_KEY=
AI_API_URL=

# Inngest (Job Queue)
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# Authentication (Logto)
# LOGTO_ENDPOINT=
# LOGTO_APP_ID=
# LOGTO_APP_SECRET=
```

---

## 14. Development Workflow

### Development Scripts

```json
// package.json (root)
{
  "scripts": {
    "dev": "turbo dev",
    "dev:web": "turbo dev --filter=web",
    "dev:admin": "turbo dev --filter=admin",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "db:push": "pnpm --filter @magiworld/db db:push",
    "db:seed": "pnpm --filter @magiworld/db db:seed",
    "db:studio": "pnpm --filter @magiworld/db db:studio"
  }
}
```

### App URLs

| App | Development | Production |
|-----|-------------|------------|
| Web | http://localhost:3000 | magiworld.ai |
| Admin | http://localhost:3002 | admin.magiworld.ai |

---

## 15. Decisions Made & Open Questions

### Decisions Made

| # | Question | Decision |
|---|----------|----------|
| 1 | CMS | Custom Admin App with shared Drizzle DB |
| 2 | Authentication | Logto |
| 3 | File storage | AWS S3 with CloudFront CDN |
| 4 | Job queue | Inngest |

### Open Questions

| # | Question | Options |
|---|----------|---------|
| 1 | Analytics solution? | AWS CloudWatch / Plausible / PostHog |
| 2 | Error monitoring? | Sentry / AWS X-Ray |
| 3 | Payment integration? | Stripe / Paddle / LemonSqueezy |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-31 | Initial design specification |
| 2.0 | 2024-12-31 | Replaced Payload CMS with custom Admin app |
