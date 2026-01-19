# Magiworld AI 平台 - 设计规范

## 目录
1. [项目概述](#1-项目概述)
2. [技术栈](#2-技术栈)
3. [Monorepo 结构](#3-monorepo-结构)
4. [核心架构原则](#4-核心架构原则)
5. [数据模型设计](#5-数据模型设计)
6. [模块需求](#6-模块需求)
7. [国际化](#7-国际化)
8. [主题系统](#8-主题系统)
9. [认证与授权](#9-认证与授权)
10. [文件存储策略](#10-文件存储策略)
11. [任务处理与队列](#11-任务处理与队列)
12. [API 安全](#12-api-安全)
13. [性能优化](#13-性能优化)
14. [环境配置](#14-环境配置)
15. [开发工作流](#15-开发工作流)
16. [待决问题](#16-待决问题)
17. [AI 提供商集成](#17-ai-提供商集成)
18. [CloudFront 签名 URL](#18-cloudfront-签名-url)
19. [Magi AI 助手](#19-magi-ai-助手)
20. [Web 应用工具](#20-web-应用工具)
21. [共享工具函数（管理后台）](#21-共享工具函数管理后台)
22. [OEM/白标系统](#22-oem白标系统)
23. [归因追踪](#23-归因追踪)
24. [管理员用户管理](#24-管理员用户管理)
25. [未来扩展：独立 Worker 和 Redis](#25-未来扩展独立-worker-和-redis)

---

## 1. 项目概述

Magiworld 是一个 AI 驱动的创意平台，提供各种 AI 工具用于图像风格化、编辑、3D 生成和实体制造（如水晶雕刻）。该平台采用配置驱动设计，允许通过管理面板添加新工具而无需修改前端代码。

### 核心目标
- **灵活性**：通过统一接口支持多种 AI 工具类型
- **可扩展性**：处理不断增长的工具目录和用户群
- **性能**：通过激进的代码分割实现快速加载
- **可维护性**：管理配置与前端渲染之间的清晰分离

### 1.1 用户角色与工具生命周期

平台有三种不同的用户角色，共同协作将 AI 工具交付给最终用户：

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              工具生命周期概览                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │    开发者    │───▶│  管理员用户  │───▶│   Web 用户   │───▶│    Worker    │   │
│  │              │    │              │    │              │    │              │   │
│  │  构建与发布  │    │    配置      │    │  使用工具    │    │  处理任务    │   │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘   │
│         │                   │                   │                   │           │
│         ▼                   ▼                   ▼                   ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ • UI 组件    │    │ • 添加工具   │    │ • 上传图片   │    │ • 调用 AI    │   │
│  │ • 处理器     │    │ • 设置配置   │    │              │    │   提供商     │   │
│  │ • 工具处理器 │    │ • 横幅       │    │ • 创建任务   │    │ • 上传 S3    │   │
│  │ • 部署       │    │ • 缩略图     │    │ • 获取结果   │    │ • 通知用户   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

#### 开发者职责

开发者构建新的 AI 工具并部署到生产环境。开发流程包括：

| 步骤 | 位置 | 描述 |
|------|------|------|
| 1. 创建 UI 组件 | `apps/web/components/tools/` | 构建工具界面的 React 组件（上传、参数、预览） |
| 2. 注册组件 | `apps/web/lib/tool-registry.ts` | 在 TOOL_COMPONENTS 注册表中映射工具 slug 到组件 |
| 3. 创建处理器 | `apps/worker/src/processors/` | 实现 AI 提供商的作业处理器（Fal.ai、Google、OpenAI） |
| 4. 创建工具处理器 | `apps/worker/src/tools/` | 实现调用处理器的工具特定逻辑 |
| 5. 更新模式 | `packages/db/src/schema.ts` | 如需要，添加新的数据库字段 |
| 6. 部署 | CI/CD | 发布到生产环境（web、admin、worker 容器） |

**示例：添加新的"图片放大"工具：**
```
1. 创建 apps/web/components/tools/UpscaleInterface.tsx
2. 添加到 TOOL_COMPONENTS: { 'image-upscale': UpscaleInterface }
3. 创建 apps/worker/src/tools/image-upscale.ts
4. 部署所有应用到生产环境
5. → 工具现在可供管理员配置
```

#### 管理员用户职责

管理员用户配置和发布开发者构建的工具。他们使用 `apps/admin` 来：

| 操作 | 描述 |
|------|------|
| **添加新工具** | 创建工具条目，slug 需匹配开发者注册的组件 |
| **设置工具配置** | 配置 `toolConfig` JSON，包含参数、选项和默认值 |
| **上传缩略图** | 添加工具图标、预览图片，用于工具目录展示 |
| **创建横幅** | 设计首页和营销推广横幅 |
| **管理提供商** | 配置 AI 提供商凭证并监控健康状态 |
| **监控任务** | 查看死信队列，重试失败的任务 |

**工具配置流程：**
```
管理面板 → 工具 → 添加新工具
├── 基本信息：名称、slug（必须匹配已注册组件）、描述
├── 定价：所需积分、订阅层级
├── 工具配置（JSON）：AI 模型、参数、验证规则
├── 缩略图：图标、预览图片
└── 发布：isActive = true → 工具显示在 Web 应用上
```

#### Web 用户功能

Web 用户（最终用户）通过 `apps/web` 与已发布的工具交互：

| 操作 | 流程 |
|------|------|
| **发现工具** | 浏览工具目录，按分类/类型筛选 |
| **使用工具** | 上传图片 → 调整参数 → 提交任务 |
| **跟踪进度** | 通过 SSE 实时查看进度更新 |
| **获取结果** | 下载 AI 生成的输出，在媒体库中查看 |
| **分享结果** | 生成公开分享链接 |

#### Worker 处理

`apps/worker` 通过 BullMQ 异步处理任务：

| 步骤 | 描述 |
|------|------|
| 1. 接收作业 | 从 Redis 队列中获取作业 |
| 2. 加载工具配置 | 从数据库获取工具设置 |
| 3. 调用 AI 提供商 | 向 Fal.ai/Google/OpenAI 发送请求 |
| 4. 上传结果 | 将输出存储到 S3 私有存储桶 |
| 5. 更新任务 | 标记为已完成，存储结果 URL |
| 6. 通知用户 | 通过 Redis 发布/订阅 → SSE 发布更新 |

**完整流程示例：**
```
开发者发布 "background-remove" 工具
       ↓
管理员添加工具 slug="background-remove"，配置 BRIA RMBG 模型
       ↓
用户上传图片，点击"移除背景"
       ↓
Web API 创建任务（状态：pending），入队到 BullMQ
       ↓
Worker 获取作业，调用 Fal.ai BRIA RMBG API
       ↓
Worker 上传结果到 S3，更新任务（状态：completed）
       ↓
用户通过 SSE 看到结果，下载透明 PNG
```

---

## 2. 技术栈

| 层级 | 技术 | 版本 |
|------|------|------|
| 框架 | Next.js (App Router) | 16.1.1 |
| 数据库 ORM | Drizzle ORM | 最新 |
| 数据库 | PostgreSQL | 15+ |
| 缓存/队列 | Redis + BullMQ | 7+ / 最新 |
| 样式 | Tailwind CSS | v4 |
| UI 组件 | shadcn/ui | 最新 |
| Monorepo | Turborepo + pnpm | 最新 |
| 国际化 | next-intl | 最新 |
| 图标 | Hugeicons | (通过 shadcn 预设) |
| 字体 | Inter | (通过 shadcn 预设) |

---

## 3. Monorepo 结构

```
magiworld/
├── apps/
│   ├── web/                    # Next.js 16 前端应用
│   │   ├── app/
│   │   │   ├── [locale]/       # 国际化路由
│   │   │   │   ├── (marketing)/
│   │   │   │   │   └── page.tsx        # 首页（探索）
│   │   │   │   ├── studio/
│   │   │   │   │   └── [toolTypeSlug]/
│   │   │   │   │       └── [toolSlug]/
│   │   │   │   │           └── page.tsx
│   │   │   │   └── assets/
│   │   │   │       └── page.tsx        # 个人资源库
│   │   │   └── api/            # API 路由（AI 代理）
│   │   ├── components/
│   │   │   ├── ui/             # shadcn 组件
│   │   │   ├── tools/          # 工具特定界面
│   │   │   │   ├── StylizeInterface.tsx
│   │   │   │   ├── EditInterface.tsx
│   │   │   │   ├── ThreeDGenInterface.tsx
│   │   │   │   └── CrystalEngraveInterface.tsx
│   │   │   └── shared/         # 共享应用组件
│   │   ├── lib/
│   │   │   ├── data/           # 数据获取（从共享数据库）
│   │   │   │   └── index.ts
│   │   │   └── tool-registry.ts    # toolType → 组件映射
│   │   └── messages/           # 国际化翻译文件
│   │       ├── en.json
│   │       ├── ja.json
│   │       ├── pt.json
│   │       └── zh.json
│   │
│   ├── admin/                  # 管理后台应用
│   │   ├── app/
│   │   │   ├── page.tsx            # 仪表板
│   │   │   ├── tools/              # 工具 CRUD
│   │   │   ├── tool-types/         # 工具类型 CRUD
│   │   │   ├── banners/            # 横幅 CRUD
│   │   │   └── media/              # 媒体管理
│   │   └── lib/
│   │       └── utils.ts
│   │
│   └── worker/                 # BullMQ 任务 Worker
│       └── src/
│           ├── index.ts            # Worker 入口
│           ├── config.ts           # 环境配置
│           ├── s3.ts               # S3 上传工具
│           ├── processors/         # 作业处理器
│           │   ├── base.ts         # 基础处理器类
│           │   ├── fal-ai.ts       # Fal.ai 处理器
│           │   └── google.ts       # Google AI 处理器
│           └── tools/              # 工具特定处理器
│               └── background-remove.ts
│
├── packages/
│   ├── db/                    # @magiworld/db - 共享数据库
│   │   └── src/
│   │       ├── schema.ts      # Drizzle 模式
│   │       ├── index.ts       # 数据库客户端
│   │       └── seed.ts        # 种子脚本
│   ├── queue/                 # @magiworld/queue - BullMQ 工具
│   │   └── src/
│   │       ├── index.ts       # 队列导出
│   │       ├── connection.ts  # Redis 连接
│   │       ├── queues.ts      # 队列工厂
│   │       ├── pubsub.ts      # Redis 发布/订阅
│   │       ├── ratelimit.ts   # 用户速率限制
│   │       ├── idempotency.ts # 重复请求预防
│   │       └── circuit-breaker.ts # 熔断器
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

### 包职责

| 包 | 用途 |
|---|------|
| `@magiworld/db` | 共享的 Drizzle 模式和数据库客户端 |
| `@magiworld/queue` | BullMQ 队列工厂、Redis 连接、发布/订阅、速率限制、熔断器 |
| `@magiworld/types` | 共享的 TypeScript 接口（Tool、Task、User 等） |
| `@magiworld/utils` | 通用工具函数（日期格式化、slug 生成、日志等） |

### 应用职责

| 应用 | 用途 |
|------|------|
| `apps/web` | 面向用户的 Next.js 应用 |
| `apps/admin` | 管理工具、横幅、供应商的管理后台 |
| `apps/worker` | 异步处理 AI 任务的 BullMQ Worker |

> **注意**：所有应用（`web`、`admin`、`worker`）通过 `@magiworld/db` 包共享同一数据库。

---

## 4. 核心架构原则

### 4.1 配置驱动 UI

前端**不得硬编码业务逻辑**。所有工具行为由数据库中的数据决定。

#### 工具注册表模式

`@magiworld/types` 中的共享 `TOOL_REGISTRY` 确保 Web 应用（组件路由）和管理应用（slug 验证）之间的一致性：

```typescript
// packages/types/src/index.ts
export const TOOL_REGISTRY = [
  'background-remove',
  '3d-crystal',
  // 在此添加新的工具 slug
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

// 开发时验证
if (process.env.NODE_ENV === 'development') {
  TOOL_REGISTRY.forEach((slug) => {
    if (!TOOL_COMPONENTS[slug]) {
      console.warn(`警告：工具 slug "${slug}" 已注册但没有对应组件`);
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
      message: `Slug 必须匹配已注册的工具。有效值：${TOOL_REGISTRY.join(', ')}`,
    }),
  // ...
});
```

### 4.2 组件注册表模式

`toolType` 和 React 组件之间的一对一映射：

```typescript
// 在 page.tsx 中
const tool = await fetchToolBySlug(toolSlug);
const ToolInterface = TOOL_COMPONENTS[tool.toolType];

return <ToolInterface tool={tool} />;
```

### 4.3 共享数据库架构

Web 和管理应用都通过共享的 `@magiworld/db` 包连接到同一个 PostgreSQL 数据库：

```
┌─────────────────────────────────────────────────────────┐
│                      PostgreSQL                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │                 共享表                             │  │
│  │  - tool_types / tool_type_translations            │  │
│  │  - tools / tool_translations                       │  │
│  │  - home_banners / home_banner_translations         │  │
│  │  - media                                           │  │
│  │  - tasks                                           │  │
│  └──────────────────────────────────────────────────┘  │
│           ▲                         ▲                   │
│           │                         │                   │
│      管理应用                     Web 应用              │
│      (端口 3002)                (端口 3000)             │
└─────────────────────────────────────────────────────────┘
```

### 4.4 翻译表模式

为支持国际化，每个内容表都有对应的翻译表：

```typescript
// 基础表（语言无关数据）
export const toolTypes = pgTable('tool_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  badgeColor: badgeColorEnum('badge_color').notNull(),
  componentKey: text('component_key').notNull(),
  order: integer('order').notNull().default(0),
});

// 翻译表（本地化内容）
export const toolTypeTranslations = pgTable('tool_type_translations', {
  id: uuid('id').primaryKey().defaultRandom(),
  toolTypeId: uuid('tool_type_id').references(() => toolTypes.id),
  locale: localeEnum('locale').notNull(),  // 'en' | 'ja' | 'pt' | 'zh'
  name: text('name').notNull(),
  description: text('description'),
});
```

---

## 5. 数据模型设计

### 5.1 数据库模式（Drizzle ORM）

所有表都定义在 `packages/db/src/schema.ts` 中：

#### 枚举
```typescript
export const badgeColorEnum = pgEnum('badge_color', ['default', 'secondary', 'outline']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'processing', 'success', 'failed']);
export const localeEnum = pgEnum('locale', ['en', 'ja', 'pt', 'zh']);
export const providerStatusEnum = pgEnum('provider_status', ['active', 'inactive', 'degraded']);
export const circuitStateEnum = pgEnum('circuit_state', ['closed', 'open', 'half_open']);
export const deadLetterStatusEnum = pgEnum('dead_letter_status', ['pending', 'retried', 'archived']);
```

#### 内容管理表
- `tool_types` + `tool_type_translations` - 工具分类（slug、badgeColor、order、isActive）
- `tools` + `tool_translations` - 单个 AI 工具（thumbnailUrl、configJson、priceConfig）
- `home_banners` + `home_banner_translations` - 首页横幅（类型：'main' | 'side'）
- `folders` - 层级媒体组织（自引用 parentId）
- `media` - 上传的媒体文件（url、mimeType、dimensions、size）

#### 用户表
- `users` - 从 Logto 同步的 Web 应用用户（logtoId、email、locale、colorMode、registrationBrandId）
- `admin_users` - 管理后台用户（必须有 email，isActive 标志用于软禁用）

#### OEM 与白标表
- `oem_software_brands` - 白标品牌配置（softwareId、themeConfig、allowedToolTypeIds）

#### 供应商表
- `providers` - AI 供应商配置（apiKeyEncrypted、rateLimits、circuitState、status）

#### 任务表
- `tasks` - 用户生成的 AI 任务，包含完整队列元数据
- `dead_letter_tasks` - 失败作业，用于人工审查和重试
- `task_usage_logs` - 供应商使用量追踪，用于计费

#### 归因表
- `user_attributions` - 注册时的首次触达 UTM 追踪
- `user_logins` - 每次会话登录追踪（brandId、channel、ipAddress、userAgent）
- `payment_attributions` - 最后触达支付归因（paymentId、amount、currency、UTM 参数）

### 5.2 任务编排器模式

#### providers（供应商）
```typescript
providers = pgTable('providers', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),           // 'fal_ai' | 'google' | 'openai'
  name: text().notNull(),
  apiKeyEncrypted: text(),                   // 加密的 API 密钥
  baseUrl: text(),                           // 可选的自定义端点
  rateLimitMax: integer().default(100),      // 每窗口最大请求数
  rateLimitWindow: integer().default(60000), // 窗口（毫秒）
  defaultTimeout: integer().default(120000), // 超时（毫秒）
  status: providerStatusEnum().default('active'),
  circuitState: circuitStateEnum().default('closed'),
  circuitOpenedAt: timestamp(),
  failureCount: integer().default(0),
  configJson: jsonb(),                       // 供应商特定配置
  isActive: boolean().default(true),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
});
```

#### tasks（任务，扩展版）
```typescript
tasks = pgTable('tasks', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid().references(() => users.id),
  toolId: uuid().references(() => tools.id),
  providerId: uuid().references(() => providers.id),
  inputParams: jsonb(),
  outputData: jsonb(),
  status: taskStatusEnum().default('pending'),
  errorMessage: text(),
  progress: integer().default(0),
  priority: integer().default(5),            // 1-20，越高越紧急
  bullJobId: text(),                         // BullMQ 作业引用
  idempotencyKey: text().unique(),
  requestId: text(),
  attemptsMade: integer(),
  startedAt: timestamp(),
  completedAt: timestamp(),
  createdAt: timestamp().defaultNow(),
  updatedAt: timestamp().defaultNow(),
});
```

#### dead_letter_tasks（死信任务）
```typescript
deadLetterTasks = pgTable('dead_letter_tasks', {
  id: uuid().primaryKey().defaultRandom(),
  originalTaskId: uuid().references(() => tasks.id),
  queue: text().notNull(),                   // 作业失败的队列名称
  errorMessage: text().notNull(),
  errorStack: text(),
  attemptsMade: integer().notNull(),
  payload: jsonb().notNull(),                // 完整作业数据，用于重放
  status: deadLetterStatusEnum().default('pending'),
  reviewNotes: text(),
  retriedAt: timestamp(),
  createdAt: timestamp().defaultNow(),
});
```

#### task_usage_logs（任务使用日志）
```typescript
taskUsageLogs = pgTable('task_usage_logs', {
  id: uuid().primaryKey().defaultRandom(),
  taskId: uuid().references(() => tasks.id),
  userId: uuid().references(() => users.id),
  providerId: uuid().references(() => providers.id),
  toolId: uuid().references(() => tools.id),
  modelName: text(),
  modelVersion: text(),
  priceConfig: jsonb(),                      // 执行时的定价快照
  usageData: jsonb(),                        // 供应商特定使用指标
  costUsd: text(),                           // 计算的成本
  latencyMs: integer(),
  status: text(),                            // 'success' | 'failed'
  errorMessage: text(),
  createdAt: timestamp().defaultNow(),
});
```

### 5.3 实体关系

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           内容管理                                           │
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
│  │ (自引用)              └─────────────────────────┘                        │
│  └─────────────────┘                                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           用户与 OEM 系统                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────┐                                                     │
│  │ oem_software_brands │◀─────────────────────────────────┐                 │
│  └──────────┬──────────┘                                  │                 │
│             │ 1:N                                         │ N:1             │
│             ▼                                             │                 │
│  ┌─────────────────────┐     ┌─────────────────────┐     │                 │
│  │       users         │────▶│  user_attributions  │     │                 │
│  │ (registrationBrandId)     │   (首次触达 UTM)    │     │                 │
│  └──────────┬──────────┘     └─────────────────────┘     │                 │
│             │ 1:N                                         │                 │
│             ├────────────────▶┌─────────────────────┐    │                 │
│             │                 │    user_logins      │────┘                 │
│             │                 │ (每次会话追踪)      │                       │
│             │                 └─────────────────────┘                       │
│             │                                                                │
│             ├────────────────▶┌─────────────────────┐                       │
│             │                 │ payment_attributions│                       │
│             │                 │  (最后触达 UTM)     │                       │
│             │                 └─────────────────────┘                       │
│             │                                                                │
│             └────────────────▶┌─────────────────────┐                       │
│                               │       tasks         │                       │
│                               │ (AI 生成任务)       │                       │
│                               └─────────────────────┘                       │
│                                                                               │
│  ┌─────────────────────┐                                                     │
│  │    admin_users      │  (与 web 用户分离以确保安全)                        │
│  └─────────────────────┘                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. 模块需求

### 6.1 模块 1：探索（首页）

**路由**：`/[locale]`

#### Hero 布局（响应式）

**桌面端（lg 及以上）**：
```
┌────────────────────────────────┬──────────────┐
│                                │   侧边 1     │
│       主轮播                    ├──────────────┤
│       (8 列)                   │   侧边 2     │
│                                │  (4 列)      │
└────────────────────────────────┴──────────────┘
```

**移动端**：
```
┌────────────────────────────────┐
│       主轮播                    │
│       (全宽)                   │
└────────────────────────────────┘
┌───────────────┬────────────────┐
│    侧边 1     │     侧边 2     │
└───────────────┴────────────────┘
```

#### 工具发现区域
- 按工具类型分组显示工具
- 每个工具卡片显示：缩略图、标题、最后更新时间
- 支持无限滚动或分页

### 6.2 模块 2：工作室（动态工作区）

**路由**：`/[locale]/studio/[toolTypeSlug]/[toolSlug]`

#### 动态界面加载

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

### 6.3 模块 3：资源（个人资源库）

**路由**：`/[locale]/assets`

#### 多态查看器

```typescript
// 根据输出 URL 的文件扩展名确定查看器
function AssetViewer({ task }: { task: Task }) {
  const url = task.outputData?.url || '';
  const ext = url.split('.').pop()?.toLowerCase();

  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) {
    return <ImageViewer src={url} />;
  }
  if (['glb', 'gltf'].includes(ext || '')) {
    return <ModelViewer src={url} />;
  }
  return <GenericPreview data={task.outputData} />;
}
```

---

## 7. 国际化

### 策略
- **路由**：前缀式（`/en/...`、`/ja/...`、`/pt/...`、`/zh/...`）
- **库**：next-intl（最新版）
- **默认语言**：`en`
- **内容国际化**：数据库中的翻译表

### 支持的语言

| 代码 | 语言 | 地区 |
|------|------|------|
| `en` | 英语 | 全球 |
| `ja` | 日语 | 日本 |
| `pt` | 葡萄牙语 | 巴西 |
| `zh` | 中文 | 简体 |

---

## 8. 主题系统

### 方案：next-themes + CSS 自定义属性

Web 应用支持多种颜色主题，带有明暗模式变体。

### 可用主题

| 主题 | 亮色主色 | 暗色主色 |
|------|----------|----------|
| 中性（默认） | 黑色 | 白色 |
| 绿色 | #00E676 | #00E676 |
| 蓝色 | #3b82f6 | #3b82f6 |
| 紫色 | #a855f7 | #a855f7 |
| 橙色 | #f97316 | #f97316 |

### 实现

#### ThemeProvider 配置
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

#### CSS 变量 (globals.css)
```css
/* 中性主题（默认亮色） */
:root, :root.neutral, .neutral {
  --primary: oklch(0.205 0 0);      /* 黑色 */
  --primary-foreground: oklch(0.985 0 0);
  /* ... 其他变量 */
}

/* 中性暗色主题 */
:root.neutral-dark, .neutral-dark {
  --primary: oklch(0.985 0 0);      /* 白色 */
  --primary-foreground: oklch(0.205 0 0);
  /* ... 其他变量 */
}

/* 颜色主题遵循相同模式 */
```

#### 暗色模式变体
```css
@custom-variant dark (&:is(.neutral-dark *, .green-dark *, .blue-dark *, .purple-dark *, .orange-dark *));
```

### 主题切换器组件

位置：`components/theme-switcher.tsx`

功能：
- 带有 5 个主题选项的颜色选择器（圆形按钮）
- 暗/亮模式切换（太阳/月亮图标）
- 平滑过渡
- 在 localStorage 中持久化选择

---

## 9. 认证与授权

### 方案：Logto

Web 和管理应用都使用 [Logto](https://logto.io/) 进行认证。

**为什么选择 Logto**：
- 开源且可自托管
- 支持社交登录、无密码、MFA
- OIDC/OAuth 2.0 兼容
- 良好的开发者体验和 SDK

### 实现（Web 应用）

#### 配置
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

#### 认证组件
- `components/auth/auth-status.tsx` - 认证状态的服务端组件
- `components/auth/sign-in-button.tsx` - 登录的客户端组件
- `components/auth/user-button.tsx` - 带有个人资料链接的用户下拉菜单

#### 路由
- `/callback` - OAuth 回调处理器（在语言路由之外）
- `/[locale]/profile` - 受保护的用户个人资料页

#### Logto 控制台配置
- **重定向 URI**：`http://localhost:3000/callback`
- **登出后重定向 URI**：`http://localhost:3000/`

### 个人资料页

#### 路由：`/[locale]/profile`

受保护的路由，未认证时重定向到首页。

#### 布局（响应式）

**桌面端（lg+）**：
```
┌──────────────┬─────────────────────────────────────────────┐
│              │                                              │
│  ┌────────┐  │  ┌────────────────────────────────────────┐ │
│  │ 头像   │  │  │  账户信息（可折叠）                     │ │
│  └────────┘  │  └────────────────────────────────────────┘ │
│  用户名      │                                              │
│              │  ┌────────────────────────────────────────┐ │
│  ──────────  │  │  偏好设置（可折叠）                     │ │
│  [账户]      │  │  - 主题选择器                           │ │
│  [偏好]      │  │  - 语言切换器                           │ │
│              │  └────────────────────────────────────────┘ │
│              │                                              │
│              │  ┌────────────────────────────────────────┐ │
│              │  │  账户操作                               │ │
│              │  │  [退出登录]                             │ │
│              │  └────────────────────────────────────────┘ │
├──────────────┴─────────────────────────────────────────────┤
```

**移动端（堆叠卡片）**：
```
┌─────────────────────┐
│  ┌─────┐            │
│  │头像 │ 用户名     │
│  └─────┘            │
├─────────────────────┤
│  ┌─────────────────┐│
│  │ 账户信息        ││
│  │ （可折叠）      ││
│  └─────────────────┘│
│  ┌─────────────────┐│
│  │ 偏好设置        ││
│  │ （可折叠）      ││
│  └─────────────────┘│
│  ┌─────────────────┐│
│  │ [退出登录]      ││
│  └─────────────────┘│
└─────────────────────┘
```

#### 个人资料功能
- 带有姓名首字母后备的用户头像
- 账户信息（姓名、邮箱、用户 ID、注册时间）
- 邮箱验证徽章
- 主题偏好（颜色选择器 + 暗色模式切换）
- 语言偏好
- 退出登录操作

---

## 10. 文件存储策略

> **决策**：AWS S3 四桶架构 + CloudFront CDN

### 架构概述

我们使用**四个独立的 S3 桶**配合 CloudFront 以实现更好的隔离、安全性和访问控制：

| 桶 | 用途 | 访问 | CloudFront |
|----|------|------|------------|
| `funmagic-admin-users-assets` | 管理员资源库和 Magi 生成的文件 | 私有（签名 URL） | 需要 |
| `funmagic-web-public-assets` | 横幅、工具缩略图、UI 资源 | 公开 | 需要（无认证） |
| `funmagic-web-users-assets-private` | Web 用户上传和 AI 结果 | 私有（签名 URL） | 需要 |
| `funmagic-web-users-assets-shared` | 用户分享的文件（公开链接） | 公开 | 需要（无认证） |

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         S3 + CloudFront 架构                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   管理应用 (3002)                          Web 应用 (3000)                   │
│        │                                           │                          │
│        ▼                                           ▼                          │
│   ┌─────────────┐                           ┌─────────────┐                  │
│   │   上传      │                           │   上传      │                  │
│   └──────┬──────┘                           └──────┬──────┘                  │
│          │                                         │                          │
│    ┌─────┴─────┐                            ┌──────┴──────┐                  │
│    ▼           ▼                            ▼             ▼                  │
│ ┌────────┐ ┌────────┐                 ┌──────────┐ ┌──────────┐             │
│ │ admin_ │ │public_ │                 │web_users_│ │web_users_│             │
│ │ users_ │ │assets  │                 │ assets_  │ │ assets_  │             │
│ │ assets │ │        │                 │ private  │ │ shared   │             │
│ │(私有)  │ │(公开)  │                 │(私有)    │ │ (公开)   │             │
│ └───┬────┘ └───┬────┘                 └────┬─────┘ └────┬─────┘             │
│     │          │                           │            │                    │
│     ▼          ▼                           ▼            ▼                    │
│ ┌────────────────────┐               ┌────────────────────────┐             │
│ │  CloudFront (OAC)  │               │    CloudFront (OAC)    │             │
│ │  + 签名 URL        │               │    + 签名 URL          │             │
│ └─────────┬──────────┘               └──────────┬─────────────┘             │
│           │                                      │                           │
│           ▼                                      ▼                           │
│ ┌────────────────────┐               ┌────────────────────────┐             │
│ │  CloudFront (CDN)  │               │    CloudFront (CDN)    │             │
│ │  公开访问          │               │    公开访问            │             │
│ └────────────────────┘               └────────────────────────┘             │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 桶结构

#### 1. funmagic-admin-users-assets（私有）

管理员用户的资源库上传和 Magi 工具生成的文件。所有路径包含 `{adminId}` 用于按管理员的文件管理。

```
funmagic-admin-users-assets/
├── {env}/                              # 环境前缀 (dev/staging/prod)
│   ├── library/
│   │   └── {adminId}/
│   │       └── {name}-{timestamp}.{ext}
│   └── magi/
│       └── {adminId}/
│           └── {name}-{timestamp}.{ext}
```

#### 2. funmagic-web-public-assets（公开）

横幅、工具缩略图和静态 UI 资源。所有管理员上传的路径包含 `{adminId}` 用于追踪上传者。

```
funmagic-web-public-assets/
├── {env}/                              # 环境前缀 (dev/staging/prod)
│   ├── banners/
│   │   └── {adminId}/
│   │       └── {name}-{timestamp}.{ext}
│   ├── tools/
│   │   └── {adminId}/
│   │       └── {toolId}/
│   │           └── {type}/             # thumbnail, images 等
│   │               └── {name}-{timestamp}.{ext}
│   └── brands/
│       └── {adminId}/
│           └── {name}-{timestamp}.{ext}
├── ui/
│   └── {图标、占位图等}
└── fonts/
    └── {自定义字体}
```

#### 3. funmagic-web-users-assets-private（私有）

Web 用户的 AI 任务结果。所有路径包含 `{userId}` 用于 GDPR 合规、按用户存储配额和便捷数据删除。

```
funmagic-web-users-assets-private/
└── tasks/
    └── {userId}/
        └── {year}/
            └── {month}/
                └── {day}/
                    └── {taskId}.{ext}
```

**路径模式：** `tasks/{userId}/{YYYY}/{MM}/{DD}/{taskId}.{extension}`

此结构支持：
- 按用户文件管理和存储配额
- GDPR 合规（可通过 userId 前缀轻松删除用户所有数据）
- 基于日期的组织用于归档和生命周期策略
- 高效列出用户最近的任务结果

#### 4. funmagic-web-users-assets-shared（公开）

用户公开分享的文件（从私有桶复制）。

```
funmagic-web-users-assets-shared/
└── {userid}/
    └── {share-id}/
        ├── {filename}
        └── metadata.json   # 可选：分享信息
```

**分享工作流程：**
1. 用户点击私有文件的"分享"
2. 系统生成唯一的 `share-id`
3. 文件从 `funmagic-web-users-assets-private` 复制到 `funmagic-web-users-assets-shared`
4. 返回公开 URL 用于分享
5. 用户可以"取消分享"以从分享桶删除

### CloudFront 分发

| 分发 | 源桶 | 访问控制 |
|------|------|----------|
| `funmagic-cf-admin-private` | `funmagic-admin-users-assets` | OAC + 签名 URL |
| `funmagic-cf-public` | `funmagic-web-public-assets` | 公开（无认证） |
| `funmagic-cf-web-private` | `funmagic-web-users-assets-private` | OAC + 签名 URL |
| `funmagic-cf-web-shared` | `funmagic-web-users-assets-shared` | 公开（无认证） |

### 安全配置

#### IAM 策略

**管理应用：**
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

**Web 应用：**
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

### CORS 配置

应用于所有桶：

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

### 生命周期策略

| 桶 | 路径 | 保留期 |
|----|------|--------|
| `funmagic-admin-users-assets` | `*/library/*` | 永久 |
| `funmagic-web-users-assets-private` | `*/upload/*` | 30 天 |
| `funmagic-web-users-assets-private` | `*/generated/*` | 90 天 |
| `funmagic-web-users-assets-shared` | `*` | 直到用户取消分享 |

### 缓存策略

| 内容类型 | Cache-Control | CDN TTL |
|----------|---------------|---------|
| 私有资源 | `private, max-age=3600` | 1 小时 |
| 公开横幅 | `public, max-age=86400` | 1 天 |
| 公开静态 | `public, max-age=31536000, immutable` | 1 年 |

### 文件名策略（缓存失效）

对于公开资源，使用**唯一文件名**来处理缓存失效：

```typescript
// 生成带时间戳的唯一文件名
const generateKey = (filename: string, folder: string) => {
  const timestamp = Date.now();
  const ext = filename.split('.').pop();
  const name = filename.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');
  return `${folder}/${name}-${timestamp}.${ext}`;
};
// 结果：banners/main/hero-banner-1704412800000.jpg
```

---

## 11. 任务处理与队列

### 决策：BullMQ + Redis

平台使用 **BullMQ** 配合 Redis 进行分布式任务处理，选择原因：
- 高性能、基于 Redis 的任务队列
- 原生 TypeScript 支持
- 高级任务调度和优先级
- 内置指数退避重试
- 通过 Redis Pub/Sub 实现实时任务事件
- 分布式 Worker 支持水平扩展

### 架构概述

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         任务编排器架构                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Web 应用 (3000)                            Worker（独立进程）              │
│        │                                            │                         │
│        ▼                                            ▼                         │
│   ┌─────────────────┐                    ┌─────────────────────┐             │
│   │ POST /api/tasks │                    │   BullMQ Workers    │             │
│   │                 │                    │   (每个队列)        │             │
│   │ 1. 用户认证    │                    │                     │             │
│   │ 2. 检查幂等键   │                    │ ┌─────────────────┐ │             │
│   │ 3. 检查并发    │                    │ │ 工具处理器      │ │             │
│   │ 4. 创建任务    │                    │ │ - background-rm │ │             │
│   │ 5. 入队作业    │                    │ │ - image-gen     │ │             │
│   └────────┬────────┘                    │ │ - upscale       │ │             │
│            │                             │ └─────────────────┘ │             │
│            ▼                             └──────────┬──────────┘             │
│   ┌─────────────────────────────────────────────────┼─────────────────────┐ │
│   │                          Redis                   │                     │ │
│   │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────┴─────┐               │ │
│   │  │ fal_ai   │ │  google  │ │  openai  │ │  default   │               │ │
│   │  │  队列    │ │  队列    │ │  队列    │ │   队列     │               │ │
│   │  └──────────┘ └──────────┘ └──────────┘ └────────────┘               │ │
│   │                                                                       │ │
│   │  ┌────────────────────┐  ┌────────────────────┐                      │ │
│   │  │ Pub/Sub 频道       │  │ 限流键             │                      │ │
│   │  │ task:user:{userId} │  │ user:tasks:active  │                      │ │
│   │  └────────────────────┘  └────────────────────┘                      │ │
│   │                                                                       │ │
│   │  ┌────────────────────┐  ┌────────────────────┐                      │ │
│   │  │ 熔断器             │  │ 幂等键             │                      │ │
│   │  │ circuit:{provider} │  │ idem:{user}:{hash} │                      │ │
│   │  └────────────────────┘  └────────────────────┘                      │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────────┐│
│   │                          PostgreSQL                                      ││
│   │  ┌──────────┐ ┌──────────┐ ┌─────────────────┐ ┌──────────────────┐    ││
│   │  │  tasks   │ │providers │ │ dead_letter_    │ │ task_usage_logs  │    ││
│   │  │          │ │          │ │ tasks           │ │                  │    ││
│   │  └──────────┘ └──────────┘ └─────────────────┘ └──────────────────┘    ││
│   └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 任务生命周期

#### 1. 任务创建 (POST /api/tasks)
```
1. 用户认证（Logto）
2. 解析请求：{ toolId, inputParams, idempotencyKey? }
3. 检查幂等性（Redis）- 如果重复则返回已存在的任务
4. 检查用户并发限制（Redis）- 最多 5 个活跃任务
5. 查找工具（DB）- 验证存在且激活
6. 创建任务记录（DB，status: pending）
7. 增加用户活跃任务计数（Redis）
8. 存储幂等键（Redis，1 小时 TTL）
9. 入队到 BullMQ（default 队列）
10. 返回 { taskId, status: 'pending' }
```

#### 2. 任务处理（Worker）
```
1. Worker 从队列获取作业
2. 验证工具是否支持
3. 获取工具处理器包装器
4. 执行处理器：
   a. 更新进度（10%）
   b. 从 DB 获取供应商凭据
   c. 调用供应商 API（fal.ai、Google Gemini 等）
   d. 更新进度（70%）
   e. 上传结果到 S3
   f. 更新进度（100%）
5. 完成任务：
   a. 更新 DB：status=success，outputData，completedAt
   b. 减少用户活跃任务计数（Redis）
   c. 发布 SSE 更新
   d. 记录使用量用于计费
```

#### 3. 实时更新（SSE）
```
GET /api/tasks/{taskId}/stream
1. 用户认证
2. 验证任务所有权
3. 如果已完成：返回最终状态
4. 创建 SSE 流
5. 订阅 Redis 频道：task:user:{userId}
6. 以 SSE 事件流式传输更新
7. 在终态时关闭（success/failed）
```

### 队列包 (@magiworld/queue)

位于 `packages/queue/`，提供：

| 模块 | 用途 |
|------|------|
| `redis.ts` | Redis 客户端单例，支持 TLS |
| `queues.ts` | BullMQ 队列工厂（fal_ai、google、openai、default）|
| `pubsub.ts` | Redis Pub/Sub 用于实时更新 |
| `ratelimit.ts` | 用户级并发限制 |
| `idempotency.ts` | 重复请求防护 |
| `circuit-breaker.ts` | 分布式熔断器 |
| `types.ts` | 共享 TypeScript 类型 |

### Worker 应用 (@magiworld/worker)

位于 `apps/worker/`，提供：

| 组件 | 用途 |
|------|------|
| `index.ts` | 入口点，为所有队列创建 workers |
| `config.ts` | Zod 验证的环境变量 |
| `s3.ts` | S3 上传工具，路径包含 userId |
| `processors/base.ts` | 基础处理器，带进度/完成助手 |
| `processors/wrapper.ts` | 包装工具处理器与基础功能 |
| `tools/index.ts` | 工具处理器注册表 |
| `tools/background-remove.ts` | 背景移除工具处理器 |
| `tools/types.ts` | 工具处理器接口 |
| `tools/provider-client.ts` | 从 DB 获取供应商凭据 |

### 容错机制

#### 熔断器
- 基于 Redis 的分布式熔断器
- 状态：`closed` → `open`（5 次失败后）→ `half-open`（30 秒后）
- 防止对外部供应商的级联故障
- 管理 UI 支持手动重置

#### 死信队列
- 失败作业（3 次重试后）移至 `dead_letter_tasks` 表
- 包含：原始任务 ID、错误消息/堆栈、尝试次数、完整负载
- 管理 UI 用于审查和手动重试

#### 幂等性
- 防止重试导致的重复处理
- 每用户+幂等键 1 小时 TTL
- 键模式：`idem:{userId}:{hash}`

#### 优雅关闭
- 收到 SIGTERM/SIGINT 时暂停 workers
- 等待活跃作业完成（可配置超时）
- 干净地关闭所有连接

### 限流

#### 用户级（并发）
- 每用户最多 5 个并发活跃任务（可配置）
- Redis 键：`user:tasks:active:{userId}`
- 创建时增加，完成时减少
- TTL：1 小时（活动时自动延长）

#### 供应商级（队列）
- BullMQ 作业选项：3 次尝试，指数退避
- 每供应商限流存储在数据库
- 默认超时：120 秒

### 队列隔离（Web 与 Admin）

平台通过 `QUEUE_PREFIX` 环境变量支持 Web 用户和 Admin 用户的独立队列：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           队列隔离架构                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Web 应用 (端口 3000)                   Admin 应用 (端口 3001)              │
│   QUEUE_PREFIX=""                        QUEUE_PREFIX="admin"                │
│        │                                        │                             │
│        ▼                                        ▼                             │
│   ┌─────────────────┐                    ┌─────────────────┐                 │
│   │ POST /api/tasks │                    │ POST /api/tasks │                 │
│   │ 优先级: WEB=5   │                    │ 优先级: ADMIN=15│                 │
│   └────────┬────────┘                    └────────┬────────┘                 │
│            │                                      │                           │
│            ▼                                      ▼                           │
│   ┌─────────────────────────────────────────────────────────────────────────┐│
│   │                          Redis                                           ││
│   │  ┌──────────────────────────┐  ┌──────────────────────────┐            ││
│   │  │ Web 队列                 │  │ Admin 队列               │            ││
│   │  │ • default                │  │ • admin:default          │            ││
│   │  │ • fal_ai                 │  │ • admin:fal_ai           │            ││
│   │  │ • google                 │  │ • admin:google           │            ││
│   │  └──────────────────────────┘  └──────────────────────────┘            ││
│   └─────────────────────────────────────────────────────────────────────────┘│
│            │                                      │                           │
│            ▼                                      ▼                           │
│   ┌─────────────────┐                    ┌─────────────────┐                 │
│   │ Web Worker      │                    │ Admin Worker    │                 │
│   │ QUEUE_PREFIX="" │                    │ QUEUE_PREFIX=   │                 │
│   │ 使用: providers │                    │ "admin"         │                 │
│   └─────────────────┘                    │ 使用: admin-    │                 │
│                                          │ Providers       │                 │
│                                          └─────────────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 队列前缀配置

| 环境 | QUEUE_PREFIX | 队列名称 | 供应商表 |
|------|--------------|----------|----------|
| Web 应用 | `` (空) | `default`, `fal_ai`, `google` | `providers` |
| Admin 应用 | `admin` | `admin:default`, `admin:fal_ai`, `admin:google` | `admin_providers` |

#### 隔离的好处

- **成本追踪**：独立的 API 密钥允许分别追踪 admin 和用户使用量
- **限流**：Admin 使用不影响用户配额
- **扩展**：可以独立扩展 admin 和 web worker
- **优先级**：Web 任务具有更高优先级（优先处理）

### 任务优先级

BullMQ 使用数字优先级，**数字越小优先级越高**（优先处理）。

```typescript
export enum TaskPriority {
  URGENT = 1,   // 最高优先级 - 紧急任务
  HIGH = 5,     // 高优先级
  WEB = 5,      // Web 用户任务（web 应用默认）
  NORMAL = 10,  // 正常优先级
  ADMIN = 15,   // Admin 任务（admin 应用默认）
  LOW = 20,     // 后台/批量任务
}
```

| 来源 | 默认优先级 | 值 | 处理顺序 |
|------|-----------|-----|---------|
| Web 应用 | `TaskPriority.WEB` | 5 | 优先 |
| Admin 应用 | `TaskPriority.ADMIN` | 15 | 其次 |
| 后台作业 | `TaskPriority.LOW` | 20 | 最后 |

---

## 12. 供应商管理

### 概述

AI 供应商通过数据库管理，配有管理 UI。这允许运行时更新而无需代码部署。

### 供应商配置

```typescript
interface Provider {
  id: string;
  slug: string;               // 'fal_ai' | 'google' | 'openai'
  name: string;               // 显示名称
  apiKeyEncrypted: string;    // 加密的 API 密钥
  baseUrl?: string;           // 可选的自定义端点
  rateLimitMax: number;       // 每窗口最大请求数
  rateLimitWindow: number;    // 窗口（毫秒）
  defaultTimeout: number;     // 默认超时（毫秒）
  status: 'active' | 'inactive' | 'degraded';
  circuitState: 'closed' | 'open' | 'half_open';
  circuitOpenedAt?: Date;
  failureCount: number;
  configJson?: object;        // 供应商特定配置
  isActive: boolean;
}
```

### 管理 UI 功能

- **查看供应商**：状态徽章、熔断器状态、限流配置
- **创建/编辑供应商**：配置 API 密钥、限流、超时
- **熔断器**：查看状态、失败次数、手动重置
- **状态切换**：激活/停用/降级模式

### 供应商客户端

工具处理器在运行时获取凭据。客户端根据 `QUEUE_PREFIX` 自动选择正确的表：

```typescript
import { getProviderCredentials } from './provider-client';

// 自动使用：
// - providers 表（QUEUE_PREFIX="" 或未定义）
// - admin_providers 表（QUEUE_PREFIX="admin"）
const credentials = await getProviderCredentials('fal_ai');
// { slug, apiKey, baseUrl }
```

### Admin 供应商（成本隔离）

独立的 `admin_providers` 表存储 Admin Magi 工具的 API 密钥：

```typescript
interface AdminProvider {
  id: string;
  slug: string;               // 'fal_ai' | 'google'
  name: string;               // 显示名称
  apiKeyEncrypted: string;    // API 密钥（直接存储，可选加密）
  status: 'active' | 'inactive';
  configJson?: object;        // 供应商特定配置（如 baseUrl）
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

#### 为什么使用独立表？

| 关注点 | Web `providers` | Admin `admin_providers` |
|--------|-----------------|------------------------|
| **成本归属** | 用户计费 | 内部/admin 预算 |
| **限流** | 每用户配额 | 无用户配额 |
| **熔断器** | 完整熔断器 | 简化（仅状态） |
| **配置** | 完整配置（限流、超时） | 最小配置 |

#### Admin 供应商 UI

位于 admin 应用的 `/admin-providers`：
- **列表**：查看已配置的供应商和遮罩的 API 密钥
- **创建**：添加新供应商（slug、名称、API 密钥）
- **编辑**：更新凭据或状态
- **删除**：删除供应商（需确认）

Magi 工具所需的 slug：
- `fal_ai` - 背景移除、图像生成、放大、重渲染
- `google` - Nanobanana Pro（Gemini 2.0 Flash 图像生成）

---

## 13. API 安全

### AI API 代理

所有 AI API 调用**必须**通过 Next.js API 路由：

```
客户端 → /api/ai/stylize → 外部 AI API
              │
              └─── API 密钥在服务端注入
```

---

## 13. 性能优化

### 代码分割
每个工具界面通过 `next/dynamic` 是单独的代码块。

### 图片优化
使用配置了远程模式的 Next.js `<Image>` 组件。

### 缓存策略

| 资源 | 缓存策略 |
|------|----------|
| 工具元数据 | ISR（60 秒重新验证） |
| 用户任务 | 不缓存（动态） |
| 静态资源 | 不可变（1 年） |

---

## 14. 环境配置

### 必需的环境变量

```bash
# .env.example

# ==============================================
# 数据库（必需）
# ==============================================
DATABASE_URL=postgresql://user:password@localhost:9000/magi-db

# ==============================================
# AWS S3 存储 - 四桶架构（必需）
# ==============================================
AWS_REGION=us-east-2
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# 管理应用桶
S3_ADMIN_ASSETS_BUCKET=funmagic-admin-users-assets
S3_PUBLIC_ASSETS_BUCKET=funmagic-web-public-assets

# Web 应用桶
S3_WEB_PRIVATE_BUCKET=funmagic-web-users-assets-private
S3_WEB_SHARED_BUCKET=funmagic-web-users-assets-shared

# ==============================================
# CloudFront CDN（必需）
# ==============================================
# 公开 CDN - 提供横幅、工具图片、品牌 logo
CLOUDFRONT_PUBLIC_URL=https://d1arbct25l8u2x.cloudfront.net
CLOUDFRONT_WEB_SHARED_URL=https://shared.funmagic.ai

# 私有 CDN - 提供用户资源（需要签名 URL）
CLOUDFRONT_ADMIN_PRIVATE_URL=https://d2wcxayah4inv3.cloudfront.net
CLOUDFRONT_WEB_PRIVATE_URL=https://d1jmkr23cr2ayz.cloudfront.net

# CloudFront 签名 URL 配置
CLOUDFRONT_KEY_PAIR_ID=
CLOUDFRONT_PRIVATE_KEY=

# ==============================================
# 客户端环境变量
# ==============================================
NEXT_PUBLIC_CLOUDFRONT_URL=https://d1arbct25l8u2x.cloudfront.net
NEXT_PUBLIC_CLOUDFRONT_ADMIN_URL=https://d2wcxayah4inv3.cloudfront.net

# ==============================================
# 上传配置（可选）
# ==============================================
UPLOAD_MAX_SIZE_MB=20
NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB=20

# ==============================================
# AI API
# ==============================================
OPENAI_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
FAL_API_KEY=

# ==============================================
# Redis（BullMQ + Pub/Sub）
# ==============================================
REDIS_URL=redis://localhost:6379
REDIS_TLS=false                              # AWS ElastiCache 设为 true

# ==============================================
# Worker 配置（仅 apps/worker）
# ==============================================
WORKER_CONCURRENCY=5                         # 1-50 并发作业
WORKER_SHUTDOWN_TIMEOUT_MS=30000             # 优雅关闭超时

# ==============================================
# 认证（Logto）
# ==============================================
# Web 应用（端口 3000）
LOGTO_ENDPOINT=
LOGTO_APP_ID=
LOGTO_APP_SECRET=
LOGTO_BASE_URL=http://localhost:3000
LOGTO_COOKIE_SECRET=

# 管理应用（端口 3001）
LOGTO_ADMIN_ENDPOINT=
LOGTO_ADMIN_APP_ID=
LOGTO_ADMIN_APP_SECRET=
LOGTO_ADMIN_BASE_URL=http://localhost:3001
LOGTO_ADMIN_COOKIE_SECRET=
```

---

## 15. 开发工作流

### 开发脚本

```json
// package.json (根目录)
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

### 应用 URL

| 应用 | 开发环境 | 生产环境 |
|------|----------|----------|
| Web | http://localhost:3000 | funmagic.ai |
| 管理 | http://localhost:3002 | admin.funmagic.ai |

---

## 16. 已决定事项与待决问题

### 已决定事项

| # | 问题 | 决定 |
|---|------|------|
| 1 | CMS | 使用共享 Drizzle DB 的自定义管理应用 |
| 2 | 认证 | Logto |
| 3 | 文件存储 | AWS S3 配合 CloudFront CDN |
| 4 | 任务队列 | BullMQ + Redis |

### 待决问题

| # | 问题 | 选项 |
|---|------|------|
| 1 | 分析解决方案？ | AWS CloudWatch / Plausible / PostHog |
| 2 | 错误监控？ | Sentry / AWS X-Ray |
| 3 | 支付集成？ | Stripe / Paddle / LemonSqueezy |

---

## 17. AI 提供商集成

### 概述

平台使用**原生提供商 SDK** 实现所有 AI 功能。这种方法提供了对提供商特定功能的完整访问、更好的 TypeScript 类型支持，以及相比抽象层更简单的调试。

### 架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          原生 AI 提供商 SDK                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐            │
│  │    OpenAI       │   │     Google      │   │     Fal.ai      │            │
│  │     openai      │   │  @google/genai  │   │ @fal-ai/client  │            │
│  ├─────────────────┤   ├─────────────────┤   ├─────────────────┤            │
│  │ • GPT-4o        │   │ • Gemini 2.0    │   │ • BRIA RMBG 2.0 │            │
│  │ • GPT-4o Mini   │   │ • Gemini 1.5    │   │ • Flux Schnell  │            │
│  │ • GPT-4 Turbo   │   │ • Gemini 2.5    │   │ • Real-ESRGAN   │            │
│  │                 │   │   Flash Image   │   │ • Flux Dev I2I  │            │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘            │
│           │                      │                      │                    │
│           └──────────────────────┼──────────────────────┘                    │
│                                  ▼                                           │
│                      ┌─────────────────────────┐                             │
│                      │   AI 工具实现           │                             │
│                      │   apps/admin/lib/ai/    │                             │
│                      │   apps/worker/src/tools/│                             │
│                      └──────────┬──────────────┘                             │
│                                 │                                            │
│                                 ▼                                            │
│                      ┌─────────────────────────┐                             │
│                      │   共享 AI 工具库        │                             │
│                      │   @magiworld/utils/ai   │                             │
│                      └─────────────────────────┘                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 依赖包

| 包 | 用途 |
|----|------|
| `openai` | OpenAI API 客户端，用于 GPT 模型 |
| `@google/genai` | Google AI 客户端，用于 Gemini 模型 |
| `@fal-ai/client` | Fal.ai 客户端，用于图像处理模型 |
| `@magiworld/utils/ai` | 共享类型和 AI 操作辅助函数 |

### 支持的模型

#### 文本生成模型

| 提供商 | 模型 ID | 显示名称 | 描述 |
|--------|---------|----------|------|
| OpenAI | `gpt-4o-mini` | GPT-4o Mini | 快速且经济 |
| OpenAI | `gpt-4o` | GPT-4o | 最强大 |
| OpenAI | `gpt-4-turbo` | GPT-4 Turbo | 快速 GPT-4 |
| Google | `gemini-2.0-flash` | Gemini 2.0 Flash | 快速且智能 |
| Google | `gemini-1.5-pro` | Gemini 1.5 Pro | 高级推理 |

#### 图像生成模型

| 提供商 | 模型 ID | 显示名称 | 支持输入图像 |
|--------|---------|----------|--------------|
| OpenAI | `gpt-image-1` | GPT Image 1 | ✅（最多 16 张） |
| OpenAI | `gpt-image-1.5` | GPT Image 1.5 | ✅（最多 16 张） |
| Google | `gemini-2.5-flash-preview-image-generation` | Gemini 2.5 Flash Image | ✅（最多 16 张） |
| Google | `gemini-3-pro-image-preview` | Gemini 3 Pro Image | ✅（最多 16 张） |

#### 图像处理模型（Fal.ai）

| 工具 | 模型 | 能力 |
|------|------|------|
| 背景移除 | `fal-ai/bria/background/remove` | 使用 BRIA RMBG 2.0 移除图像背景 |
| 图像生成 | `fal-ai/flux/schnell` | 从提示词生成图像（支持宽高比：1:1、16:9、9:16、4:3、3:4） |
| 图像放大 | Fal 放大模型 | 增强图像分辨率 |
| 图像重绘 | Fal 渲染模型 | 重新设计图像风格 |

#### 管理应用 AI 工具（lib/ai/tools/）

管理应用包含位于 `apps/admin/lib/ai/tools/` 的专用 AI 工具：

```
lib/ai/tools/
├── index.ts              # 工具注册表和导出
├── background-remove.ts  # BRIA RMBG 2.0 集成
├── image-generate.ts     # Flux Schnell 图像生成
├── image-upscale.ts      # 图像放大
├── image-rerender.ts     # 图像重绘
└── nanobanana-pro.ts     # NanoBanana Pro 集成
```

**背景移除工具：**
```typescript
// 使用 Fal.ai BRIA RMBG 2.0
import { fal } from '@fal-ai/client';

const result = await fal.subscribe('fal-ai/bria/background/remove', {
  input: { image_url: signedUrl },
});
```

**图像生成工具：**
```typescript
// 使用 Fal.ai Flux Schnell，支持宽高比
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

### 实现

#### 提供商配置

```typescript
// lib/ai/chat-providers.ts
import { createOpenAI } from '@ai-sdk/openai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const providers = {
  openai: () => createOpenAI({ apiKey: process.env.OPENAI_API_KEY }),
  google: () => createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY }),
};
```

#### Chat API 路由

`/api/chat` 路由处理所有聊天请求，根据模型能力自动路由：

```typescript
// 文本模型 → streamText（流式响应）
if (modelConfig.capability === 'text') {
  return streamText({ model, messages }).toUIMessageStreamResponse();
}

// 图像模型 → generateImage/generateText（JSON 响应）
if (modelConfig.capability === 'image-generation') {
  if (modelConfig.provider === 'openai') {
    return handleOpenAIImageGeneration(messages, modelConfig);
  } else {
    return handleGoogleImageGeneration(messages, modelConfig);
  }
}
```

#### 客户端集成

聊天组件使用 `@ai-sdk/react` 的 `useChat` hook 实现实时流式传输：

```typescript
import { useChat } from '@ai-sdk/react';

const { messages, input, handleSubmit, isLoading } = useChat({
  api: '/api/chat',
  body: { modelId, conversationId },
});
```

### 环境变量

```bash
# AI API 密钥
OPENAI_API_KEY=sk-...                          # OpenAI API 密钥
GOOGLE_GENERATIVE_AI_API_KEY=...               # Google AI API 密钥
FAL_API_KEY=...                                # Fal.ai API 密钥
```

---

## 18. CloudFront 签名 URL

### 概述

私有 S3 桶（`funmagic-admin-assets`）通过带有签名 URL 的 CloudFront 访问，以实现安全的、有时间限制的访问。

### 架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CloudFront 签名 URL 流程                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   管理应用 (3002)                                                            │
│         │                                                                     │
│         ▼                                                                     │
│   ┌─────────────────┐                                                        │
│   │  上传路由       │ ──► S3 预签名 URL ──► funmagic-admin-assets           │
│   │  /api/upload    │                              (私有桶)                  │
│   └────────┬────────┘                                    │                   │
│            │                                             │                   │
│            ▼                                             ▼                   │
│   ┌─────────────────┐                         ┌─────────────────────┐       │
│   │   数据库        │                         │    CloudFront       │       │
│   │   (media 表)    │                         │    分发             │       │
│   │   存储 URL：    │                         │    (启用 OAC)       │       │
│   │   cf-url/key    │                         └──────────┬──────────┘       │
│   └────────┬────────┘                                    │                   │
│            │                                             │                   │
│            ▼                                             ▼                   │
│   ┌─────────────────┐         签名 URL        ┌─────────────────────┐       │
│   │   maybeSignUrl  │ ◄──────────────────────►│   私钥              │       │
│   │   工具函数      │                         │   (RSA)             │       │
│   └────────┬────────┘                         └─────────────────────┘       │
│            │                                                                  │
│            ▼                                                                  │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │   带过期时间的签名 URL：                                              │   │
│   │   https://admin.cloudfront.net/media/image.jpg                       │   │
│   │   ?Expires=1234567890&Signature=...&Key-Pair-Id=...                  │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 实现

#### 签名工具函数

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

// 仅当 URL 来自管理 CloudFront 分发时签名
export function maybeSignUrl(url: string, expirySeconds?: number): string {
  const adminUrl = process.env.CLOUDFRONT_ADMIN_URL;
  if (!adminUrl || !url.startsWith(adminUrl)) return url;
  if (!isSignedUrlsEnabled()) return url;
  return signCloudFrontUrl(url, expirySeconds);
}
```

#### 使用模式

```typescript
// 加载资源库项目用于显示时
const signedUrls = mediaItems.map(item => maybeSignUrl(item.url));

// 发送图像到 AI API 时（较长过期时间用于处理）
const signedUrl = maybeSignUrl(imageUrl, 3600); // 1 小时用于 AI 处理

// 返回带图像的聊天消息时
const signedMessages = messages.map(msg => ({
  ...msg,
  content: signMessageContent(msg.content), // 签名嵌入的 URL
}));
```

### 环境变量

```bash
# CloudFront 配置
CLOUDFRONT_ADMIN_URL=https://admin-assets.cloudfront.net  # 管理资源分发
CLOUDFRONT_URL=https://cdn.funmagic.ai                   # 公开 CDN 分发
CLOUDFRONT_KEY_PAIR_ID=K...                               # CloudFront 密钥对 ID
CLOUDFRONT_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."  # RSA 私钥
CLOUDFRONT_SIGNED_URL_EXPIRY=3600                         # 默认过期时间（秒）
```

### 桶配置

| 桶 | CloudFront | 签名 URL | 用例 |
|----|------------|----------|------|
| `funmagic-admin-assets` | ✅ OAC | ✅ 需要 | 管理资源库、AI 聊天图像 |
| `funmagic-cdn` | ✅ 公开 | ❌ 不需要 | 横幅、工具图像（公开） |
| `funmagic-user-uploads` | ❌ 直接 S3 | ✅ 预签名 | 用户上传（通过预签名） |

---

## 19. Magi AI 助手

### 概述

Magi 是管理员的 AI 助手，提供统一的聊天界面，支持：
- **文本对话** - 使用 GPT-4o 和 Gemini 模型
- **图像生成** - 使用 OpenAI 和 Google 图像模型
- **图像编辑** - 上传图像并提供提示词
- **AI 图像工具** - 背景移除、放大、重绘

### 数据库模式

```sql
-- 对话
CREATE TABLE chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  provider TEXT NOT NULL DEFAULT 'openai',
  model TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP  -- 软删除
);

-- 消息（AI SDK 兼容）
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,  -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP  -- 软删除
);
```

### 消息内容格式

消息支持多种内容类型，以 JSON 存储：

```typescript
// 纯文本
{ type: 'text', text: '你好！' }

// 带图像的用户消息
{
  type: 'user-with-images',
  text: '这张图片里有什么？',
  images: [{ url: 'https://cf.../image.jpg' }]
}

// AI 生成的图像响应
{
  type: 'image-generation',
  text: '为"山上的日落"生成的图像',
  images: [{ url: 'https://cf.../generated.png' }]
}
```

### 功能

| 功能 | 描述 |
|------|------|
| **模型切换** | 在对话中切换 OpenAI 和 Google 模型 |
| **图像上传** | 为视觉/编辑模型上传最多 16 张图像 |
| **图像生成** | 从文本提示词生成图像 |
| **图像编辑** | 使用文本指令编辑上传的图像 |
| **保存到资源库** | 将生成的图像保存到管理媒体库 |
| **对话历史** | 持久化对话，支持软删除 |
| **流式响应** | 文本模型的实时流式传输 |

### API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/chat` | POST | 与 AI 聊天（流式或 JSON 响应） |
| `/api/upload` | POST | 上传聊天图像（路由：`chatImages`） |
| `/api/tasks` | POST/GET | 创建任务、列出任务 |
| `/api/tasks/[taskId]` | GET | 获取任务状态 |
| `/api/tasks/[taskId]/stream` | GET | SSE 实时进度流 |

### Magi 图像工具（基于任务）

Magi 图像工具使用与 Web 应用工具相同的基于任务的架构：

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      Magi 工具任务流程                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Admin UI                  Admin API                 Admin Worker           │
│   ┌─────────────┐          ┌─────────────┐          ┌─────────────┐         │
│   │ 背景移除    │  POST    │ /api/tasks  │  入队    │ QUEUE_PREFIX│         │
│   │ 图像生成    │ ───────▶ │             │ ───────▶ │ =admin      │         │
│   │ 放大器      │          │ 返回        │          │             │         │
│   │ 重渲染器    │ ◀─────── │ taskId      │          │ 使用:       │         │
│   └─────────────┘          └─────────────┘          │ admin_      │         │
│         │                                           │ providers   │         │
│         │                                           └──────┬──────┘         │
│         │                                                  │                 │
│         │  SSE                                             │                 │
│         │  /api/tasks/{id}/stream                          │ Redis          │
│         │                                                  │ Pub/Sub        │
│         ▼                                                  ▼                 │
│   ┌─────────────┐          ┌─────────────────────────────────┐             │
│   │ 实时        │ ◀─────── │ task:user:{adminId} 频道        │             │
│   │ 进度 UI     │          └─────────────────────────────────┘             │
│   └─────────────┘                                                           │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 可用工具

| 工具 | 供应商 | 模型 |
|------|--------|------|
| 背景移除 | fal_ai | BRIA RMBG 2.0 |
| 图像生成 | fal_ai | Flux Schnell |
| 图像放大 | fal_ai | Real-ESRGAN |
| 图像重渲染 | fal_ai | Flux Dev（图像到图像） |
| Nanobanana Pro | google | Gemini 2.0 Flash |

#### useTask Hook

Admin 工具使用 `useTask` hook 管理任务生命周期：

```typescript
import { useTask } from './hooks/use-task';

function BackgroundRemover() {
  const task = useTask();

  const handleProcess = async () => {
    await task.createTask({
      toolId: BACKGROUND_REMOVE_TOOL_ID,
      inputParams: { imageUrl: selectedImage.url },
    });
  };

  // 根据任务状态渲染
  return (
    <div>
      {task.isLoading && <Progress value={task.progress} />}
      {task.status === 'success' && <Result url={task.outputData.resultUrl} />}
      {task.error && <Error message={task.error} />}
    </div>
  );
}
```

---

## 20. Web 应用工具

### 已注册工具

Web 应用包含带有自定义界面的专用 AI 工具。每个工具都在 `TOOL_REGISTRY` 中注册，并有对应的 React 组件。

| 工具 Slug | 组件 | 描述 |
|-----------|------|------|
| `background-remove` | `BackgroundRemoveInterface` | 使用 Fal.ai BRIA RMBG 2.0 的 AI 背景移除 |
| `3d-crystal` | `Crystal3DInterface` | 带有图像裁剪的 3D 水晶雕刻预览 |

### 背景移除工具

背景移除工具（`background-remove`）使用 Fal.ai 的 BRIA RMBG 2.0 模型实现高质量的背景移除。

#### 功能

- **图像上传**：拖放或点击上传图像
- **实时处理**：显示处理状态和加载指示器
- **结果预览**：原图和处理后图像的并排对比
- **下载**：下载带有透明背景的处理后图像

#### 组件结构

```
apps/web/components/tools/background-remove/
├── index.tsx          # 主 BackgroundRemoveInterface 组件
├── image-uploader.tsx # 带拖放的上传区域
└── result-preview.tsx # 前后对比视图
```

#### API 集成

```typescript
// 调用管理 API，代理到 Fal.ai
const response = await fetch('/api/ai/background-remove', {
  method: 'POST',
  body: JSON.stringify({ imageUrl }),
});
```

### 3D 水晶工具

3D 水晶工具（`3d-crystal`）允许用户预览他们的图像在水晶块内激光雕刻后的效果。

#### 功能

- **选项卡界面**：图像选项卡用于上传/裁剪，3D 水晶选项卡用于预览
- **图像裁剪**：内置带宽高比约束的裁剪器
- **3D 预览**：Three.js 实时可视化，包括：
  - 带玻璃材质的旋转水晶立方体
  - 使用 Canvas 渲染为 3D 纹理的图像
  - 360° 视角的轨道控制
  - 水晶上可自定义的文字叠加
- **响应式 UI**：大屏幕上全宽上传区域，移动端优化布局

#### 技术实现

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        3D 水晶工具架构                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   Crystal3DInterface (index.tsx)                                             │
│   ├── Tabs 组件 (Base UI)                                                    │
│   │   ├── 图像选项卡                                                         │
│   │   │   ├── 上传区域（拖放）                                               │
│   │   │   └── ImageCropper（嵌入模式）                                       │
│   │   │       └── react-cropper / cropperjs                                  │
│   │   │                                                                       │
│   │   └── 3D 水晶选项卡                                                      │
│   │       ├── CubeViewer (Three.js 画布)                                     │
│   │       │   ├── 水晶立方体 (MeshPhysicalMaterial)                          │
│   │       │   └── Text3D (Canvas 纹理 + 双平面)                              │
│   │       └── 控件（文字输入、重新裁剪、更换图像）                           │
│   │                                                                           │
│   └── 状态管理                                                                │
│       ├── imageState: 'upload' | 'cropping' | 'preview'                      │
│       ├── rawImage: string | null                                             │
│       ├── croppedImage: string | null                                         │
│       └── customText: string                                                  │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 关键技术

| 技术 | 用途 |
|------|------|
| `@react-three/fiber` | Three.js 的 React 渲染器 |
| `@react-three/drei` | 辅助组件（OrbitControls 等） |
| `three` | 3D 图形库 |
| `react-cropper` | 图像裁剪 UI |
| `cropperjs` | 裁剪引擎 |

#### Canvas 纹理方法

为了在水晶上渲染文字（包括 CJK 字符），我们使用基于 Canvas 的方法：

```typescript
// 创建带文字的 canvas
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
ctx.font = '48px sans-serif';
ctx.fillText(text, x, y);

// 用作纹理
const texture = new THREE.CanvasTexture(canvas);
```

**双平面三明治技术**：两个背靠背放置的平面确保文字从水晶两侧都可见：

```typescript
<group>
  {/* 正面平面 */}
  <mesh position={[0, 0, 0.01]}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial map={texture} transparent />
  </mesh>
  {/* 背面平面（旋转 180°） */}
  <mesh position={[0, 0, -0.01]} rotation={[0, Math.PI, 0]}>
    <planeGeometry args={[width, height]} />
    <meshBasicMaterial map={texture} transparent />
  </mesh>
</group>
```

#### 组件文件

```
apps/web/components/tools/3d-crystal/
├── index.tsx          # 带选项卡和状态的主 Crystal3DInterface
├── cube-viewer.tsx    # 带水晶立方体和文字的 Three.js 画布
└── image-cropper.tsx  # 裁剪器组件（嵌入或对话框模式）
```

---

## 21. 共享工具函数（管理后台）

### 概述

管理应用包含用于常见操作的集中式工具函数，如文件验证、图像尺寸检测和上传配置。这些工具函数确保组件之间的一致性并减少代码重复。

### 21.1 上传配置

上传大小限制通过环境变量集中管理，允许无需代码更改即可轻松配置。

#### 环境变量

```bash
# 服务端限制（API 路由）
UPLOAD_MAX_SIZE_MB=20

# 客户端限制（表单验证）- 必须与服务端匹配
NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB=20
```

#### 使用方法

```typescript
// lib/env.ts - 服务端
import { getUploadMaxSize, getUploadMaxSizeMB } from '@/lib/env';

const maxBytes = getUploadMaxSize();      // 例如 20971520（20MB 字节数）
const maxMB = getUploadMaxSizeMB();       // 例如 20

// lib/utils/file.ts - 客户端（从 NEXT_PUBLIC_* 读取）
import { MAX_FILE_SIZE, MAX_FILE_SIZE_MB } from '@/lib/utils/file';

if (file.size > MAX_FILE_SIZE) {
  throw new Error(`文件太大。最大：${MAX_FILE_SIZE_MB}MB`);
}
```

### 21.2 文件验证工具函数

位于 `lib/utils/file.ts`，提供文件类型和大小验证。

```typescript
import {
  isValidImageType,
  isValidFileSize,
  validateFile,
  getFileExtension,
  MAX_FILE_SIZE,
  MAX_FILE_SIZE_MB
} from '@/lib/utils/file';

// 验证文件类型（仅图像）
const isImage = isValidImageType(file);  // jpg、png、gif、webp 返回 true

// 验证文件大小
const isSizeOk = isValidFileSize(file);  // 低于 MAX_FILE_SIZE 返回 true

// 带错误消息的组合验证
const result = validateFile(file);
if (!result.valid) {
  console.error(result.error);  // "不允许的文件类型" 或 "文件太大"
}
```

### 21.3 图像尺寸工具函数

位于 `lib/utils/image.ts`，提供图像尺寸检测和宽高比验证。

#### 核心函数

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

// 从 File 对象获取尺寸
const { width, height } = await getImageDimensions(file);

// 从 URL 获取尺寸
const dims = await getImageDimensionsFromUrl('https://example.com/image.jpg');

// 计算宽高比
const ratio = calculateAspectRatio({ width: 1920, height: 1080 });  // 1.777...

// 带容差验证宽高比
const result = validateAspectRatio(
  { width: 1920, height: 1080 },  // 尺寸
  16 / 9,                          // 预期比例
  '16:9',                          // 显示标签
  0.05                             // 容差（5%）
);
// result: { isMatch: true, actualRatio: 1.777, actualRatioFormatted: '16:9', ... }

// 检查图像是否为正方形
const square = isSquare({ width: 500, height: 500 });  // true

// 验证最小尺寸
const minCheck = validateMinDimensions({ width: 800, height: 600 }, 1024, 768);
// { isValid: false, error: '图像必须至少为 1024x768 像素' }
```

#### 预定义宽高比

```typescript
export const ASPECT_RATIOS = {
  '1:1':   { ratio: 1,      label: '1:1（正方形）' },
  '4:3':   { ratio: 4/3,    label: '4:3（标准）' },
  '16:9':  { ratio: 16/9,   label: '16:9（宽屏）' },
  '21:9':  { ratio: 21/9,   label: '21:9（超宽）' },
  '3:4':   { ratio: 3/4,    label: '3:4（竖向）' },
  '9:16':  { ratio: 9/16,   label: '9:16（移动端）' },
};
```

#### React Hook

`useImageDimensions` hook 自动提取尺寸并为上传的文件创建预览 URL。

```typescript
import { useImageDimensions } from '@/lib/utils/image';

function ImageUploader() {
  const [file, setFile] = useState<File | null>(null);
  const { dimensions, previewUrl, loading, error } = useImageDimensions(file);

  return (
    <div>
      <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

      {loading && <p>正在加载尺寸...</p>}
      {error && <p>错误：{error}</p>}

      {dimensions && (
        <p>尺寸：{dimensions.width} x {dimensions.height}</p>
      )}

      {previewUrl && (
        <img src={previewUrl} alt="预览" />
      )}
    </div>
  );
}
```

#### Hook 返回类型

```typescript
interface UseImageDimensionsResult {
  dimensions: ImageDimensions | null;  // { width, height }
  previewUrl: string | null;           // 用于预览的 Object URL
  loading: boolean;                    // 处理时为 true
  error: string | null;                // 失败时的错误消息
}
```

### 21.4 在表单组件中的使用

这些工具函数用于表单组件的图像验证：

#### 横幅表单（banner-form.tsx）

```typescript
const { dimensions: imageDimensions, previewUrl } = useImageDimensions(pendingFile);

const getRatioStatus = () => {
  if (!imageDimensions) return null;
  const expected = EXPECTED_RATIOS[bannerType];  // 主横幅 16:9，侧边横幅 4:3
  return validateAspectRatio(imageDimensions, expected.ratio, expected.label);
};
```

#### 工具表单（tool-form.tsx）

```typescript
const { dimensions: imageDimensions, previewUrl } = useImageDimensions(pendingFile);

// 验证工具缩略图的 1:1 宽高比
const ratioResult = imageDimensions
  ? validateAspectRatio(imageDimensions, ASPECT_RATIOS['1:1'].ratio, '1:1')
  : null;
```

#### OEM 品牌表单（oem-brand-form.tsx）

```typescript
const { dimensions: logoDimensions, previewUrl } = useImageDimensions(pendingFile);

// 验证正方形 logo 和最小尺寸
const isLogoSquare = logoDimensions ? isSquare(logoDimensions) : false;
const minDimResult = logoDimensions
  ? validateMinDimensions(logoDimensions, 200, 200)
  : null;
```

---

## 22. OEM/白标系统

### 概述

Magiworld 支持面向 OEM 合作伙伴（桌面软件供应商）的白标部署。每个 OEM 品牌可以有自定义主题、品牌和受限的工具访问。

### 架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OEM 白标流程                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   桌面软件（合作伙伴 A）                                                     │
│          │                                                                   │
│          │ 打开浏览器并带上 ?software_id=PARTNER_A_2024                     │
│          ▼                                                                   │
│   ┌─────────────────────┐                                                   │
│   │   Web 应用 (3000)   │                                                   │
│   │   /api/brand/validate │◀───── 验证 software_id                          │
│   └──────────┬──────────┘                                                   │
│              │                                                               │
│              ▼                                                               │
│   ┌─────────────────────┐     ┌─────────────────────┐                       │
│   │  设置品牌 Cookie    │────▶│   oem_software_brands│                      │
│   │  (httpOnly, secure) │     │   （数据库查询）      │                      │
│   └──────────┬──────────┘     └─────────────────────┘                       │
│              │                                                               │
│              ▼                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │   定制化体验                                                          │   │
│   │   - 自定义 logo 和品牌名                                              │   │
│   │   - 主题调色板（primaryColor 等）                                     │   │
│   │   - 过滤的工具类型（allowedToolTypeIds）                              │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 数据库模式

```typescript
export const oemSoftwareBrands = pgTable('oem_software_brands', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),           // URL 友好标识符
  name: text('name').notNull(),                    // 管理显示名称
  softwareId: text('software_id').notNull().unique(), // 桌面软件的唯一 ID
  themeConfig: jsonb('theme_config'),              // { primaryColor, logo, brandName }
  allowedToolTypeIds: jsonb('allowed_tool_type_ids').$type<string[]>().default([]),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});
```

### 主题配置

```typescript
interface ThemeConfig {
  primaryColor?: string;    // 例如 '#FF5722'
  logo?: string;            // 品牌 logo URL
  brandName?: string;       // UI 中的显示名称
  palette?: 'neutral' | 'green' | 'blue' | 'purple' | 'orange';
}
```

### 品牌上下文（Web 应用）

```typescript
// lib/brand.ts
export function getCurrentBrand(): OemSoftwareBrand | null;
export function setBrandCookie(brand: OemSoftwareBrand): void;
export function clearBrandCookie(): void;
export function getCurrentBrandPalette(): string;
export function isToolTypeAllowed(toolTypeId: string): boolean;
```

### 管理后台管理

OEM 品牌通过管理应用的 `/oem-brands` 管理：
- 创建/编辑品牌配置
- 设置主题调色板和 logo
- 配置允许的工具类型（空 = 允许全部）
- 启用/禁用品牌

---

## 23. 归因追踪

### 概述

平台实现了全面的归因追踪用于营销分析：
- **首次触达归因**：用户注册时捕获的 UTM 参数
- **会话归因**：每次登录会话追踪的品牌和渠道
- **最后触达支付归因**：支付时的 UTM 和品牌

### 首次触达归因（user_attributions）

用户注册时捕获一次：

```typescript
export const userAttributions = pgTable('user_attributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id),
  utmSource: text('utm_source'),      // 例如 'google'、'facebook'
  utmMedium: text('utm_medium'),      // 例如 'cpc'、'email'、'social'
  utmCampaign: text('utm_campaign'),  // 活动名称
  utmTerm: text('utm_term'),          // 付费搜索关键词
  utmContent: text('utm_content'),    // A/B 测试变体
  referrerUrl: text('referrer_url'),  // 完整来源 URL
  landingPage: text('landing_page'),  // 首次访问页面
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### 会话归因（user_logins）

每次登录会话追踪：

```typescript
export const userLogins = pgTable('user_logins', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  brandId: uuid('brand_id').references(() => oemSoftwareBrands.id), // 如适用的 OEM 品牌
  channel: text('channel').notNull().default('web'),  // 'web' | 'desktop' | 'mobile'
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### 支付归因（payment_attributions）

支付时捕获的最后触达数据：

```typescript
export const paymentAttributions = pgTable('payment_attributions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  paymentId: text('payment_id').notNull(),  // 外部支付 ID（例如 Stripe）
  brandId: uuid('brand_id').references(() => oemSoftwareBrands.id),
  channel: text('channel').notNull().default('web'),
  utmSource: text('utm_source'),
  utmMedium: text('utm_medium'),
  utmCampaign: text('utm_campaign'),
  amount: integer('amount').notNull(),      // 金额（分）
  currency: text('currency').notNull().default('usd'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

### 分析查询

```sql
-- 按注册来源统计用户
SELECT utm_source, COUNT(*) as users
FROM user_attributions
GROUP BY utm_source;

-- 按 OEM 品牌统计收入
SELECT b.name, SUM(p.amount) as revenue
FROM payment_attributions p
LEFT JOIN oem_software_brands b ON p.brand_id = b.id
GROUP BY b.name;

-- 按渠道统计每日活跃用户
SELECT DATE(created_at), channel, COUNT(DISTINCT user_id)
FROM user_logins
GROUP BY DATE(created_at), channel;
```

---

## 24. 管理员用户管理

### 概述

管理员用户存储在与 Web 用户分离的表中，以实现安全隔离。他们可以使用 `isActive` 标志禁用而不删除。

### 数据库模式

```typescript
export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  logtoId: text('logto_id').notNull().unique(),  // Logto 用户 ID
  email: text('email').notNull(),                 // 管理员必须有邮箱
  name: text('name'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true),   // 软禁用
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
});
```

### 延迟同步模式

管理员用户在每次登录时从 Logto 同步（不通过 webhook）：

```typescript
// lib/admin-user.ts
export async function syncAdminUserFromLogto(logtoUser: LogtoUser): Promise<AdminUser> {
  const existing = await db.query.adminUsers.findFirst({
    where: eq(adminUsers.logtoId, logtoUser.sub),
  });

  if (existing) {
    // 更新资料和 lastLoginAt
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

  // 创建新管理员用户
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

### 禁用与删除

```typescript
// 禁用管理员（可恢复）
await db.update(adminUsers)
  .set({ isActive: false })
  .where(eq(adminUsers.id, userId));

// 重新启用管理员
await db.update(adminUsers)
  .set({ isActive: true })
  .where(eq(adminUsers.id, userId));
```

### 访问控制

管理应用在每次请求时检查 `isActive` 状态：

```typescript
// 中间件或布局
const adminUser = await getAdminUser();
if (!adminUser || !adminUser.isActive) {
  redirect('/login?error=access_denied');
}
```

---

## 25. 未来扩展：独立 Worker 和 Redis

### 概述

随着平台增长，您可能需要完全隔离 Web 和 Admin 工作负载。本节描述如何设置独立的 BullMQ Worker 和 Redis 实例。

### Redis 连接工厂

队列包提供了一个灵活的 Redis 连接工厂，支持：

- **多 Redis URL**：不同用途使用不同的 Redis 实例
- **连接类型**：Queue、PubSub 和 Default 连接
- **环境感知设置**：Web 和 Admin 使用不同的超时/重试策略
- **命名连接**：可重用的带标识连接

#### 环境变量

| 变量 | 描述 | 示例 |
|------|------|------|
| `REDIS_URL` | 默认 Redis URL（必需） | `rediss://redis.example.com:6379` |
| `REDIS_QUEUE_URL` | BullMQ 队列专用 Redis（可选） | `rediss://redis-queue.example.com:6379` |
| `REDIS_PUBSUB_URL` | 发布/订阅专用 Redis（可选） | `rediss://redis-pubsub.example.com:6379` |
| `REDIS_TLS` | 启用 TLS 连接 | `true` |
| `QUEUE_PREFIX` | 队列前缀（用于隔离） | `admin` |

#### 连接类型

```typescript
import {
  getRedisConnection,
  getPubSubConnection,
  createSubscriberConnection,
} from '@magiworld/queue';

// 队列连接（用于 BullMQ）
const queueRedis = getRedisConnection('queue', 'bullmq');

// PubSub 连接（用于实时更新）
const pubsubRedis = getPubSubConnection('publisher');

// 订阅者连接（每个订阅者需要独立连接）
const subscriber = createSubscriberConnection('task-updates');
```

#### 环境特定设置

连接工厂根据环境自动应用不同设置：

| 设置 | Web（生产） | Admin（内部） |
|------|-------------|---------------|
| 最大重连次数 | 20 | 10 |
| 重连基础延迟 | 100ms | 200ms |
| 重连最大延迟 | 3000ms | 5000ms |
| 连接超时 | 10000ms | 15000ms |
| 命令超时 | 5000ms | 10000ms |

#### 健康检查

```typescript
import { checkAllConnections, getConnectionStats } from '@magiworld/queue';

// 检查所有连接类型
const health = await checkAllConnections();
// { queue: true, pubsub: true, default: true }

// 获取连接统计
const stats = getConnectionStats();
// { total: 3, connections: [{ key: 'web:queue:main', status: 'ready' }, ...] }
```

### 当前架构（共享）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        当前：共享 Redis                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                     单一 Redis 实例                                  │   │
│   │  ┌──────────────────────────┐  ┌──────────────────────────┐        │   │
│   │  │ Web 队列 (default:*)     │  │ Admin 队列 (admin:*)     │        │   │
│   │  └──────────────────────────┘  └──────────────────────────┘        │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                               │
│              ┌───────────────┴───────────────┐                              │
│              ▼                               ▼                              │
│   ┌─────────────────┐                ┌─────────────────┐                   │
│   │ Web Worker      │                │ Admin Worker    │                   │
│   │ QUEUE_PREFIX="" │                │ QUEUE_PREFIX=   │                   │
│   │                 │                │ "admin"         │                   │
│   └─────────────────┘                └─────────────────┘                   │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 目标架构（隔离）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     未来：独立 Redis 实例                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌───────────────────────────┐      ┌───────────────────────────┐         │
│   │  Redis（生产）             │      │  Redis（Admin）           │         │
│   │  redis-prod.example.com   │      │  redis-admin.example.com  │         │
│   │  • 高可用                 │      │  • 较低优先级             │         │
│   │  • 自动扩展               │      │  • 成本优化               │         │
│   └─────────────┬─────────────┘      └─────────────┬─────────────┘         │
│                 │                                  │                         │
│                 ▼                                  ▼                         │
│   ┌─────────────────────────────┐  ┌─────────────────────────────┐         │
│   │ Web Worker 集群             │  │ Admin Worker                │         │
│   │ • 4-8 副本                  │  │ • 1-2 副本                  │         │
│   │ • 自动扩展                  │  │ • 固定大小                  │         │
│   │ • REDIS_URL=redis-prod      │  │ • REDIS_URL=redis-admin     │         │
│   │ • QUEUE_PREFIX=""           │  │ • QUEUE_PREFIX="admin"      │         │
│   └─────────────────────────────┘  └─────────────────────────────┘         │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 分步迁移

#### 步骤 1：部署独立 Redis 实例

**AWS ElastiCache / Redis Cloud：**

```bash
# 生产 Redis（Web 用户）
名称：magiworld-redis-prod
实例：cache.r6g.large（或更大）
多可用区：启用
加密：静态和传输中加密

# Admin Redis（内部）
名称：magiworld-redis-admin
实例：cache.t3.micro（较小，成本优化）
多可用区：可选
加密：静态和传输中加密
```

#### 步骤 2：更新环境变量

**Web 应用 (.env)：**
```bash
REDIS_URL=redis://magiworld-redis-prod.xxx.cache.amazonaws.com:6379
QUEUE_PREFIX=
```

**Admin 应用 (.env)：**
```bash
REDIS_URL=redis://magiworld-redis-admin.xxx.cache.amazonaws.com:6379
QUEUE_PREFIX=admin
```

**Web Worker（生产）：**
```bash
REDIS_URL=redis://magiworld-redis-prod.xxx.cache.amazonaws.com:6379
QUEUE_PREFIX=
DATABASE_URL=postgresql://...
```

**Admin Worker：**
```bash
REDIS_URL=redis://magiworld-redis-admin.xxx.cache.amazonaws.com:6379
QUEUE_PREFIX=admin
DATABASE_URL=postgresql://...
```

#### 步骤 3：部署独立 Worker 容器

**docker-compose.yml（生产）：**

```yaml
services:
  worker-web:
    image: magiworld-worker:latest
    environment:
      - REDIS_URL=redis://redis-prod:6379
      - QUEUE_PREFIX=
      - DATABASE_URL=${DATABASE_URL}
    deploy:
      replicas: 4
      resources:
        limits:
          cpus: '2'
          memory: 4G

  worker-admin:
    image: magiworld-worker:latest
    environment:
      - REDIS_URL=redis://redis-admin:6379
      - QUEUE_PREFIX=admin
      - DATABASE_URL=${DATABASE_URL}
    deploy:
      replicas: 1
      resources:
        limits:
          cpus: '1'
          memory: 2G
```

**Kubernetes 部署：**

```yaml
# Web Worker（高可用）
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker-web
spec:
  replicas: 4
  template:
    spec:
      containers:
        - name: worker
          image: magiworld-worker:latest
          env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: redis-secrets
                  key: prod-url
            - name: QUEUE_PREFIX
              value: ""
          resources:
            requests:
              memory: "2Gi"
              cpu: "1000m"
            limits:
              memory: "4Gi"
              cpu: "2000m"
---
# Admin Worker（成本优化）
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker-admin
spec:
  replicas: 1
  template:
    spec:
      containers:
        - name: worker
          image: magiworld-worker:latest
          env:
            - name: REDIS_URL
              valueFrom:
                secretKeyRef:
                  name: redis-secrets
                  key: admin-url
            - name: QUEUE_PREFIX
              value: "admin"
          resources:
            requests:
              memory: "1Gi"
              cpu: "500m"
            limits:
              memory: "2Gi"
              cpu: "1000m"
```

#### 步骤 4：更新 Queue 包（可选）

如果需要不同的 Redis 配置：

```typescript
// packages/queue/src/redis.ts

function getRedisConfig() {
  const url = process.env.REDIS_URL;
  const prefix = process.env.QUEUE_PREFIX || '';

  return {
    url,
    // 根据环境的不同设置
    maxRetriesPerRequest: prefix === 'admin' ? 3 : 5,
    connectTimeout: prefix === 'admin' ? 5000 : 10000,
  };
}
```

### 监控与告警

#### 需要追踪的指标

| 指标 | Web Workers | Admin Workers |
|------|-------------|---------------|
| 队列深度 | 告警阈值 > 100 | 告警阈值 > 50 |
| 处理时间 | P95 < 30秒 | P95 < 120秒 |
| 错误率 | < 1% | < 5% |
| Worker 内存 | < 80% | < 80% |

#### 推荐工具

- **BullMQ 仪表板**：使用 `bull-board` 或 `arena` 进行队列可视化
- **Redis 监控**：AWS CloudWatch、Redis Cloud 仪表板
- **APM**：Datadog、New Relic 或 Grafana 用于 Worker 指标

### 成本优化建议

1. **合理调整 Redis 实例大小**：Admin Redis 可以更小，因为流量较少
2. **使用竞价实例**：Admin Workers 可以使用竞价/抢占式实例
3. **缩容到零**：Admin Workers 可以在非工作时间缩容到 0
4. **预留容量**：Web Redis 应使用预留实例以节省成本

---

## 文档历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2024-12-31 | 初始设计规范 |
| 2.0 | 2024-12-31 | 用自定义管理应用替换 Payload CMS |
| 3.0 | 2025-01-02 | 添加主题系统（next-themes）、Logto 认证、个人资料页 |
| 3.1 | 2025-01-04 | 添加工具注册表模式用于 Web 和管理应用之间的 slug 验证 |
| 4.0 | 2025-01-06 | 添加 AI SDK 集成、CloudFront 签名 URL、Magi AI 助手 |
| 5.0 | 2025-01-12 | 添加 Web 应用工具部分、3D 水晶工具文档 |
| 5.1 | 2025-01-12 | 更新文件存储策略为四桶架构 |
| 5.2 | 2025-01-14 | 添加共享工具函数部分（上传配置、图像尺寸工具函数） |
| 6.0 | 2025-01-14 | 重大更新：更新数据库模式新增表（users、admin_users、oem_software_brands、归因表），添加 OEM/白标系统、归因追踪、管理员用户管理部分，更新环境变量文档，扩展 AI 工具文档（Fal.ai 集成），添加背景移除工具文档 |
| 6.1 | 2025-01-16 | 更新 S3 桶结构，所有路径包含 userId/adminId 用于 GDPR 合规、按用户存储管理和归因追踪 |
| 7.0 | 2025-01-16 | 重大更新：用 BullMQ + Redis 替换 Inngest 进行任务处理，添加供应商管理部分，更新数据库模式新增 providers/dead_letter_tasks/task_usage_logs 表，完整的任务编排器架构文档 |
| 7.1 | 2025-01-18 | 从 Vercel AI SDK 迁移到原生提供商 SDK（openai、@google/genai、@fal-ai/client），添加共享 AI 工具库（@magiworld/utils/ai），更新 AI 提供商集成部分 |
| 8.0 | 2025-01-18 | 添加队列隔离（Web 与 Admin）、任务优先级系统、Admin 供应商成本隔离、Magi 基于任务的工具、未来扩展部分（独立 Worker/Redis） |
| 8.1 | 2025-01-18 | 重构 Redis 连接工厂，支持多 URL（REDIS_URL、REDIS_QUEUE_URL、REDIS_PUBSUB_URL）、环境感知设置、连接类型和健康检查 |
