# Magiworld AI Platform

Magiworld is an AI-powered creative platform with tools for image stylization, editing, 3D generation, and physical fabrication.

## Tech Stack

- **Framework**: Next.js 16.1.1 (App Router)
- **Database**: PostgreSQL with Drizzle ORM
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Monorepo**: Turborepo + pnpm
- **i18n**: next-intl (en, ja, pt, zh)

## Project Structure

```
magiworld/
├── apps/
│   ├── web/      # Frontend application (port 3000)
│   └── admin/    # Admin dashboard (port 3002)
├── packages/
│   ├── db/       # Shared database schema (@magiworld/db)
│   ├── types/    # Shared TypeScript types (@magiworld/types)
│   └── utils/    # Shared utilities (@magiworld/utils)
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL (Docker recommended)

### Setup

1. Install dependencies:
```bash
pnpm install
```

2. Start PostgreSQL (Docker):
```bash
docker run --name magi-db -e POSTGRES_PASSWORD=yourpassword -p 9000:5432 -d postgres
```

3. Create database:
```bash
docker exec -it magi-db psql -U postgres -c "CREATE DATABASE \"magi-db\";"
```

4. Push schema and seed data:
```bash
pnpm db:push
pnpm db:seed
```

5. Start development:
```bash
pnpm dev        # Start all apps
pnpm dev:web    # Start web only
pnpm dev:admin  # Start admin only
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development |
| `pnpm dev:web` | Start web app only |
| `pnpm dev:admin` | Start admin app only |
| `pnpm build` | Build all apps |
| `pnpm lint` | Lint all packages |
| `pnpm typecheck` | Type check all packages |
| `pnpm db:push` | Push database schema |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm db:studio` | Open Drizzle Studio |

## App URLs

| App | URL |
|-----|-----|
| Web | http://localhost:3000 |
| Admin | http://localhost:3002 |

## Database

PostgreSQL connection string format:
```
postgresql://user:password@localhost:9000/magi-db
```

## License

Private
