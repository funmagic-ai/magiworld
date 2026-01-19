## 步骤 14：测试配置

### 14.1 测试管理员媒体库上传

```bash
# Start admin app
pnpm dev:admin
```

1. 进入 `http://localhost:3001/library`
2. 创建文件夹并上传图片
3. 检查 AWS 控制台 → S3 → `funmagic-admin-users-assets` → 验证文件存在

### 14.2 测试公开横幅上传

1. 进入管理员 → 横幅 → 添加横幅
2. 上传横幅图片
3. 检查 AWS 控制台 → S3 → `funmagic-web-public-assets/banners/main/` → 验证文件存在
4. 测试公开 URL：`https://cdn.funmagic.ai/banners/main/your-file.jpg`

### 14.3 测试 Web 用户上传

```bash
# Start web app
pnpm dev:web
```

1. 登录 Web 应用
2. 使用工具（例如背景移除）上传图片
3. 检查 AWS 控制台 → S3 → `funmagic-web-users-assets-private` → 验证文件存在

### 14.4 测试任务队列（Worker）

```bash
# Start worker
pnpm dev:worker
```

1. 通过 Web 应用提交任务（例如背景移除）
2. 检查 Redis 中的队列任务：`redis-cli KEYS "bull:*"`
3. 查看 Worker 日志了解任务处理情况
4. 验证任务结果上传到 S3 `funmagic-web-users-assets-private`
5. 通过 SSE 实时检查任务状态更新

### 14.5 测试签名 URL

没有签名的私有存储桶 URL 应返回 **403 Forbidden**：
```
https://d1234admin.cloudfront.net/path/to/file.jpg  → 403 Forbidden
```

签名 URL 应可正常工作：
```
https://d1234admin.cloudfront.net/path/to/file.jpg?Expires=...&Signature=...&Key-Pair-Id=...  → 200 OK
```

### 14.6 测试 EC2 部署

```bash
# SSH into your server
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP
cd ~/funmagic

# Check running containers
docker-compose ps

# View logs
docker-compose logs -f web
docker-compose logs -f admin

# Test from browser
# https://funmagic.ai - 应显示 Web 应用
# https://admin.funmagic.ai - 应显示管理员应用
```

---

## 快速检查清单

| 步骤 | 任务 | 状态 |
|------|------|------|
| 1.1 | 创建 `funmagic-admin-users-assets` 存储桶（私有） | ⬜ |
| 1.2 | 创建 `funmagic-web-public-assets` 存储桶（公开） | ⬜ |
| 1.3 | 创建 `funmagic-web-users-assets-private` 存储桶（私有） | ⬜ |
| 1.4 | 创建 `funmagic-web-users-assets-shared` 存储桶（公开） | ⬜ |
| 2.1 | 为 `funmagic-web-public-assets` 添加公开存储桶策略 | ⬜ |
| 2.2 | 为 `funmagic-web-users-assets-shared` 添加公开存储桶策略 | ⬜ |
| 3 | 在所有 4 个存储桶上配置 CORS | ⬜ |
| 4.1 | 创建 `funmagic-admin-s3-policy` IAM 策略 | ⬜ |
| 4.2 | 创建 `funmagic-admin-app` IAM 用户 | ⬜ |
| 4.3 | 为管理员用户创建访问密钥 | ⬜ |
| 4.4 | 创建 `funmagic-web-s3-policy` IAM 策略 | ⬜ |
| 4.5 | 创建 `funmagic-web-app` IAM 用户 + 访问密钥 | ⬜ |
| 4.6 | 删除 root 用户访问密钥（如适用） | ⬜ |
| 5.1 | 为 `funmagic-admin-users-assets` 创建 CloudFront（带 OAC） | ⬜ |
| 5.2 | 为 `funmagic-web-public-assets` 创建 CloudFront（公开） | ⬜ |
| 5.3 | 为 `funmagic-web-users-assets-private` 创建 CloudFront（带 OAC） | ⬜ |
| 5.4 | 为 `funmagic-web-users-assets-shared` 创建 CloudFront（公开） | ⬜ |
| 6.1 | 为签名 URL 创建 CloudFront 密钥对 | ⬜ |
| 6.2 | 为签名 URL 创建密钥组 | ⬜ |
| 6.3 | 配置私有分发以要求签名 URL | ⬜ |
| 6.4 | 将私钥添加到 `.env.local` | ⬜ |
| 7 | 设置生命周期策略 | ⬜ |
| 8.1a | 将域名添加到 Cloudflare | ⬜ |
| 8.1b | 在 GoDaddy 中更新域名服务器 | ⬜ |
| 8.1c | 验证域名服务器已传播 | ⬜ |
| 8.2 | 配置 Google Workspace 邮件记录（MX、SPF、DKIM） | ⬜ |
| 8.3 | 为 CloudFront 分发配置 DNS | ⬜ |
| 8.4 | 为 EC2 配置 DNS | ⬜ |
| 9.1 | 创建 EC2 安全组 | ⬜ |
| 9.2 | 启动 EC2 实例 | ⬜ |
| 9.3 | 分配弹性 IP | ⬜ |
| 9.4 | 在 EC2 上安装 Docker | ⬜ |
| 9.5 | 创建 Docker Compose 和 Dockerfile | ⬜ |
| 9.6 | 设置 SSL（Cloudflare 源证书或 Let's Encrypt） | ⬜ |
| 9.7 | 更新 Cloudflare DNS 到 EC2 IP | ⬜ |
| 10.1 | 创建 RDS 安全组（`funmagic-rds-sg`） | ⬜ |
| 10.2 | 创建 RDS PostgreSQL 实例（`funmagic-db`） | ⬜ |
| 10.3 | 获取 RDS 端点并构建连接字符串 | ⬜ |
| 10.4 | 测试数据库连接 | ⬜ |
| 10.5 | 运行 Drizzle 迁移初始化架构（`pnpm db:push`） | ⬜ |
| 11.1 | 创建 Redis 安全组（`funmagic-redis-sg`） | ⬜ |
| 11.2 | 创建 ElastiCache 子网组 | ⬜ |
| 11.3 | 创建 ElastiCache Redis 集群（`funmagic-redis`） | ⬜ |
| 11.4 | 获取 Redis 端点并构建连接字符串 | ⬜ |
| 11.5 | 测试 Redis 连接 | ⬜ |
| 12 | 为 web、admin 和 worker 配置 `.env.local` 文件 | ⬜ |
| 13.1 | 为私有仓库设置 Git 访问（SSH 部署密钥） | ⬜ |
| 13.2 | 将仓库克隆到 EC2 | ⬜ |
| 13.3 | 创建生产环境变量文件（.env.web、.env.admin、.env.worker） | ⬜ |
| 13.4 | 构建并启动 Docker 容器（web、admin、worker） | ⬜ |
| 13.5 | 验证所有容器正在运行 | ⬜ |
| 14.1 | 测试管理员媒体库上传 | ⬜ |
| 14.2 | 测试公开横幅上传 | ⬜ |
| 14.3 | 测试 Web 用户上传 | ⬜ |
| 14.4 | 测试任务队列（Worker 处理任务） | ⬜ |
| 14.5 | 测试签名 URL 正常工作 | ⬜ |
| 14.6 | 通过 HTTPS 测试生产环境部署 | ⬜ |

---

