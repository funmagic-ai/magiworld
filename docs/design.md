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
17. [AI SDK Integration](#17-ai-sdk-integration)
18. [CloudFront Signed URLs](#18-cloudfront-signed-urls)
19. [Magi AI Assistant](#19-magi-ai-assistant)
20. [Web App Tools](#20-web-app-tools)
21. [Shared Utilities (Admin App)](#21-shared-utilities-admin-app)
22. [OEM/White-Label System](#22-oemwhite-label-system)
23. [Attribution Tracking](#23-attribution-tracking)
24. [Admin User Management](#24-admin-user-management)

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
  '3d-crystal',
  // Add new tool slugs here
] as const;

export type RegisteredToolSlug = typeof TOOL_REGISTRY[number];
```

```typescript
// apps/web/components/tools/tool-router.tsx
import { TOOL_REGISTRY } from '@magiworld/types';

const TOOL_COMPONENTS: Record<string, React.ComponentType<{ tool: ToolData }>> = {
  'background-remove': BackgroundRemoveInterface,
  '3d-crystal': Crystal3DInterface,
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

#### Content Management Tables
- `tool_types` + `tool_type_translations` - Tool classifications (slug, badgeColor, order, isActive)
- `tools` + `tool_translations` - Individual AI tools (aiEndpoint, promptTemplate, thumbnailUrl, configJson)
- `home_banners` + `home_banner_translations` - Homepage banners (type: 'main' | 'side')
- `folders` - Hierarchical media organization (self-referencing parentId)
- `media` - Uploaded media files (url, mimeType, dimensions, size)

#### User Tables
- `users` - Web app users synced from Logto (logtoId, email, locale, colorMode, registrationBrandId)
- `admin_users` - Admin dashboard users (email required, isActive flag for soft disable)

#### OEM & White-Label Tables
- `oem_software_brands` - White-label brand configurations (softwareId, themeConfig, allowedToolTypeIds)

#### Task Tables
- `tasks` - User-generated AI tasks (userId, toolId, inputParams, outputType, outputData, status)

#### Attribution Tables
- `user_attributions` - First-touch UTM tracking at registration
- `user_logins` - Per-session login tracking (brandId, channel, ipAddress, userAgent)
- `payment_attributions` - Last-touch payment attribution (paymentId, amount, currency, UTM params)

### 5.2 Entity Relationship

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CONTENT MANAGEMENT                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐     ┌─────────────────────────┐                        │
│  │   tool_types    │────▶│  tool_type_translations │                        │
│  └────────┬────────┘     └─────────────────────────┘                        │
│           │ 1:N                                                              │
│           ▼                                                                  │
│  ┌─────────────────┐     ┌─────────────────────────┐                        │
│  │     tools       │────▶│    tool_translations    │                        │
│  └────────┬────────┘     └─────────────────────────┘                        │
│           │                                                                  │
│  ┌─────────────────┐     ┌─────────────────────────┐                        │
│  │  home_banners   │────▶│ home_banner_translations│                        │
│  └─────────────────┘     └─────────────────────────┘                        │
│                                                                               │
│  ┌─────────────────┐     ┌─────────────────────────┐                        │
│  │    folders      │────▶│        media            │                        │
│  │ (self-referencing)    └─────────────────────────┘                        │
│  └─────────────────┘                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER & OEM SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────┐                                                     │
│  │ oem_software_brands │◀─────────────────────────────────┐                 │
│  └──────────┬──────────┘                                  │                 │
│             │ 1:N                                         │ N:1             │
│             ▼                                             │                 │
│  ┌─────────────────────┐     ┌─────────────────────┐     │                 │
│  │       users         │────▶│  user_attributions  │     │                 │
│  │ (registrationBrandId)     │   (first-touch UTM) │     │                 │
│  └──────────┬──────────┘     └─────────────────────┘     │                 │
│             │ 1:N                                         │                 │
│             ├────────────────▶┌─────────────────────┐    │                 │
│             │                 │    user_logins      │────┘                 │
│             │                 │ (per-session track) │                       │
│             │                 └─────────────────────┘                       │
│             │                                                                │
│             ├────────────────▶┌─────────────────────┐                       │
│             │                 │ payment_attributions│                       │
│             │                 │  (last-touch UTM)   │                       │
│             │                 └─────────────────────┘                       │
│             │                                                                │
│             └────────────────▶┌─────────────────────┐                       │
│                               │       tasks         │                       │
│                               │ (AI generation jobs)│                       │
│                               └─────────────────────┘                       │
│                                                                               │
│  ┌─────────────────────┐                                                     │
│  │    admin_users      │  (separate from web users for security)            │
│  └─────────────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
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

> **Decision**: AWS S3 with 4-Bucket Architecture + CloudFront CDN

### Architecture Overview

We use **four separate S3 buckets** with CloudFront for better isolation, security, and access control:

| Bucket | Purpose | Access | CloudFront |
|--------|---------|--------|------------|
| `funmagic-admin-users-assets` | Admin library & Magi-generated files | Private (Signed URLs) | Required |
| `funmagic-web-public-assets` | Banners, tool thumbnails, UI assets | Public | Required (no auth) |
| `funmagic-web-users-assets-private` | Web user uploads & AI results | Private (Signed URLs) | Required |
| `funmagic-web-users-assets-shared` | User-shared files (public links) | Public | Required (no auth) |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         S3 + CloudFront Architecture                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Admin App (3002)                           Web App (3000)                  │
│        │                                           │                          │
│        ▼                                           ▼                          │
│   ┌─────────────┐                           ┌─────────────┐                  │
│   │   Upload    │                           │   Upload    │                  │
│   └──────┬──────┘                           └──────┬──────┘                  │
│          │                                         │                          │
│    ┌─────┴─────┐                            ┌──────┴──────┐                  │
│    ▼           ▼                            ▼             ▼                  │
│ ┌────────┐ ┌────────┐                 ┌──────────┐ ┌──────────┐             │
│ │ admin_ │ │public_ │                 │web_users_│ │web_users_│             │
│ │ users_ │ │assets  │                 │ assets_  │ │ assets_  │             │
│ │ assets │ │        │                 │ private  │ │ shared   │             │
│ │(Private│ │(Public)│                 │(Private) │ │ (Public) │             │
│ └───┬────┘ └───┬────┘                 └────┬─────┘ └────┬─────┘             │
│     │          │                           │            │                    │
│     ▼          ▼                           ▼            ▼                    │
│ ┌────────────────────┐               ┌────────────────────────┐             │
│ │  CloudFront (OAC)  │               │    CloudFront (OAC)    │             │
│ │  + Signed URLs     │               │    + Signed URLs       │             │
│ └─────────┬──────────┘               └──────────┬─────────────┘             │
│           │                                      │                           │
│           ▼                                      ▼                           │
│ ┌────────────────────┐               ┌────────────────────────┐             │
│ │  CloudFront (CDN)  │               │    CloudFront (CDN)    │             │
│ │  Public Access     │               │    Public Access       │             │
│ └────────────────────┘               └────────────────────────┘             │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Bucket Structure

#### 1. funmagic-admin-users-assets (Private)

Admin users' library uploads and Magi tool generated files.

```
funmagic-admin-users-assets/
└── {userid}/
    └── library/
        ├── upload/
        │   └── {yyyymmdd}/
        │       └── {filename}
        └── generated/
            ├── magi-chat/
            │   └── {yyyymmdd}/
            │       └── {filename}
            └── {tool-slug}/
                └── {yyyymmdd}/
                    └── {filename}
```

#### 2. funmagic-web-public-assets (Public)

Banners, tool thumbnails, and static UI assets.

```
funmagic-web-public-assets/
├── banners/
│   ├── main/
│   │   └── {name}-{timestamp}.jpg
│   └── side/
│       └── {name}-{timestamp}.jpg
├── tools/
│   └── {tool-slug}/
│       ├── thumbnail/
│       │   └── {filename}
│       └── page_banner/
│           └── {filename}
├── ui/
│   └── {icons, placeholders, etc.}
└── fonts/
    └── {custom-fonts}
```

#### 3. funmagic-web-users-assets-private (Private)

Web users' uploaded and AI-generated files.

```
funmagic-web-users-assets-private/
└── {userid}/
    └── {tool-slug}/
        ├── upload/
        │   └── {yyyymmdd}/
        │       └── {filename}
        └── generated/
            └── {yyyymmdd}/
                └── {filename}
```

#### 4. funmagic-web-users-assets-shared (Public)

Files shared publicly by users (copied from private bucket).

```
funmagic-web-users-assets-shared/
└── {userid}/
    └── {share-id}/
        ├── {filename}
        └── metadata.json   # Optional: share info
```

**Share workflow:**
1. User clicks "Share" on a private file
2. System generates unique `share-id`
3. File is copied from `funmagic-web-users-assets-private` to `funmagic-web-users-assets-shared`
4. Public URL is returned for sharing
5. User can "Unshare" to delete from shared bucket

### CloudFront Distributions

| Distribution | Origin Bucket | Access Control |
|--------------|---------------|----------------|
| `funmagic-cf-admin-private` | `funmagic-admin-users-assets` | OAC + Signed URLs |
| `funmagic-cf-public` | `funmagic-web-public-assets` | Public (no auth) |
| `funmagic-cf-web-private` | `funmagic-web-users-assets-private` | OAC + Signed URLs |
| `funmagic-cf-web-shared` | `funmagic-web-users-assets-shared` | Public (no auth) |

### Security Configuration

#### IAM Policies

**Admin App:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AdminAssetsAccess",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::funmagic-admin-users-assets",
        "arn:aws:s3:::funmagic-admin-users-assets/*"
      ]
    },
    {
      "Sid": "PublicAssetsAccess",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::funmagic-web-public-assets/banners/*",
        "arn:aws:s3:::funmagic-web-public-assets/tools/*"
      ]
    }
  ]
}
```

**Web App:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "WebPrivateAccess",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::funmagic-web-users-assets-private/*"]
    },
    {
      "Sid": "WebSharedAccess",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": ["arn:aws:s3:::funmagic-web-users-assets-shared/*"]
    },
    {
      "Sid": "PublicAssetsRead",
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::funmagic-web-public-assets/*"]
    }
  ]
}
```

### CORS Configuration

Apply to all buckets:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3002",
      "https://funmagic.ai",
      "https://admin.funmagic.ai"
    ],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

### Lifecycle Policies

| Bucket | Path | Retention |
|--------|------|-----------|
| `funmagic-admin-users-assets` | `*/library/*` | Permanent |
| `funmagic-web-users-assets-private` | `*/upload/*` | 30 days |
| `funmagic-web-users-assets-private` | `*/generated/*` | 90 days |
| `funmagic-web-users-assets-shared` | `*` | Until user unshares |

### Cache Strategy

| Content Type | Cache-Control | CDN TTL |
|--------------|---------------|---------|
| Private assets | `private, max-age=3600` | 1 hour |
| Public banners | `public, max-age=86400` | 1 day |
| Public static | `public, max-age=31536000, immutable` | 1 year |

### Filename Strategy (Cache Busting)

For public assets, use **unique filenames** to handle cache invalidation:

```typescript
// Generate unique filename with timestamp
const generateKey = (filename: string, folder: string) => {
  const timestamp = Date.now();
  const ext = filename.split('.').pop();
  const name = filename.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');
  return `${folder}/${name}-${timestamp}.${ext}`;
};
// Result: banners/main/hero-banner-1704412800000.jpg
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

# ==============================================
# Database (REQUIRED)
# ==============================================
DATABASE_URL=postgresql://user:password@localhost:9000/magi-db

# ==============================================
# AWS S3 Storage - 4-Bucket Architecture (REQUIRED)
# ==============================================
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# Admin App Buckets
S3_ADMIN_ASSETS_BUCKET=funmagic-admin-users-assets
S3_PUBLIC_ASSETS_BUCKET=funmagic-web-public-assets

# Web App Buckets
S3_WEB_PRIVATE_BUCKET=funmagic-web-users-assets-private
S3_WEB_SHARED_BUCKET=funmagic-web-users-assets-shared

# ==============================================
# CloudFront CDN (REQUIRED)
# ==============================================
# Public CDN - serves banners, tool images, brand logos
CLOUDFRONT_PUBLIC_URL=https://d1arbct25l8u2x.cloudfront.net
CLOUDFRONT_WEB_SHARED_URL=https://shared.funmagic.ai

# Private CDN - serves user assets (requires signed URLs)
CLOUDFRONT_ADMIN_PRIVATE_URL=https://d2wcxayah4inv3.cloudfront.net
CLOUDFRONT_WEB_PRIVATE_URL=https://d1jmkr23cr2ayz.cloudfront.net

# CloudFront signed URL configuration
CLOUDFRONT_KEY_PAIR_ID=
CLOUDFRONT_PRIVATE_KEY=

# ==============================================
# Client-side Environment Variables
# ==============================================
NEXT_PUBLIC_CLOUDFRONT_URL=https://d1arbct25l8u2x.cloudfront.net
NEXT_PUBLIC_CLOUDFRONT_ADMIN_URL=https://d2wcxayah4inv3.cloudfront.net

# ==============================================
# Upload Configuration (OPTIONAL)
# ==============================================
UPLOAD_MAX_SIZE_MB=20
NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB=20

# ==============================================
# AI APIs
# ==============================================
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
FAL_API_KEY=

# ==============================================
# Job Queue (Inngest)
# ==============================================
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# ==============================================
# Authentication (Logto)
# ==============================================
# Web App (port 3000)
LOGTO_ENDPOINT=
LOGTO_APP_ID=
LOGTO_APP_SECRET=
LOGTO_BASE_URL=http://localhost:3000
LOGTO_COOKIE_SECRET=

# Admin App (port 3001)
LOGTO_ADMIN_ENDPOINT=
LOGTO_ADMIN_APP_ID=
LOGTO_ADMIN_APP_SECRET=
LOGTO_ADMIN_BASE_URL=http://localhost:3001
LOGTO_ADMIN_COOKIE_SECRET=
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
| Web | http://localhost:3000 | funmagic.ai |
| Admin | http://localhost:3002 | admin.funmagic.ai |

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
| Background Remove | `fal-ai/bria/background/remove` | Remove image backgrounds using BRIA RMBG 2.0 |
| Image Generate | `fal-ai/flux/schnell` | Generate images from prompts (supports aspect ratios: 1:1, 16:9, 9:16, 4:3, 3:4) |
| Image Upscale | Fal upscaling models | Enhance image resolution |
| Image Rerender | Fal rendering models | Restyle images |

#### Admin App AI Tools (lib/ai/tools/)

The admin app includes specialized AI tools located in `apps/admin/lib/ai/tools/`:

```
lib/ai/tools/
├── index.ts              # Tool registry and exports
├── background-remove.ts  # BRIA RMBG 2.0 integration
├── image-generate.ts     # Flux Schnell image generation
├── image-upscale.ts      # Image upscaling
├── image-rerender.ts     # Image re-rendering
└── nanobanana-pro.ts     # NanoBanana Pro integration
```

**Background Remove Tool:**
```typescript
// Uses Fal.ai BRIA RMBG 2.0
import { fal } from '@fal-ai/client';

const result = await fal.subscribe('fal-ai/bria/background/remove', {
  input: { image_url: signedUrl },
});
```

**Image Generate Tool:**
```typescript
// Uses Fal.ai Flux Schnell with aspect ratio support
const aspectRatios = {
  '1:1': 'square',
  '16:9': 'landscape_16_9',
  '9:16': 'portrait_16_9',
  '4:3': 'landscape_4_3',
  '3:4': 'portrait_4_3',
};

const result = await fal.subscribe('fal-ai/flux/schnell', {
  input: {
    prompt,
    image_size: aspectRatios[ratio],
    num_inference_steps: 4,
  },
});
```

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

Private S3 buckets (`funmagic-admin-assets`) are accessed via CloudFront with signed URLs for secure, time-limited access.

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
│   │  Upload Route   │ ──► S3 Presigned URL ──► funmagic-admin-assets       │
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
CLOUDFRONT_URL=https://cdn.funmagic.ai                   # Public CDN distribution
CLOUDFRONT_KEY_PAIR_ID=K...                               # CloudFront key pair ID
CLOUDFRONT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."  # RSA private key
CLOUDFRONT_SIGNED_URL_EXPIRY=3600                         # Default expiry (seconds)
```

### Bucket Configuration

| Bucket | CloudFront | Signed URLs | Use Case |
|--------|------------|-------------|----------|
| `funmagic-admin-assets` | ✅ OAC | ✅ Required | Admin library, AI chat images |
| `funmagic-cdn` | ✅ Public | ❌ Not needed | Banners, tool images (public) |
| `funmagic-user-uploads` | ❌ Direct S3 | ✅ Presigned | User uploads (via presigned) |

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

## 20. Web App Tools

### Registered Tools

The web app includes specialized AI tools with custom interfaces. Each tool is registered in `TOOL_REGISTRY` and has a corresponding React component.

| Tool Slug | Component | Description |
|-----------|-----------|-------------|
| `background-remove` | `BackgroundRemoveInterface` | AI-powered background removal using Fal.ai BRIA RMBG 2.0 |
| `3d-crystal` | `Crystal3DInterface` | 3D crystal engraving preview with image cropping |

### Background Remove Tool

The Background Remove tool (`background-remove`) uses Fal.ai's BRIA RMBG 2.0 model for high-quality background removal.

#### Features

- **Image Upload**: Drag-and-drop or click to upload images
- **Real-time Processing**: Shows processing status with loading indicator
- **Result Preview**: Side-by-side comparison of original and processed images
- **Download**: Download the processed image with transparent background

#### Component Structure

```
apps/web/components/tools/background-remove/
├── index.tsx          # Main BackgroundRemoveInterface component
├── image-uploader.tsx # Upload area with drag-and-drop
└── result-preview.tsx # Before/after comparison view
```

#### API Integration

```typescript
// Calls admin API which proxies to Fal.ai
const response = await fetch('/api/ai/background-remove', {
  method: 'POST',
  body: JSON.stringify({ imageUrl }),
});
```

### 3D Crystal Tool

The 3D Crystal tool (`3d-crystal`) allows users to preview how their images will look when laser-engraved inside a crystal block.

#### Features

- **Tabbed Interface**: Image tab for upload/crop, 3D Crystal tab for preview
- **Image Cropping**: Built-in cropper with aspect ratio constraints
- **3D Preview**: Real-time Three.js visualization with:
  - Rotating crystal cube with glass-like material
  - Image rendered as 3D texture using Canvas
  - Orbit controls for 360° viewing
  - Customizable text overlay on the crystal
- **Responsive UI**: Full-width upload area on large screens, mobile-optimized layout

#### Technical Implementation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        3D Crystal Tool Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Crystal3DInterface (index.tsx)                                             │
│   ├── Tabs Component (Base UI)                                               │
│   │   ├── Image Tab                                                          │
│   │   │   ├── Upload Area (drag & drop)                                      │
│   │   │   └── ImageCropper (embedded mode)                                   │
│   │   │       └── react-cropper / cropperjs                                  │
│   │   │                                                                       │
│   │   └── 3D Crystal Tab                                                     │
│   │       ├── CubeViewer (Three.js canvas)                                   │
│   │       │   ├── Crystal cube (MeshPhysicalMaterial)                        │
│   │       │   └── Text3D (Canvas texture + Double-Plane)                     │
│   │       └── Controls (text input, re-crop, change image)                   │
│   │                                                                           │
│   └── State Management                                                        │
│       ├── imageState: 'upload' | 'cropping' | 'preview'                      │
│       ├── rawImage: string | null                                             │
│       ├── croppedImage: string | null                                         │
│       └── customText: string                                                  │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Key Technologies

| Technology | Purpose |
|------------|---------|
| `@react-three/fiber` | React renderer for Three.js |
| `@react-three/drei` | Helper components (OrbitControls, etc.) |
| `three` | 3D graphics library |
| `react-cropper` | Image cropping UI |
| `cropperjs` | Cropping engine |

#### Canvas Texture Approach

For rendering text on the crystal (including CJK characters), we use a Canvas-based approach:

```typescript
// Create canvas with text
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.font = '48px sans-serif';
ctx.fillText(text, x, y);

// Use as texture
const texture = new THREE.CanvasTexture(canvas);
```

**Double-Plane Sandwich Technique**: Two planes positioned back-to-back ensure text is visible from both sides of the crystal:

```typescript
<group>
  {/* Front-facing plane */}
  <mesh position={[0, 0, 0.01]}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial map={texture} transparent />
  </mesh>
  {/* Back-facing plane (rotated 180°) */}
  <mesh position={[0, 0, -0.01]} rotation={[0, Math.PI, 0]}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial map={texture} transparent />
  </mesh>
</group>
```

#### Component Files

```
apps/web/components/tools/3d-crystal/
├── index.tsx          # Main Crystal3DInterface with tabs and state
├── cube-viewer.tsx    # Three.js canvas with crystal cube and text
└── image-cropper.tsx  # Cropper component (embedded or dialog mode)
```

---

## 21. Shared Utilities (Admin App)

### Overview

The admin app includes centralized utility functions for common operations like file validation, image dimension detection, and upload configuration. These utilities ensure consistency and reduce code duplication across components.

### 21.1 Upload Configuration

Upload size limits are centralized via environment variables, allowing easy configuration without code changes.

#### Environment Variables

```bash
# Server-side limit (API routes)
UPLOAD_MAX_SIZE_MB=20

# Client-side limit (form validation) - must match server-side
NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB=20
```

#### Usage

```typescript
// lib/env.ts - Server-side
import { getUploadMaxSize, getUploadMaxSizeMB } from '@/lib/env';

const maxBytes = getUploadMaxSize();      // e.g., 20971520 (20MB in bytes)
const maxMB = getUploadMaxSizeMB();       // e.g., 20

// lib/utils/file.ts - Client-side (reads from NEXT_PUBLIC_*)
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from '@/lib/utils/file';

if (file.size > MAX_FILE_SIZE) {
  throw new Error(`File too large. Max: ${MAX_FILE_SIZE_MB}MB`);
}
```

### 21.2 File Validation Utilities

Located at `lib/utils/file.ts`, provides file type and size validation.

```typescript
import {
  isValidImageType,
  isValidFileSize,
  validateFile,
  getFileExtension,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB
} from '@/lib/utils/file';

// Validate file type (image only)
const isImage = isValidImageType(file);  // true for jpg, png, gif, webp

// Validate file size
const isSizeOk = isValidFileSize(file);  // true if under MAX_FILE_SIZE

// Combined validation with error messages
const result = validateFile(file);
if (!result.valid) {
  console.error(result.error);  // "File type not allowed" or "File too large"
}
```

### 21.3 Image Dimension Utilities

Located at `lib/utils/image.ts`, provides image dimension detection and aspect ratio validation.

#### Core Functions

```typescript
import {
  getImageDimensions,
  getImageDimensionsFromUrl,
  calculateAspectRatio,
  validateAspectRatio,
  isSquare,
  validateMinDimensions,
  ASPECT_RATIOS,
  DEFAULT_RATIO_TOLERANCE,
} from '@/lib/utils/image';

// Get dimensions from File object
const { width, height } = await getImageDimensions(file);

// Get dimensions from URL
const dims = await getImageDimensionsFromUrl('https://example.com/image.jpg');

// Calculate aspect ratio
const ratio = calculateAspectRatio({ width: 1920, height: 1080 });  // 1.777...

// Validate aspect ratio with tolerance
const result = validateAspectRatio(
  { width: 1920, height: 1080 },  // dimensions
  16 / 9,                          // expected ratio
  '16:9',                          // label for display
  0.05                             // tolerance (5%)
);
// result: { isMatch: true, actualRatio: 1.777, actualRatioFormatted: '16:9', ... }

// Check if image is square
const square = isSquare({ width: 500, height: 500 });  // true

// Validate minimum dimensions
const minCheck = validateMinDimensions({ width: 800, height: 600 }, 1024, 768);
// { isValid: false, error: 'Image must be at least 1024x768 pixels' }
```

#### Predefined Aspect Ratios

```typescript
export const ASPECT_RATIOS = {
  '1:1':   { ratio: 1,      label: '1:1 (Square)' },
  '4:3':   { ratio: 4/3,    label: '4:3 (Standard)' },
  '16:9':  { ratio: 16/9,   label: '16:9 (Widescreen)' },
  '21:9':  { ratio: 21/9,   label: '21:9 (Ultra-wide)' },
  '3:4':   { ratio: 3/4,    label: '3:4 (Portrait)' },
  '9:16':  { ratio: 9/16,   label: '9:16 (Mobile)' },
};
```

#### React Hook

The `useImageDimensions` hook automatically extracts dimensions and creates preview URLs for uploaded files.

```typescript
import { useImageDimensions } from '@/lib/utils/image';

function ImageUploader() {
  const [file, setFile] = useState<File | null>(null);
  const { dimensions, previewUrl, loading, error } = useImageDimensions(file);

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      {loading && <p>Loading dimensions...</p>}
      {error && <p>Error: {error}</p>}

      {dimensions && (
        <p>Size: {dimensions.width} x {dimensions.height}</p>
      )}

      {previewUrl && (
        <img src={previewUrl} alt="Preview" />
      )}
    </div>
  );
}
```

#### Hook Return Type

```typescript
interface UseImageDimensionsResult {
  dimensions: ImageDimensions | null;  // { width, height }
  previewUrl: string | null;           // Object URL for preview
  loading: boolean;                    // True while processing
  error: string | null;                // Error message if failed
}
```

### 21.4 Usage in Form Components

The utilities are used in form components for image validation:

#### Banner Form (banner-form.tsx)

```typescript
const { dimensions: imageDimensions, previewUrl } = useImageDimensions(pendingFile);

const getRatioStatus = () => {
  if (!imageDimensions) return null;
  const expected = EXPECTED_RATIOS[bannerType];  // 16:9 for main, 4:3 for side
  return validateAspectRatio(imageDimensions, expected.ratio, expected.label);
};
```

#### Tool Form (tool-form.tsx)

```typescript
const { dimensions: imageDimensions, previewUrl } = useImageDimensions(pendingFile);

// Validate 1:1 aspect ratio for tool thumbnails
const ratioResult = imageDimensions
  ? validateAspectRatio(imageDimensions, ASPECT_RATIOS['1:1'].ratio, '1:1')
  : null;
```

#### OEM Brand Form (oem-brand-form.tsx)

```typescript
const { dimensions: logoDimensions, previewUrl } = useImageDimensions(pendingFile);

// Validate square logo and minimum dimensions
const isLogoSquare = logoDimensions ? isSquare(logoDimensions) : false;
const minDimResult = logoDimensions
  ? validateMinDimensions(logoDimensions, 200, 200)
  : null;
```

---

## 22. OEM/White-Label System

### Overview

Magiworld supports white-label deployments for OEM partners (desktop software vendors). Each OEM brand can have custom theming, branding, and restricted tool access.

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OEM White-Label Flow                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Desktop Software (Partner A)                                               │
│          │                                                                   │
│          │ Opens browser with ?software_id=PARTNER_A_2024                   │
│          ▼                                                                   │
│   ┌─────────────────────┐                                                   │
│   │   Web App (3000)    │                                                   │
│   │   /api/brand/validate │◀───── Validates software_id                     │
│   └──────────┬──────────┘                                                   │
│              │                                                               │
│              ▼                                                               │
│   ┌─────────────────────┐     ┌─────────────────────┐                       │
│   │  Set Brand Cookie   │────▶│   oem_software_brands│                      │
│   │  (httpOnly, secure) │     │   (database lookup)  │                      │
│   └──────────┬──────────┘     └─────────────────────┘                       │
│              │                                                               │
│              ▼                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │   Themed Experience                                                   │   │
│   │   - Custom logo & brand name                                          │   │
│   │   - Theme palette (primaryColor, etc.)                                │   │
│   │   - Filtered tool types (allowedToolTypeIds)                          │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Database Schema

```typescript
export const oemSoftwareBrands = pgTable('oem_software_brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),           // URL-friendly identifier
  name: text('name').notNull(),                    // Display name for admin
  softwareId: text('software_id').notNull().unique(), // Unique ID from desktop software
  themeConfig: jsonb('theme_config'),              // { primaryColor, logo, brandName }
  allowedToolTypeIds: jsonb('allowed_tool_type_ids').$type<string[]>().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### Theme Configuration

```typescript
interface ThemeConfig {
  primaryColor?: string;    // e.g., '#FF5722'
  logo?: string;            // URL to brand logo
  brandName?: string;       // Display name in UI
  palette?: 'neutral' | 'green' | 'blue' | 'purple' | 'orange';
}
```

### Brand Context (Web App)

```typescript
// lib/brand.ts
export function getCurrentBrand(): OemSoftwareBrand | null;
export function setBrandCookie(brand: OemSoftwareBrand): void;
export function clearBrandCookie(): void;
export function getCurrentBrandPalette(): string;
export function isToolTypeAllowed(toolTypeId: string): boolean;
```

### Admin Management

OEM brands are managed via the admin app at `/oem-brands`:
- Create/Edit brand configurations
- Set theme palette and logo
- Configure allowed tool types (empty = all allowed)
- Enable/Disable brands

---

## 23. Attribution Tracking

### Overview

The platform implements comprehensive attribution tracking for marketing analytics:
- **First-Touch Attribution**: UTM parameters captured at user registration
- **Session Attribution**: Brand and channel tracked per login session
- **Last-Touch Payment Attribution**: UTM and brand at payment time

### First-Touch Attribution (user_attributions)

Captured once when user registers:

```typescript
export const userAttributions = pgTable('user_attributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id),
  utmSource: text('utm_source'),      // e.g., 'google', 'facebook'
  utmMedium: text('utm_medium'),      // e.g., 'cpc', 'email', 'social'
  utmCampaign: text('utm_campaign'),  // Campaign name
  utmTerm: text('utm_term'),          // Paid search keywords
  utmContent: text('utm_content'),    // A/B test variant
  referrerUrl: text('referrer_url'),  // Full referrer URL
  landingPage: text('landing_page'),  // First page visited
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### Session Attribution (user_logins)

Tracked per login session:

```typescript
export const userLogins = pgTable('user_logins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  brandId: uuid('brand_id').references(() => oemSoftwareBrands.id), // OEM brand if applicable
  channel: text('channel').notNull().default('web'),  // 'web' | 'desktop' | 'mobile'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### Payment Attribution (payment_attributions)

Last-touch data captured at payment:

```typescript
export const paymentAttributions = pgTable('payment_attributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  paymentId: text('payment_id').notNull(),  // External payment ID (e.g., Stripe)
  brandId: uuid('brand_id').references(() => oemSoftwareBrands.id),
  channel: text('channel').notNull().default('web'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  amount: integer('amount').notNull(),      // Amount in cents
  currency: text('currency').notNull().default('usd'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### Analytics Queries

```sql
-- Users by registration source
SELECT utm_source, COUNT(*) as users
FROM user_attributions
GROUP BY utm_source;

-- Revenue by OEM brand
SELECT b.name, SUM(p.amount) as revenue
FROM payment_attributions p
LEFT JOIN oem_software_brands b ON p.brand_id = b.id
GROUP BY b.name;

-- Daily active users by channel
SELECT DATE(created_at), channel, COUNT(DISTINCT user_id)
FROM user_logins
GROUP BY DATE(created_at), channel;
```

---

## 24. Admin User Management

### Overview

Admin users are stored in a separate table from web users for security isolation. They can be disabled without deletion using the `isActive` flag.

### Database Schema

```typescript
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  logtoId: text('logto_id').notNull().unique(),  // Logto user ID
  email: text('email').notNull(),                 // Required for admins
  name: text('name'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true),   // Soft disable
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
});
```

### Lazy Sync Pattern

Admin users are synced from Logto on each login (not via webhooks):

```typescript
// lib/admin-user.ts
export async function syncAdminUserFromLogto(logtoUser: LogtoUser): Promise<AdminUser> {
  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.logtoId, logtoUser.sub),
  });

  if (existing) {
    // Update profile and lastLoginAt
    return await db.update(adminUsers)
      .set({
        email: logtoUser.email,
        name: logtoUser.name,
        avatarUrl: logtoUser.picture,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(adminUsers.id, existing.id))
      .returning();
  }

  // Create new admin user
  return await db.insert(adminUsers)
    .values({
      logtoId: logtoUser.sub,
      email: logtoUser.email!,
      name: logtoUser.name,
      avatarUrl: logtoUser.picture,
      lastLoginAt: new Date(),
    })
    .returning();
}
```

### Disable vs Delete

```typescript
// Disable admin (reversible)
await db.update(adminUsers)
  .set({ isActive: false })
  .where(eq(adminUsers.id, userId));

// Re-enable admin
await db.update(adminUsers)
  .set({ isActive: true })
  .where(eq(adminUsers.id, userId));
```

### Access Control

The admin app checks `isActive` status on each request:

```typescript
// middleware or layout
const adminUser = await getAdminUser();
if (!adminUser || !adminUser.isActive) {
  redirect('/login?error=access_denied');
}
```

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-31 | Initial design specification |
| 2.0 | 2024-12-31 | Replaced Payload CMS with custom Admin app |
| 3.0 | 2025-01-02 | Added Theme System (next-themes), Logto authentication, Profile page |
| 3.1 | 2025-01-04 | Added Tool Registry Pattern for slug validation between web and admin apps |
| 4.0 | 2025-01-06 | Added AI SDK Integration, CloudFront Signed URLs, Magi AI Assistant |
| 5.0 | 2025-01-12 | Added Web App Tools section, 3D Crystal Tool documentation |
| 5.1 | 2025-01-12 | Updated File Storage Strategy to 4-bucket architecture |
| 5.2 | 2025-01-14 | Added Shared Utilities section (upload config, image dimension utilities) |
| 6.0 | 2025-01-14 | Major update: Updated database schema with new tables (users, admin_users, oem_software_brands, attribution tables), added OEM/White-Label System, Attribution Tracking, Admin User Management sections, updated environment variables documentation, expanded AI tools documentation with Fal.ai integration, added Background Remove tool documentation |
