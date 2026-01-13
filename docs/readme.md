# Magiworld AI Platform

Magiworld is an AI-powered creative platform with tools for image stylization, editing, 3D generation, and physical fabrication (e.g., crystal engraving).

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [Web App Tools](#web-app-tools)
- [Database Schema](#database-schema)
- [Internationalization (i18n)](#internationalization-i18n)
- [Theme System](#theme-system)
- [Authentication](#authentication)
- [AWS S3 Storage](#aws-s3-storage)
- [Development Guide](#development-guide)
- [Adding New Features](#adding-new-features)
- [Scripts Reference](#scripts-reference)
- [Troubleshooting](#troubleshooting)

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.1 (App Router) |
| Database | PostgreSQL + Drizzle ORM |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Theming | next-themes (5 colors + dark mode) |
| Monorepo | Turborepo + pnpm workspaces |
| i18n | next-intl (en, ja, pt, zh) |
| Authentication | Logto (@logto/next) |
| Type Safety | TypeScript 5.x |

## Project Structure

```
magiworld/
├── apps/
│   ├── web/                    # Frontend application (port 3000)
│   │   ├── app/[locale]/       # Localized pages (App Router)
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── tools/          # Tool-specific interfaces
│   │   │   │   ├── background-remove/
│   │   │   │   ├── 3d-crystal/
│   │   │   │   └── tool-router.tsx
│   │   │   └── home/           # Homepage components
│   │   ├── lib/
│   │   │   └── data/           # Data fetching functions
│   │   └── messages/           # i18n translation files
│   │
│   └── admin/                  # Admin dashboard (port 3002)
│       └── app/                # Admin pages (tools, tool-types, banners, media)
│
├── packages/
│   ├── db/                     # @magiworld/db - Database schema & client
│   │   ├── src/
│   │   │   ├── schema.ts       # Drizzle table definitions
│   │   │   └── index.ts        # Database client export
│   │   └── drizzle/            # Migration files
│   │
│   ├── types/                  # @magiworld/types - Shared TypeScript types
│   │   └── src/index.ts        # Application-level type definitions
│   │
│   └── utils/                  # @magiworld/utils - Shared utilities
│       └── src/index.ts        # Helper functions (slugify, formatDate, etc.)
│
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # pnpm workspace configuration
└── .env.example                # Environment variables template
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL)

### Quick Start

```bash
# 1. Clone and install dependencies
pnpm install

# 2. Start PostgreSQL with Docker
docker run --name magi-db -e POSTGRES_PASSWORD=yourpassword -p 9000:5432 -d postgres

# 3. Create database
docker exec -it magi-db psql -U postgres -c "CREATE DATABASE \"magi-db\";"

# 4. Copy environment file and configure
cp .env.example .env
# Edit .env with your DATABASE_URL: postgresql://postgres:yourpassword@localhost:9000/magi-db

# 5. Push schema and seed sample data
pnpm db:push
pnpm db:seed

# 6. Start development servers
pnpm dev
```

### App URLs

| App | URL | Description |
|-----|-----|-------------|
| Web | http://localhost:3000 | User-facing frontend |
| Admin | http://localhost:3002 | Content management dashboard |
| Drizzle Studio | http://localhost:4983 | Database GUI (run `pnpm db:studio`) |

## Architecture Overview

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web App       │     │   Admin App     │     │   AI Services   │
│   (Next.js)     │     │   (Next.js)     │     │   (External)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      @magiworld/db      │
                    │    (Drizzle ORM)        │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      PostgreSQL         │
                    │    (Docker: port 9000)  │
                    └─────────────────────────┘
```

### Key Concepts

1. **Tools**: AI-powered features (e.g., "Anime Style", "Photo Edit")
2. **Tool Types**: Classification of tools that determines UI component (e.g., "stylize", "edit", "3d_gen")
3. **Tasks**: User-generated AI processing jobs with status tracking

### Shared Packages

| Package | Import | Purpose |
|---------|--------|---------|
| `@magiworld/db` | `import { db, tools } from '@magiworld/db'` | Database client & schema |
| `@magiworld/types` | `import type { Tool } from '@magiworld/types'` | TypeScript interfaces |
| `@magiworld/utils` | `import { slugify } from '@magiworld/utils'` | Utility functions |

## Web App Tools

The web app includes specialized AI tools with custom interfaces. Each tool is registered in `TOOL_REGISTRY` and has a corresponding React component.

### Registered Tools

| Tool Slug | Component | Description |
|-----------|-----------|-------------|
| `background-remove` | `BackgroundRemoveInterface` | AI-powered background removal using Fal.ai |
| `3d-crystal` | `Crystal3DInterface` | 3D crystal engraving preview with image cropping |

### 3D Crystal Tool

The 3D Crystal tool allows users to preview how their images will look when laser-engraved inside a crystal block.

**Features:**
- **Tabbed Interface**: Image tab for upload/crop, 3D Crystal tab for preview
- **Image Cropping**: Built-in cropper with aspect ratio constraints
- **3D Preview**: Real-time Three.js visualization with:
  - Rotating crystal cube with glass-like material
  - Image rendered as 3D texture using Canvas
  - Orbit controls for 360° viewing
  - Customizable text overlay on the crystal
- **Responsive UI**: Full-width upload area on large screens, mobile-optimized layout

**Technical Implementation:**
- Uses `@react-three/fiber` and `@react-three/drei` for 3D rendering
- Canvas texture approach for text rendering (supports CJK characters)
- "Double-Plane Sandwich" technique: two planes back-to-back for bidirectional visibility
- Image cropping via `react-cropper` with `cropperjs`

**Component Structure:**
```
apps/web/components/tools/3d-crystal/
├── index.tsx          # Main Crystal3DInterface with tabs
├── cube-viewer.tsx    # Three.js canvas with crystal cube
└── image-cropper.tsx  # Cropper component (embedded or dialog mode)
```

## Database Schema

### Translation Pattern

The database uses a **translation table pattern** for i18n. Each content table has a corresponding translation table:

```
┌──────────────┐         ┌──────────────────────┐
│    tools     │ 1:N     │  tool_translations   │
├──────────────┤         ├──────────────────────┤
│ id           │◄────────│ tool_id              │
│ slug         │         │ locale (en/ja/pt/zh) │
│ tool_type_id │         │ title                │
│ is_active    │         │ description          │
│ ...          │         │ prompt_template      │
└──────────────┘         └──────────────────────┘
```

### Core Tables

| Table | Purpose | Translation Table |
|-------|---------|-------------------|
| `tool_types` | Tool classifications | `tool_type_translations` |
| `tools` | AI tool definitions | `tool_translations` |
| `home_banners` | Homepage promotions | `home_banner_translations` |
| `media` | Uploaded files | - |
| `tasks` | User AI jobs | - |

### Querying with Translations

```typescript
// Example: Fetch tools with localized content
const tools = await db
  .select({
    id: tools.id,
    slug: tools.slug,
    title: toolTranslations.title,
    description: toolTranslations.description,
  })
  .from(tools)
  .innerJoin(toolTranslations, and(
    eq(toolTranslations.toolId, tools.id),
    eq(toolTranslations.locale, 'en')  // Pass locale parameter
  ))
  .where(eq(tools.isActive, true));
```

## Internationalization (i18n)

### Supported Locales

| Code | Language |
|------|----------|
| `en` | English (default) |
| `ja` | Japanese |
| `pt` | Portuguese (Brazil) |
| `zh` | Chinese (Simplified) |

### Adding Translations

1. **UI Strings** (next-intl): Edit `apps/web/messages/{locale}.json`
2. **Database Content**: Add rows to `*_translations` tables with appropriate locale

### URL Structure

```
/en/tools/anime-style    # English
/ja/tools/anime-style    # Japanese
/zh/tools/anime-style    # Chinese
```

## Theme System

The web app supports multiple color themes with light/dark mode variants using `next-themes`.

### Available Themes

| Theme | Description |
|-------|-------------|
| Neutral (default) | Black/white grayscale theme |
| Green | Vibrant green accent |
| Blue | Classic blue accent |
| Purple | Purple accent |
| Orange | Orange accent |

### Usage

The theme switcher is available in:
- Header (top navigation bar)
- Profile page (Preferences section)

### Components

- `components/theme-provider.tsx` - ThemeProvider wrapper
- `components/theme-switcher.tsx` - Color picker + dark mode toggle

## Authentication

Authentication is handled by [Logto](https://logto.io/) using the `@logto/next` SDK.

### Setup

1. Create a Logto application (Traditional Web App)
2. Configure environment variables:

```bash
# .env.local
LOGTO_ENDPOINT=https://your-tenant.logto.app/
LOGTO_APP_ID=your-app-id
LOGTO_APP_SECRET=your-app-secret
LOGTO_COOKIE_SECRET=random-32-char-string
LOGTO_BASE_URL=http://localhost:3000
```

3. Configure Logto Console:
   - **Redirect URI**: `http://localhost:3000/callback`
   - **Post sign-out redirect URI**: `http://localhost:3000/`

### Auth Components

| Component | Type | Purpose |
|-----------|------|---------|
| `auth-status.tsx` | Server | Fetches auth state, renders appropriate UI |
| `sign-in-button.tsx` | Client | Triggers sign-in flow |
| `user-button.tsx` | Client | User dropdown menu |

### Protected Routes

- `/[locale]/profile` - User profile page (redirects to home if not authenticated)

### Profile Page Features

- User avatar with initials fallback
- Account information (name, email, user ID)
- Email verification status
- Theme preference settings
- Language preference settings
- Sign out functionality

## AWS S3 Storage

Magiworld uses a **4-bucket architecture** with CloudFront for media storage, providing clear separation between admin content, public assets, user private files, and shared content.

### Bucket Overview

| Bucket | Purpose | Access | CloudFront |
|--------|---------|--------|------------|
| `funmagic-admin-users-assets` | Admin library & Magi-generated files | Private (Signed URLs) | Required |
| `funmagic-web-public-assets` | Banners, tool thumbnails, UI assets | Public | Required (no auth) |
| `funmagic-web-users-assets-private` | Web user uploads & AI results | Private (Signed URLs) | Required |
| `funmagic-web-users-assets-shared` | User-shared files (public links) | Public | Required (no auth) |

### Architecture Diagram

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

### Folder Structure

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

**Example:**
```
funmagic-admin-users-assets/
└── user_abc123/
    └── library/
        ├── upload/
        │   └── 20250112/
        │       ├── logo.png
        │       └── banner-draft.jpg
        └── generated/
            └── magi-chat/
                └── 20250112/
                    └── ai-generated-image.png
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

**Example:**
```
funmagic-web-public-assets/
├── banners/
│   ├── main/
│   │   └── hero-summer-1736640000000.jpg
│   └── side/
│       └── promo-ai-1736640000000.jpg
├── tools/
│   ├── background-remove/
│   │   ├── thumbnail/
│   │   │   └── thumb.jpg
│   │   └── page_banner/
│   │       └── banner.jpg
│   └── 3d-crystal/
│       ├── thumbnail/
│       │   └── thumb.jpg
│       └── page_banner/
│           └── banner.jpg
└── ui/
    └── placeholder.svg
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

**Example:**
```
funmagic-web-users-assets-private/
└── user_xyz789/
    ├── background-remove/
    │   ├── upload/
    │   │   └── 20250112/
    │   │       └── photo.jpg
    │   └── generated/
    │       └── 20250112/
    │           └── photo-nobg.png
    └── 3d-crystal/
        ├── upload/
        │   └── 20250112/
        │       └── family.jpg
        └── generated/
            └── 20250112/
                └── crystal-preview.png
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

**Example:**
```
funmagic-web-users-assets-shared/
└── user_xyz789/
    └── sh_abc123def456/
        ├── crystal-preview.png
        └── metadata.json
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

### Environment Variables

**Admin App (`apps/admin/.env.local`):**

```bash
# AWS S3 Configuration
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Buckets
S3_ADMIN_ASSETS_BUCKET=funmagic-admin-users-assets
S3_PUBLIC_ASSETS_BUCKET=funmagic-web-public-assets

# CloudFront URLs
CLOUDFRONT_ADMIN_PRIVATE_URL=https://admin-private.cloudfront.net
CLOUDFRONT_PUBLIC_URL=https://cdn.funmagic.ai

# Signed URLs (for private bucket)
CLOUDFRONT_KEY_PAIR_ID=K...
CLOUDFRONT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
```

**Web App (`apps/web/.env.local`):**

```bash
# AWS S3 Configuration
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Buckets
S3_WEB_PRIVATE_BUCKET=funmagic-web-users-assets-private
S3_WEB_SHARED_BUCKET=funmagic-web-users-assets-shared
S3_PUBLIC_ASSETS_BUCKET=funmagic-web-public-assets

# CloudFront URLs
CLOUDFRONT_WEB_PRIVATE_URL=https://web-private.cloudfront.net
CLOUDFRONT_WEB_SHARED_URL=https://shared.funmagic.ai
CLOUDFRONT_PUBLIC_URL=https://cdn.funmagic.ai

# Signed URLs (for private bucket)
CLOUDFRONT_KEY_PAIR_ID=K...
CLOUDFRONT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
```

### Lifecycle Policies

| Bucket | Path | Retention |
|--------|------|-----------|
| `funmagic-admin-users-assets` | `*/library/*` | Permanent |
| `funmagic-web-users-assets-private` | `*/upload/*` | 30 days |
| `funmagic-web-users-assets-private` | `*/generated/*` | 90 days |
| `funmagic-web-users-assets-shared` | `*` | Until user unshares |

### Setup Guide

For detailed step-by-step AWS Console configuration, see **[deployment-guide.md](./deployment-guide.md)**.

## Development Guide

### Code Organization

```typescript
// Data fetching: apps/web/lib/data/index.ts
export async function getTools(locale: Locale): Promise<ToolListItem[]>
export async function getToolBySlug(slug: string, locale: Locale)
export async function getToolTypes(locale: Locale)

// Types: packages/types/src/index.ts
export interface Tool { ... }
export interface ToolListItem { ... }
export interface ToolTypeInfo { ... }

// Schema: packages/db/src/schema.ts
export const tools = pgTable('tools', { ... })
export const toolTranslations = pgTable('tool_translations', { ... })
```

### Component Patterns

The project uses React Server Components (RSC) by default:

```tsx
// Server Component (default) - can fetch data directly
export default async function ToolsPage() {
  const tools = await getTools('en');
  return <ToolList tools={tools} />;
}

// Client Component - for interactivity
'use client';
export function ToolCard({ tool }: { tool: Tool }) {
  const [liked, setLiked] = useState(false);
  // ...
}
```

### Admin vs Web App

| Aspect | Web App | Admin App |
|--------|---------|-----------|
| Purpose | User-facing | Content management |
| i18n | Full localization | English only |
| Auth | User auth (Logto) | Admin auth (TBD) |
| Data | Read-only queries | CRUD operations |

## Adding New Features

### Adding a New Tool

Adding a new tool requires both code changes and admin configuration:

1. **Register the slug** in `packages/types/src/index.ts`:
   ```typescript
   export const TOOL_REGISTRY = [
     'background-remove',
     'your-new-tool',  // Add your slug here
   ] as const;
   ```

2. **Create the component** in `apps/web/components/tools/{slug}/index.tsx`:
   ```typescript
   'use client';

   export function YourNewToolInterface({ tool }: { tool: ToolData }) {
     // Your tool implementation
   }
   ```

3. **Register the component** in `apps/web/components/tools/tool-router.tsx`:
   ```typescript
   import { YourNewToolInterface } from './your-new-tool';

   const TOOL_COMPONENTS: Record<string, React.ComponentType<{ tool: ToolData }>> = {
     'background-remove': BackgroundRemoveInterface,
     'your-new-tool': YourNewToolInterface,  // Add here
   };
   ```

4. **Create tool in Admin**: Go to Admin > Tools > Add Tool
   - The slug field validates against `TOOL_REGISTRY` - only registered slugs are accepted
   - Set tool type, translations, AI endpoint, and other configuration

### Adding a New Tool Type

1. **Update Schema** (if needed): `packages/db/src/schema.ts`
2. **Create in Admin**: Admin > Tool Types > Add
3. **Create Component**: Add React component in `apps/web/components/tools/`
4. **Register Component**: Map `componentKey` to component

### Adding a New Database Table

```bash
# 1. Edit schema
code packages/db/src/schema.ts

# 2. Add table definition
export const myTable = pgTable('my_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  // ... fields
});

# 3. Push changes to database
pnpm db:push

# 4. (Optional) Generate migration
pnpm db:generate
```

## Scripts Reference

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm dev:web` | Start web app only |
| `pnpm dev:admin` | Start admin app only |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Run ESLint on all packages |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm db:push` | Push schema changes to database |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm db:studio` | Open Drizzle Studio (database GUI) |
| `pnpm db:generate` | Generate migration files |

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps

# Restart the container
docker start magi-db

# Check connection
docker exec -it magi-db psql -U postgres -d magi-db -c "SELECT 1;"
```

### Schema Push Errors

```bash
# If you get constraint errors, you may need to reset
docker exec -it magi-db psql -U postgres -c "DROP DATABASE \"magi-db\";"
docker exec -it magi-db psql -U postgres -c "CREATE DATABASE \"magi-db\";"
pnpm db:push
pnpm db:seed
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### TypeScript Errors After Schema Changes

```bash
# Rebuild packages
pnpm build --filter=@magiworld/db
pnpm build --filter=@magiworld/types

# Or rebuild everything
pnpm build
```

## Environment Variables

### Web App (`apps/web/.env.local`)

```bash
# Database (required)
DATABASE_URL=postgresql://postgres:yourpassword@localhost:9000/magi-db

# Authentication (Logto)
LOGTO_ENDPOINT=https://your-tenant.logto.app/
LOGTO_APP_ID=your-app-id
LOGTO_APP_SECRET=your-app-secret
LOGTO_COOKIE_SECRET=random-32-character-string-here
LOGTO_BASE_URL=http://localhost:3000

# AWS S3 Storage (user uploads - see AWS S3 Storage section)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIA...web-user-key
AWS_SECRET_ACCESS_KEY=...web-user-secret
S3_BUCKET_NAME=funmagic-user-uploads
CLOUDFRONT_URL=https://cdn.funmagic.ai

# AI Services
AI_API_KEY=
AI_API_URL=

# Job Queue (Inngest)
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
```

### Admin App (`apps/admin/.env.local`)

```bash
# Database (required)
DATABASE_URL=postgresql://postgres:yourpassword@localhost:9000/magi-db

# AWS S3 Storage (admin assets - see AWS S3 Storage section)
AWS_REGION=ap-northeast-1
AWS_ACCESS_KEY_ID=AKIA...admin-user-key
AWS_SECRET_ACCESS_KEY=...admin-user-secret
S3_BUCKET_NAME=funmagic-admin-assets
S3_CDN_BUCKET=funmagic-cdn
CLOUDFRONT_URL=https://cdn.funmagic.ai
```

## License

Private - All rights reserved
