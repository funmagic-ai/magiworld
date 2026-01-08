# Magiworld AI Platform

An AI-powered creative platform providing various AI tools for image stylization, editing, 3D generation, and AI chat assistants.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Database | PostgreSQL + Drizzle ORM |
| Styling | Tailwind CSS v4 |
| UI | shadcn/ui |
| Monorepo | Turborepo + pnpm |
| i18n | next-intl |
| Auth | Logto |
| Storage | AWS S3 + CloudFront |
| AI | Vercel AI SDK (OpenAI, Google, Fal.ai) |

## Project Structure

```
magiworld/
├── apps/
│   ├── web/          # Public-facing Next.js app (port 3000)
│   └── admin/        # Admin dashboard app (port 3002)
├── packages/
│   ├── db/           # @magiworld/db - Shared Drizzle schema
│   ├── types/        # @magiworld/types - Shared TypeScript types
│   └── utils/        # @magiworld/utils - Shared utilities
└── docs/
    └── design.md     # Architecture documentation
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- AWS Account (S3 + CloudFront)
- API keys: OpenAI, Google AI, Fal.ai (optional)

## Getting Started

### 1. Clone and Install

```bash
git clone <repo-url>
cd magiworld
pnpm install
```

### 2. Environment Setup

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
# See .env.example for all required variables
```

#### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AWS_ACCESS_KEY_ID` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `AWS_REGION` | AWS region (default: us-east-2) |
| `S3_BUCKET_NAME` | Private bucket for admin assets |
| `CLOUDFRONT_ADMIN_URL` | CloudFront distribution for admin assets |
| `CLOUDFRONT_KEY_PAIR_ID` | CloudFront signing key pair ID |
| `CLOUDFRONT_PRIVATE_KEY` | CloudFront RSA private key |

#### AI API Keys (at least one required)

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (GPT-4o, image generation) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google AI key (Gemini models) |
| `FAL_API_KEY` | Fal.ai key (background removal, upscaling) |

### 3. Database Setup

```bash
# Push schema to database
pnpm db:push

# Seed initial data (optional)
pnpm db:seed

# Open Drizzle Studio (database GUI)
pnpm db:studio
```

### 4. Run Development Servers

```bash
# Run all apps
pnpm dev

# Or run individually
pnpm dev:web    # Web app at http://localhost:3000
pnpm dev:admin  # Admin app at http://localhost:3002
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm dev:web` | Start web app only |
| `pnpm dev:admin` | Start admin app only |
| `pnpm build` | Build all apps for production |
| `pnpm lint` | Run ESLint on all packages |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm db:push` | Push Drizzle schema to database |
| `pnpm db:seed` | Seed database with initial data |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:generate` | Generate Drizzle migrations |

## AWS Setup

### S3 Buckets

Create two S3 buckets:

1. **magiworld-admin-assets** (Private)
   - Stores admin library files, AI-generated images
   - Block all public access
   - Enable CloudFront OAC for access

2. **magiworld-cdn** (Public)
   - Stores banners, tool images
   - Enable public access for CDN
   - Optional: Configure CloudFront distribution

### CloudFront Setup

1. Create a CloudFront distribution for `magiworld-admin-assets`
2. Enable Origin Access Control (OAC)
3. Create a CloudFront key pair for signed URLs
4. Add the private key to `CLOUDFRONT_PRIVATE_KEY` env var

### IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::magiworld-admin-assets/*",
        "arn:aws:s3:::magiworld-cdn/*"
      ]
    }
  ]
}
```

## Features

### Web App (apps/web)

- Homepage with banner carousel
- Tool discovery and browsing
- Studio workspace for AI tools
- User authentication (Logto)
- Multi-language support (en, ja, pt, zh)
- Theme switching (light/dark + color themes)

### Admin App (apps/admin)

- Dashboard overview
- Tool management (CRUD)
- Tool type management
- Banner management
- Media library with folders
- **Magi AI Assistant**
  - Multi-model chat (OpenAI, Google)
  - Image generation and editing
  - Background removal tool
  - Image upscaling
  - Save to library

## AI Models Supported

### Text Generation
- GPT-4o, GPT-4o Mini, GPT-4 Turbo (OpenAI)
- Gemini 2.0 Flash, Gemini 1.5 Pro (Google)

### Image Generation
- GPT Image 1, GPT Image 1.5 (OpenAI)
- Gemini 2.5 Flash Image, Gemini 3 Pro Image (Google)

### Image Processing (Fal.ai)
- Background removal (BRIA RMBG 2.0)
- Image upscaling
- Image rerendering

## Documentation

- [Design Specification](./docs/design.md) - Full architecture documentation

## License

Private - All rights reserved
