# Magiworld AI Platform - Design Specification

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Core Architecture Principles](#4-core-architecture-principles)
5. [Data Model Design](#5-data-model-design)
6. [Module Requirements](#6-module-requirements)
7. [Internationalization](#7-internationalization)
8. [Theme System](#8-theme-system)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [File Storage Strategy](#10-file-storage-strategy)
11. [Task Processing & Queue](#11-task-processing--queue)
12. [API Security](#12-api-security)
13. [Performance Optimization](#13-performance-optimization)
14. [Environment Configuration](#14-environment-configuration)
15. [Development Workflow](#15-development-workflow)
16. [Open Questions](#16-open-questions)

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

#### Tool Registry Pattern

A shared `TOOL_REGISTRY` in `@magiworld/types` ensures consistency between the web app (component routing) and admin app (slug validation):

```typescript
// packages/types/src/index.ts
export const TOOL_REGISTRY = [
  'background-remove',
  // Add new tool slugs here
] as const;

export type RegisteredToolSlug = typeof TOOL_REGISTRY[number];
```

```typescript
// apps/web/components/tools/tool-router.tsx
import { TOOL_REGISTRY } from '@magiworld/types';

const TOOL_COMPONENTS: Record<string, React.ComponentType<{ tool: ToolData }>> = {
  'background-remove': BackgroundRemoveInterface,
};

// Development-time validation
if (process.env.NODE_ENV === 'development') {
  TOOL_REGISTRY.forEach((slug) => {
    if (!TOOL_COMPONENTS[slug]) {
      console.warn(`Warning: Tool slug "${slug}" is registered but has no component`);
    }
  });
}
```

```typescript
// apps/admin/lib/validations/tool.ts
import { TOOL_REGISTRY } from '@magiworld/types';

export const toolSchema = z.object({
  slug: z.string()
    .refine((slug) => TOOL_REGISTRY.includes(slug as RegisteredToolSlug), {
      message: `Slug must match a registered tool. Valid: ${TOOL_REGISTRY.join(', ')}`,
    }),
  // ...
});
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

## 8. Theme System

### Solution: next-themes + CSS Custom Properties

The web app supports multiple color themes with light/dark mode variants.

### Available Themes

| Theme | Light Primary | Dark Primary |
|-------|---------------|--------------|
| Neutral (default) | Black | White |
| Green | #00E676 | #00E676 |
| Blue | #3b82f6 | #3b82f6 |
| Purple | #a855f7 | #a855f7 |
| Orange | #f97316 | #f97316 |

### Implementation

#### ThemeProvider Configuration
```typescript
// app/[locale]/layout.tsx
<ThemeProvider
  attribute="class"
  defaultTheme="neutral"
  enableSystem={false}
  themes={['neutral', 'green', 'blue', 'purple', 'orange',
           'neutral-dark', 'green-dark', 'blue-dark', 'purple-dark', 'orange-dark']}
>
```

#### CSS Variables (globals.css)
```css
/* Neutral Theme (default light) */
:root, :root.neutral, .neutral {
  --primary: oklch(0.205 0 0);      /* Black */
  --primary-foreground: oklch(0.985 0 0);
  /* ... other variables */
}

/* Neutral Dark Theme */
:root.neutral-dark, .neutral-dark {
  --primary: oklch(0.985 0 0);      /* White */
  --primary-foreground: oklch(0.205 0 0);
  /* ... other variables */
}

/* Color themes follow same pattern */
```

#### Dark Mode Variant
```css
@custom-variant dark (&:is(.neutral-dark *, .green-dark *, .blue-dark *, .purple-dark *, .orange-dark *));
```

### Theme Switcher Component

Location: `components/theme-switcher.tsx`

Features:
- Color picker with 5 theme options (circular buttons)
- Dark/light mode toggle (sun/moon icons)
- Smooth transitions
- Persists selection in localStorage

---

## 9. Authentication & Authorization

### Solution: Logto

Both web and admin apps use [Logto](https://logto.io/) for authentication.

**Why Logto**:
- Open-source and self-hostable
- Supports social logins, passwordless, MFA
- OIDC/OAuth 2.0 compliant
- Good developer experience with SDKs

### Implementation (Web App)

#### Configuration
```typescript
// lib/logto.ts
import { LogtoNextConfig, UserScope } from '@logto/next';

export const logtoConfig: LogtoNextConfig = {
  endpoint: process.env.LOGTO_ENDPOINT!,
  appId: process.env.LOGTO_APP_ID!,
  appSecret: process.env.LOGTO_APP_SECRET!,
  baseUrl: process.env.LOGTO_BASE_URL!,
  cookieSecret: process.env.LOGTO_COOKIE_SECRET!,
  cookieSecure: process.env.NODE_ENV === 'production',
  scopes: [UserScope.Email, UserScope.Profile],
  fetchUserInfo: true,
};
```

#### Auth Components
- `components/auth/auth-status.tsx` - Server component for auth state
- `components/auth/sign-in-button.tsx` - Client component for sign in
- `components/auth/user-button.tsx` - User dropdown menu with profile link

#### Routes
- `/callback` - OAuth callback handler (outside locale routing)
- `/[locale]/profile` - Protected user profile page

#### Logto Console Configuration
- **Redirect URI**: `http://localhost:3000/callback`
- **Post sign-out redirect URI**: `http://localhost:3000/`

### Profile Page

#### Route: `/[locale]/profile`

Protected route that redirects to home if not authenticated.

#### Layout (Responsive)

**Desktop (lg+)**:
```
┌──────────────┬─────────────────────────────────────────────┐
│              │                                              │
│  ┌────────┐  │  ┌────────────────────────────────────────┐ │
│  │ Avatar │  │  │  Account Information (collapsible)     │ │
│  └────────┘  │  └────────────────────────────────────────┘ │
│  User Name   │                                              │
│              │  ┌────────────────────────────────────────┐ │
│  ──────────  │  │  Preferences (collapsible)             │ │
│  [Account]   │  │  - Theme picker                         │ │
│  [Prefs]     │  │  - Language switcher                    │ │
│              │  └────────────────────────────────────────┘ │
│              │                                              │
│              │  ┌────────────────────────────────────────┐ │
│              │  │  Account Actions                        │ │
│              │  │  [Sign Out]                             │ │
│              │  └────────────────────────────────────────┘ │
├──────────────┴─────────────────────────────────────────────┤
```

**Mobile (Stacked Cards)**:
```
┌─────────────────────┐
│  ┌─────┐            │
│  │Avatar│ User Name │
│  └─────┘            │
├─────────────────────┤
│  ┌─────────────────┐│
│  │ Account Info    ││
│  │ (collapsible)   ││
│  └─────────────────┘│
│  ┌─────────────────┐│
│  │ Preferences     ││
│  │ (collapsible)   ││
│  └─────────────────┘│
│  ┌─────────────────┐│
│  │ [Sign Out]      ││
│  └─────────────────┘│
└─────────────────────┘
```

#### Profile Features
- User avatar with initials fallback
- Account information (name, email, user ID, member since)
- Email verification badge
- Theme preference (color picker + dark mode toggle)
- Language preference
- Sign out action

---

## 10. File Storage Strategy

> **Decision**: AWS S3 with Multi-Bucket Architecture + Content-Based Routing

### Architecture Overview

We use **three separate S3 buckets** for better isolation, security, and cost management. **Content-based routing** determines which bucket receives uploads:

- **Public content** (banners, tool images) → `magiworld-cdn` (served via CloudFront)
- **Private library** (admin internal assets) → `magiworld-admin-assets`
- **User uploads** (AI inputs) → `magiworld-user-uploads`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AWS S3 Multi-Bucket Architecture                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│                              Admin App (3002)                                 │
│                    ┌────────────────┴────────────────┐                       │
│                    │                                 │                       │
│                    ▼                                 ▼                       │
│  ┌──────────────────────────┐       ┌──────────────────────────────────┐    │
│  │ magiworld-admin-assets   │       │       magiworld-cdn              │    │
│  │ (Private)                │       │       (Public)                   │    │
│  ├──────────────────────────┤       ├──────────────────────────────────┤    │
│  │ • Admin library files    │       │ • Banners (homepage)             │    │
│  │ • Internal documents     │       │ • Tool thumbnails & samples      │    │
│  │ • Draft assets           │       │ • Marketing images               │    │
│  │                          │       │ • Static UI assets               │    │
│  └──────────────────────────┘       └───────────────┬──────────────────┘    │
│                                                      │                       │
│                                                      ▼                       │
│                                               CloudFront CDN                 │
│                                                      │                       │
│  ┌──────────────────────────┐                       │                       │
│  │ magiworld-user-uploads   │                       ▼                       │
│  │ (Private)                │            Web App (3000) ◄─── Users           │
│  ├──────────────────────────┤                                                │
│  │ • User AI inputs         │                                                │
│  │ • Task results           │                                                │
│  │ • Temporary processing   │                                                │
│  └──────────────────────────┘                                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Content-Based Routing (Admin App)

The admin app uses two upload endpoints based on content type:

| Upload Route | Destination Bucket | Used For |
|--------------|-------------------|----------|
| `/api/upload` | `magiworld-admin-assets` | Library (Assets > Library page) |
| `/api/upload/cdn` | `magiworld-cdn` | Banners, Tool images (public content) |

```typescript
// Library uploads → Private bucket (admin-assets)
const libraryUpload = useUpload({ route: 'images' });  // /api/upload

// Banner/Tool uploads → Public bucket (cdn)
const bannerUpload = useUpload({ route: 'banners', endpoint: '/api/upload/cdn' });
```

### Bucket Details

| Bucket | Purpose | Access | Lifecycle |
|--------|---------|--------|-----------|
| `magiworld-admin-assets` | Admin library (internal files) | Private (signed URLs) | Permanent |
| `magiworld-user-uploads` | User-generated content | Private (signed URLs) | 30-90 days |
| `magiworld-cdn` | Public assets (banners, tool images) | Public (CloudFront) | Permanent |

### Bucket Structure

#### magiworld-admin-assets (Private)
```
magiworld-admin-assets/
└── media/                # Admin media library
    └── {folderId}/
        └── {filename}
```

#### magiworld-cdn (Public via CloudFront)
```
magiworld-cdn/
├── banners/              # Homepage banners (cache-busted filenames)
│   └── {name}-{timestamp}.jpg
├── tools/                # Tool thumbnails and samples
│   └── {toolId}/
│       ├── thumbnails/
│       └── samples/
├── ui/                   # UI assets (icons, placeholders)
├── marketing/            # Landing page graphics
└── fonts/                # Custom web fonts
```

#### magiworld-user-uploads (Private)
```
magiworld-user-uploads/
└── {userId}/
    ├── inputs/           # User-uploaded source images
    │   └── {timestamp}-{filename}
    └── outputs/          # AI-generated results
        └── {taskId}/
            ├── preview.jpg
            ├── result.png
            └── model.glb
```

### Security Configuration

#### IAM Policies

**Admin App (Access to admin-assets + CDN buckets)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AdminAssetsFullAccess",
      "Effect": "Allow",
      "Action": ["s3:*"],
      "Resource": [
        "arn:aws:s3:::magiworld-admin-assets",
        "arn:aws:s3:::magiworld-admin-assets/*"
      ]
    },
    {
      "Sid": "CDNUploadAccess",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::magiworld-cdn/banners/*",
        "arn:aws:s3:::magiworld-cdn/tools/*"
      ]
    }
  ]
}
```

**Web App (Restricted to user uploads)**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::magiworld-user-uploads/users/*",
      "Condition": {
        "StringLessThanEquals": {
          "s3:content-length": "10485760"
        }
      }
    }
  ]
}
```

### CORS Configuration

Apply to both `magiworld-admin-assets` and `magiworld-user-uploads`:

```json
{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": [
        "http://localhost:3000",
        "http://localhost:3002",
        "https://magiworld.ai",
        "https://admin.magiworld.ai"
      ],
      "ExposeHeaders": ["ETag", "x-amz-meta-*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

### Lifecycle Policies

**magiworld-user-uploads** - Auto-cleanup:
```json
{
  "Rules": [
    {
      "ID": "DeleteOldUserInputs",
      "Status": "Enabled",
      "Filter": { "Prefix": "users/" },
      "Expiration": { "Days": 30 }
    },
    {
      "ID": "DeleteIncompleteMultipart",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 1 }
    }
  ]
}
```

### Cache Strategy

| Content Type | Cache-Control | CDN TTL |
|--------------|---------------|---------|
| Admin banners | `max-age=3600` | 1 hour |
| User outputs | `max-age=86400` | 1 day |
| CDN static assets | `max-age=31536000, immutable` | 1 year |

### Filename Strategy (Cache Busting)

To handle CDN cache invalidation when updating content, use **unique filenames**:

```typescript
// Generate unique filename with timestamp
const generateKey = (filename: string) => {
  const timestamp = Date.now();
  const ext = filename.split('.').pop();
  const name = filename.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');
  return `banners/${name}-${timestamp}.${ext}`;
};
// Result: banners/hero-banner-1704412800000.jpg
```

---

## 11. Task Processing & Queue

### Decision: Inngest

Inngest is chosen for its:
- Serverless-friendly architecture
- Built for Next.js integration
- Easy local development
- Automatic retries and error handling

---

## 12. API Security

### AI API Proxying

All AI API calls **must** go through Next.js API Routes:

```
Client → /api/ai/stylize → External AI API
              │
              └─── API Key injected server-side
```

---

## 13. Performance Optimization

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

## 14. Environment Configuration

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

## 15. Development Workflow

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

## 16. Decisions Made & Open Questions

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

## 17. AI SDK Integration

### Overview

The admin app uses **Vercel AI SDK** for all AI-powered features. Multiple providers are supported with a unified interface for text generation, image generation, and image processing.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AI SDK Provider Layer                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐            │
│  │    OpenAI       │   │     Google      │   │     Fal.ai      │            │
│  │  @ai-sdk/openai │   │  @ai-sdk/google │   │   @ai-sdk/fal   │            │
│  ├─────────────────┤   ├─────────────────┤   ├─────────────────┤            │
│  │ • GPT-4o        │   │ • Gemini 2.0    │   │ • BRIA RMBG 2.0 │            │
│  │ • GPT-4o Mini   │   │ • Gemini 1.5    │   │ • Image Gen     │            │
│  │ • GPT-4 Turbo   │   │ • Gemini 2.5    │   │ • Image Upscale │            │
│  │ • GPT-Image-1   │   │   Flash Image   │   │ • Image Rerender│            │
│  │ • GPT-Image-1.5 │   │ • Gemini 3 Pro  │   │                 │            │
│  │                 │   │   Image Preview │   │                 │            │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘            │
│           │                      │                      │                    │
│           └──────────────────────┼──────────────────────┘                    │
│                                  ▼                                           │
│                        ┌─────────────────────┐                               │
│                        │   AI SDK Core       │                               │
│                        │   - streamText      │                               │
│                        │   - generateText    │                               │
│                        │   - generateImage   │                               │
│                        └──────────┬──────────┘                               │
│                                   │                                          │
│                                   ▼                                          │
│                        ┌─────────────────────┐                               │
│                        │   Chat API Route    │                               │
│                        │   /api/chat         │                               │
│                        └─────────────────────┘                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Supported Models

#### Text Generation Models

| Provider | Model ID | Display Name | Description |
|----------|----------|--------------|-------------|
| OpenAI | `gpt-4o-mini` | GPT-4o Mini | Fast & affordable |
| OpenAI | `gpt-4o` | GPT-4o | Most capable |
| OpenAI | `gpt-4-turbo` | GPT-4 Turbo | Fast GPT-4 |
| Google | `gemini-2.0-flash` | Gemini 2.0 Flash | Fast & smart |
| Google | `gemini-1.5-pro` | Gemini 1.5 Pro | Advanced reasoning |

#### Image Generation Models

| Provider | Model ID | Display Name | Supports Input Images |
|----------|----------|--------------|----------------------|
| OpenAI | `gpt-image-1` | GPT Image 1 | ✅ (up to 16) |
| OpenAI | `gpt-image-1.5` | GPT Image 1.5 | ✅ (up to 16) |
| Google | `gemini-2.5-flash-preview-image-generation` | Gemini 2.5 Flash Image | ✅ (up to 16) |
| Google | `gemini-3-pro-image-preview` | Gemini 3 Pro Image | ✅ (up to 16) |

#### Image Processing Models (Fal.ai)

| Tool | Model | Capability |
|------|-------|------------|
| Background Remove | `fal-ai/bria/background/remove` | Remove image backgrounds |
| Image Generate | Various Fal models | Generate images from prompts |
| Image Upscale | Fal upscaling models | Enhance image resolution |
| Image Rerender | Fal rendering models | Restyle images |

### Implementation

#### Provider Configuration

```typescript
// lib/ai/chat-providers.ts
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const providers = {
  openai: () => createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  google: () => createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY }),
};
```

#### Chat API Route

The `/api/chat` route handles all chat requests with automatic routing based on model capability:

```typescript
// Text models → streamText (streaming response)
if (modelConfig.capability === 'text') {
  return streamText({ model, messages }).toUIMessageStreamResponse();
}

// Image models → generateImage/generateText (JSON response)
if (modelConfig.capability === 'image-generation') {
  if (modelConfig.provider === 'openai') {
    return handleOpenAIImageGeneration(messages, modelConfig);
  } else {
    return handleGoogleImageGeneration(messages, modelConfig);
  }
}
```

#### Client-Side Integration

The chat component uses `@ai-sdk/react`'s `useChat` hook for real-time streaming:

```typescript
import { useChat } from '@ai-sdk/react';

const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
  body: { modelId, conversationId },
});
```

### Environment Variables

```bash
# AI API Keys
OPENAI_API_KEY=sk-...                          # OpenAI API key
GOOGLE_GENERATIVE_AI_API_KEY=...               # Google AI API key
FAL_API_KEY=...                                # Fal.ai API key
```

---

## 18. CloudFront Signed URLs

### Overview

Private S3 buckets (`magiworld-admin-assets`) are accessed via CloudFront with signed URLs for secure, time-limited access.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CloudFront Signed URL Flow                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Admin App (3002)                                                           │
│         │                                                                     │
│         ▼                                                                     │
│   ┌─────────────────┐                                                        │
│   │  Upload Route   │ ──► S3 Presigned URL ──► magiworld-admin-assets       │
│   │  /api/upload    │                              (Private Bucket)          │
│   └────────┬────────┘                                    │                   │
│            │                                             │                   │
│            ▼                                             ▼                   │
│   ┌─────────────────┐                         ┌─────────────────────┐       │
│   │   Database      │                         │    CloudFront       │       │
│   │   (media table) │                         │    Distribution     │       │
│   │   Stores URL:   │                         │    (OAC enabled)    │       │
│   │   cf-url/key    │                         └──────────┬──────────┘       │
│   └────────┬────────┘                                    │                   │
│            │                                             │                   │
│            ▼                                             ▼                   │
│   ┌─────────────────┐         Sign URL        ┌─────────────────────┐       │
│   │   maybeSignUrl  │ ◄──────────────────────►│   Private Key       │       │
│   │   Utility       │                         │   (RSA)             │       │
│   └────────┬────────┘                         └─────────────────────┘       │
│            │                                                                  │
│            ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │   Signed URL with expiry:                                            │   │
│   │   https://admin.cloudfront.net/media/image.jpg                       │   │
│   │   ?Expires=1234567890&Signature=...&Key-Pair-Id=...                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Implementation

#### Signing Utility

```typescript
// lib/cloudfront.ts
import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

export function signCloudFrontUrl(url: string, expirySeconds = 3600): string {
  return getSignedUrl({
    url,
    keyPairId: process.env.CLOUDFRONT_KEY_PAIR_ID,
    dateLessThan: new Date(Date.now() + expirySeconds * 1000),
    privateKey: process.env.CLOUDFRONT_PRIVATE_KEY,
  });
}

// Sign only if URL is from admin CloudFront distribution
export function maybeSignUrl(url: string, expirySeconds?: number): string {
  const adminUrl = process.env.CLOUDFRONT_ADMIN_URL;
  if (!adminUrl || !url.startsWith(adminUrl)) return url;
  if (!isSignedUrlsEnabled()) return url;
  return signCloudFrontUrl(url, expirySeconds);
}
```

#### Usage Patterns

```typescript
// When loading library items for display
const signedUrls = mediaItems.map(item => maybeSignUrl(item.url));

// When sending images to AI API (longer expiry for processing)
const signedUrl = maybeSignUrl(imageUrl, 3600); // 1 hour for AI processing

// When returning chat messages with images
const signedMessages = messages.map(msg => ({
  ...msg,
  content: signMessageContent(msg.content), // Signs embedded URLs
}));
```

### Environment Variables

```bash
# CloudFront Configuration
CLOUDFRONT_ADMIN_URL=https://admin-assets.cloudfront.net  # Admin assets distribution
CLOUDFRONT_URL=https://cdn.magiworld.ai                   # Public CDN distribution
CLOUDFRONT_KEY_PAIR_ID=K...                               # CloudFront key pair ID
CLOUDFRONT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."  # RSA private key
CLOUDFRONT_SIGNED_URL_EXPIRY=3600                         # Default expiry (seconds)
```

### Bucket Configuration

| Bucket | CloudFront | Signed URLs | Use Case |
|--------|------------|-------------|----------|
| `magiworld-admin-assets` | ✅ OAC | ✅ Required | Admin library, AI chat images |
| `magiworld-cdn` | ✅ Public | ❌ Not needed | Banners, tool images (public) |
| `magiworld-user-uploads` | ❌ Direct S3 | ✅ Presigned | User uploads (via presigned) |

---

## 19. Magi AI Assistant

### Overview

Magi is the admin's AI assistant providing a unified chat interface with support for:
- **Text conversations** with GPT-4o and Gemini models
- **Image generation** with OpenAI and Google image models
- **Image editing** by uploading images and providing prompts
- **AI image tools** (background removal, upscaling, rerendering)

### Database Schema

```sql
-- Conversations
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP  -- Soft delete
);

-- Messages (AI SDK compatible)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP  -- Soft delete
);
```

### Message Content Format

Messages support multiple content types stored as JSON:

```typescript
// Plain text
{ type: 'text', text: 'Hello!' }

// User message with images
{
  type: 'user-with-images',
  text: 'What is in this image?',
  images: [{ url: 'https://cf.../image.jpg' }]
}

// AI-generated image response
{
  type: 'image-generation',
  text: 'Generated image for: "a sunset over mountains"',
  images: [{ url: 'https://cf.../generated.png' }]
}
```

### Features

| Feature | Description |
|---------|-------------|
| **Model Switching** | Switch between OpenAI and Google models mid-conversation |
| **Image Upload** | Upload up to 16 images for vision/editing models |
| **Image Generation** | Generate images from text prompts |
| **Image Editing** | Edit uploaded images with text instructions |
| **Save to Library** | Save generated images to admin media library |
| **Conversation History** | Persist conversations with soft delete |
| **Streaming Responses** | Real-time streaming for text models |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Chat with AI (streaming or JSON response) |
| `/api/upload` | POST | Upload images for chat (route: `chatImages`) |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-31 | Initial design specification |
| 2.0 | 2024-12-31 | Replaced Payload CMS with custom Admin app |
| 3.0 | 2025-01-02 | Added Theme System (next-themes), Logto authentication, Profile page |
| 3.1 | 2025-01-04 | Added Tool Registry Pattern for slug validation between web and admin apps |
| 4.0 | 2025-01-06 | Added AI SDK Integration, CloudFront Signed URLs, Magi AI Assistant |
