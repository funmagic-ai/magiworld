# 部署指南

本指南将引导您完成 Magiworld 平台的部署，包括 AWS S3、CloudFront、Cloudflare DNS 和 AWS EC2。

## 目录

| 文件 | 内容 |
|------|------|
| [01-prerequisites.md](./01-prerequisites.md) | 前置要求 |
| [02-s3-buckets.md](./02-s3-buckets.md) | S3 存储桶、策略、CORS (步骤 1-3) |
| [03-iam-policies.md](./03-iam-policies.md) | IAM 用户和策略 (步骤 4) |
| [04-cloudfront.md](./04-cloudfront.md) | CloudFront 分发、签名 URL、生命周期 (步骤 5-7) |
| [05-cloudflare-dns.md](./05-cloudflare-dns.md) | Cloudflare DNS 配置 (步骤 8) |
| [06-ec2-docker.md](./06-ec2-docker.md) | AWS EC2 + Docker 部署 (步骤 9) |
| [07-rds-postgres.md](./07-rds-postgres.md) | AWS RDS PostgreSQL (步骤 10) |
| [08-elasticache-redis.md](./08-elasticache-redis.md) | AWS ElastiCache Redis (步骤 11) |
| [09-environment-variables.md](./09-environment-variables.md) | 环境变量配置 (步骤 12) |
| [10-deploy-and-run.md](./10-deploy-and-run.md) | 部署代码并运行 (步骤 13) |
| [11-testing.md](./11-testing.md) | 测试配置 (步骤 14) |
| [12-troubleshooting.md](./12-troubleshooting.md) | 故障排除 |

---

## 架构概览

Magiworld 使用 4 个 S3 存储桶配合 CloudFront CDN：

| 存储桶 | 用途 | 访问权限 | CloudFront |
|--------|------|----------|------------|
| `funmagic-admin-users-assets` | 管理员媒体库和 Magi 生成的文件 | 私有 | OAC + 签名 URL |
| `funmagic-web-public-assets` | 横幅、工具缩略图、UI 资源 | 公开 | 公共 CDN |
| `funmagic-web-users-assets-private` | 用户上传和 AI 结果 | 私有 | OAC + 签名 URL |
| `funmagic-web-users-assets-shared` | 用户共享文件（公开链接） | 公开 | 公共 CDN |

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            完整基础设施架构                                        │
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
│              │  ┌───────┐ ┌───────┐ ┌───────┐│   │    分发      │                │
│              │  │ Web   │ │ Admin │ │Worker ││   └──────┬───────┘                │
│              │  │ :3000 │ │ :3001 │ │(队列) ││          │                        │
│              │  └───┬───┘ └───────┘ └───┬───┘│          │                        │
│              │      │    Nginx + Docker     │ │          │                        │
│              └──────┼───────────────────────┼─┘          │                        │
│                     │                       │            │                        │
│         ┌───────────┴───────────────────────┴────────────┘                        │
│         │                                                                          │
│         ▼                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────┐ │
│   │                              S3 存储桶                                       │ │
│   │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                │ │
│   │  │ admin_     │ │ public_    │ │ web_users_ │ │ web_users_ │                │ │
│   │  │ users_     │ │ assets     │ │ assets_    │ │ assets_    │                │ │
│   │  │ assets     │ │            │ │ private    │ │ shared     │                │ │
│   │  │ (私有)     │ │ (公开)     │ │ (私有)     │ │ (公开)     │                │ │
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

### 文件夹结构

所有路径都包含 `userId` 或 `adminId`，以支持 GDPR 合规、按用户存储管理和归属追踪。

```
funmagic-admin-users-assets/
├── {env}/                                    # 环境前缀 (dev/staging/prod)
│   ├── library/{adminId}/{name}-{timestamp}.{ext}
│   └── magi/{adminId}/{name}-{timestamp}.{ext}

funmagic-web-public-assets/
├── {env}/                                    # 环境前缀 (dev/staging/prod)
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

**路径模式：**
- 管理员媒体库：`{env}/library/{adminId}/{name}-{timestamp}.{ext}`
- 管理员 Magi：`{env}/magi/{adminId}/{name}-{timestamp}.{ext}`
- 公开横幅：`{env}/banners/{adminId}/{name}-{timestamp}.{ext}`
- 公开工具：`{env}/tools/{adminId}/{toolId}/{type}/{name}-{timestamp}.{ext}`
- 公开品牌：`{env}/brands/{adminId}/{name}-{timestamp}.{ext}`
- 任务结果：`tasks/{userId}/{YYYY}/{MM}/{DD}/{taskId}.{ext}`

---
