# Deployment Guide

This guide walks you through deploying the Magiworld platform including AWS S3, CloudFront, Cloudflare DNS, and AWS EC2.

## Table of Contents

1. [Prerequisites](./01-prerequisites.md)
2. [S3 Buckets Setup](./02-s3-buckets.md) - Create buckets, policies, and CORS
3. [IAM Policies](./03-iam-policies.md) - Create IAM users and policies
4. [CloudFront Setup](./04-cloudfront.md) - Distributions, signed URLs, lifecycle policies
5. [Cloudflare DNS](./05-cloudflare-dns.md) - DNS configuration
6. [EC2 & Docker](./06-ec2-docker.md) - Deploy to AWS EC2 with Docker
7. [RDS PostgreSQL](./07-rds-postgres.md) - Set up AWS RDS PostgreSQL
8. [ElastiCache Redis](./08-elasticache-redis.md) - Set up AWS ElastiCache Redis
9. [Environment Variables](./09-environment-variables.md) - Configure environment variables
10. [Deploy & Run](./10-deploy-and-run.md) - Deploy code and run
11. [Testing](./11-testing.md) - Test the configuration
12. [Troubleshooting](./12-troubleshooting.md) - Quick checklist, troubleshooting, and security

---

## Architecture Overview

Magiworld uses 4 S3 buckets with CloudFront CDN:

| Bucket | Purpose | Access | CloudFront |
|--------|---------|--------|------------|
| `funmagic-admin-users-assets` | Admin library & Magi-generated files | Private | OAC + Signed URLs |
| `funmagic-web-public-assets` | Banners, tool thumbnails, UI assets | Public | Public CDN |
| `funmagic-web-users-assets-private` | Web user uploads & AI results | Private | OAC + Signed URLs |
| `funmagic-web-users-assets-shared` | User-shared files (public links) | Public | Public CDN |

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                      Complete Infrastructure Architecture                         │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│                               Cloudflare DNS                                      │
│                     ┌─────────────────────────────────┐                           │
│                     │  funmagic.ai      → EC2 (web)   │                           │
│                     │  admin.funmagic.ai → EC2 (admin)│                           │
│                     │  cdn.funmagic.ai   → CloudFront │                           │
│                     │  shared.funmagic.ai→ CloudFront │                           │
│                     └─────────────────────────────────┘                           │
│                                     │                                              │
│                     ┌───────────────┼───────────────┐                             │
│                     ▼               ▼               ▼                             │
│              ┌────────────────────────────────┐   ┌──────────────┐                │
│              │           AWS EC2              │   │  CloudFront  │                │
│              │  ┌───────┐ ┌───────┐ ┌───────┐│   │ Distributions│                │
│              │  │ Web   │ │ Admin │ │Worker ││   └──────┬───────┘                │
│              │  │ :3000 │ │ :3001 │ │(queue)││          │                        │
│              │  └───┬───┘ └───────┘ └───┬───┘│          │                        │
│              │      │    Nginx + Docker     │ │          │                        │
│              └──────┼───────────────────────┼─┘          │                        │
│                     │                       │            │                        │
│         ┌───────────┴───────────────────────┴────────────┘                        │
│         │                                                                          │
│         ▼                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────┐ │
│   │                              S3 Buckets                                      │ │
│   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                │ │
│   │  │ admin_     │ │ public_    │ │ web_users_ │ │ web_users_ │                │ │
│   │  │ users_     │ │ assets     │ │ assets_    │ │ assets_    │                │ │
│   │  │ assets     │ │            │ │ private    │ │ shared     │                │ │
│   │  │ (Private)  │ │ (Public)   │ │ (Private)  │ │ (Public)   │                │ │
│   │  └────────────┘ └────────────┘ └────────────┘ └────────────┘                │ │
│   └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                    │
│   ┌─────────────────────────────┐    ┌─────────────────────────────┐              │
│   │       AWS RDS               │    │     AWS ElastiCache         │              │
│   │  ┌────────────────────────┐ │    │  ┌────────────────────────┐ │              │
│   │  │   PostgreSQL           │ │    │  │   Redis (BullMQ)       │ │              │
│   │  │   (funmagic-db)        │ │    │  │   (funmagic-redis)     │ │              │
│   │  └────────────────────────┘ │    │  └────────────────────────┘ │              │
│   └─────────────────────────────┘    └─────────────────────────────┘              │
│                                                                                    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Folder Structure

All paths include `userId` or `adminId` for GDPR compliance, per-user storage management, and attribution tracking.

```
funmagic-admin-users-assets/
├── {env}/                                    # Environment prefix (dev/staging/prod)
│   ├── library/{adminId}/{name}-{timestamp}.{ext}
│   └── magi/{adminId}/{name}-{timestamp}.{ext}

funmagic-web-public-assets/
├── {env}/                                    # Environment prefix (dev/staging/prod)
│   ├── banners/{adminId}/{name}-{timestamp}.{ext}
│   ├── tools/{adminId}/{toolId}/{type}/{name}-{timestamp}.{ext}
│   └── brands/{adminId}/{name}-{timestamp}.{ext}
├── ui/{icons, placeholders}
└── fonts/{custom-fonts}

funmagic-web-users-assets-private/
└── tasks/{userId}/{year}/{month}/{day}/{taskId}.{ext}

funmagic-web-users-assets-shared/
└── {userid}/
    └── {share-id}/
        ├── {filename}
        └── metadata.json
```

**Path patterns:**
- Admin library: `{env}/library/{adminId}/{name}-{timestamp}.{ext}`
- Admin magi: `{env}/magi/{adminId}/{name}-{timestamp}.{ext}`
- Public banners: `{env}/banners/{adminId}/{name}-{timestamp}.{ext}`
- Public tools: `{env}/tools/{adminId}/{toolId}/{type}/{name}-{timestamp}.{ext}`
- Public brands: `{env}/brands/{adminId}/{name}-{timestamp}.{ext}`
- Task results: `tasks/{userId}/{YYYY}/{MM}/{DD}/{taskId}.{ext}`
