## 故障排除

### 上传时"Access Denied"

1. 验证 IAM 策略已附加到用户
2. 检查策略和 `.env.local` 中的存储桶名称是否匹配
3. 验证访问密钥 ID 和密钥是否正确
4. **如果使用 root 凭证**：改为创建 IAM 用户（步骤 4）

### 浏览器中的 CORS 错误

1. 验证所有存储桶都已配置 CORS
2. 检查 `AllowedOrigins` 是否包含您的域名
3. 清除浏览器缓存并重试

### CloudFront 未提供更新的文件

1. 文件使用带缓存破坏的文件名（名称中包含时间戳）
2. 如需要，创建失效：CloudFront → Distribution → Invalidations → Create → Path: `/*`

### 签名 URL 返回 403

1. 验证密钥组已附加到分发行为
2. 检查分发状态是否为"Deployed"
3. 验证 `CLOUDFRONT_KEY_PAIR_ID` 与 AWS 中的密钥 ID 匹配
4. 检查私钥格式（换行符转义为 `\n`）

### 文件未出现在 S3 中

1. 检查浏览器控制台是否有上传错误
2. 验证 AWS 凭证已在 `.env.local` 中设置
3. 更改环境变量后重启开发服务器

### Cloudflare SSL 错误

1. 确保 SSL/TLS 模式设置为"Full (strict)"
2. 验证 ACM 证书已验证
3. 检查 CloudFront 已附加证书

### Cloudflare 域名服务器未传播（GoDaddy）

1. **在 GoDaddy 中验证域名服务器**：
   - 进入 GoDaddy → My Products → DNS → Nameservers
   - 确认显示的是 Cloudflare 域名服务器（而非 GoDaddy 默认值）

2. **检查 DNSSEC**：
   - 如果在 GoDaddy 中启用了 DNSSEC，它会阻止域名服务器更改
   - 在 GoDaddy 中禁用 DNSSEC → 等待 24-48 小时 → 然后更改域名服务器

3. **检查传播状态**：
   - 使用 [whatsmydns.net](https://www.whatsmydns.net/) 检查 NS 记录传播
   - 输入您的域名并选择"NS"记录类型

4. **等待更长时间**：
   - 在某些情况下，传播可能需要长达 48 小时
   - 大多数在 1-6 小时内完成

5. **在 Cloudflare 中强制重新检查**：
   - 进入 Cloudflare 控制面板 → 您的域名 → Overview
   - 点击"Check nameservers"强制重新检查

### 域名仍指向旧主机

1. 清除本地 DNS 缓存：
   ```bash
   # macOS
   sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder

   # Windows
   ipconfig /flushdns
   ```

2. 尝试从不同网络访问（移动数据）

3. 检查 `/etc/hosts` 中是否有 DNS 覆盖

### Cloudflare 迁移后邮件停止工作

1. **检查 Cloudflare 中是否存在 MX 记录**：
   - 进入 Cloudflare → DNS → Records
   - 查找指向 Google 服务器的 MX 记录
   - 如果缺失，添加它们（参见步骤 8.2）

2. **验证 MX 记录已传播**：
   - 使用 [MXToolbox](https://mxtoolbox.com/SuperTool.aspx?action=mx:funmagic.ai)
   - 应显示 Google 的邮件服务器

3. **检查 SPF 记录**：
   - 查找包含 `v=spf1 include:_spf.google.com ~all` 的 TXT 记录
   - 缺少 SPF = 邮件可能进入垃圾邮件

4. **测试邮件投递**：
   - 从外部账户（个人 Gmail、Yahoo 等）发送测试邮件
   - 检查垃圾邮件文件夹
   - 从您的域名发送邮件以验证发送功能

5. **常见错误**：
   - MX 记录名称应为 `@` 而非 `funmagic.ai`
   - MX 记录无法代理（必须为灰色云图标 / 仅 DNS）
   - 优先级数字很重要（1 是最高优先级）

### 迁移后邮件进入垃圾邮件

1. 验证 SPF 记录存在：`v=spf1 include:_spf.google.com ~all`
2. 在 Google 管理控制台中设置 DKIM 并添加 TXT 记录
3. 添加 DMARC 记录：`v=DMARC1; p=none; rua=mailto:admin@funmagic.ai`
4. 等待 24-48 小时 DNS 传播

### EC2 上 Docker 容器无法启动

1. 检查容器日志：`docker-compose logs -f web`
2. 验证环境变量文件存在：`.env.web` 和 `.env.admin`
3. 检查 Docker 是否运行：`sudo systemctl status docker`
4. 验证端口未被占用：`sudo lsof -i :3000` 和 `sudo lsof -i :3001`

### Nginx 返回 502 Bad Gateway

1. 检查应用容器是否运行：`docker-compose ps`
2. 验证容器是否健康：`docker-compose logs web`
3. 检查 nginx 能否访问容器：`docker exec funmagic-nginx ping web`
4. 重启服务：`docker-compose restart`

### 无法 SSH 到 EC2

1. 验证安全组已为您的 IP 开放端口 22
2. 检查您使用的密钥文件是否正确：`ssh -i your-key.pem ec2-user@IP`
3. 验证弹性 IP 已关联到实例
4. 在 EC2 控制台检查实例是否运行

### 无法从 EC2 连接到 RDS

1. **验证安全组**：
   - `funmagic-rds-sg` 必须允许来自 `funmagic-ec2-sg` 的端口 5432
   - 检查两个安全组是否在同一 VPC 中

2. **检查 RDS 端点**：
   - 进入 RDS → Databases → `funmagic-db`
   - 复制正确的端点（而非实例 ID）

3. **测试连接**：
   ```bash
   # From EC2
   psql "postgresql://postgres:YourPassword@your-endpoint:5432/funmagic"
   ```

4. **检查 RDS 状态**：
   - RDS 必须处于"Available"状态
   - 检查是否有待处理的修改或维护

5. **验证 DATABASE_URL 格式**：
   ```
   postgresql://USERNAME:PASSWORD@ENDPOINT:5432/DATABASE
   ```
   - 密码中的特殊字符必须进行 URL 编码

### 无法从本地机器连接到 RDS

1. **在 RDS 上启用公开访问**（如需要用于开发）：
   - RDS → Databases → `funmagic-db` → Modify
   - 将"Public access"设置为 Yes
   - 立即应用

2. **将您的 IP 添加到安全组**：
   - EC2 → Security Groups → `funmagic-rds-sg`
   - 添加入站规则：PostgreSQL，5432，您的 IP

3. **检查 RDS 是否在公共子网中**：
   - RDS 需要在具有互联网网关路由的子网中

### Drizzle 迁移失败

1. **连接超时**：
   - 检查 DATABASE_URL 是否正确
   - 验证安全组允许连接
   - 确保 RDS 实例处于"Available"状态

2. **权限被拒绝**：
   - 确保您使用的是主用户凭证
   - 检查数据库名称是否存在

3. **手动运行迁移**：
   ```bash
   cd packages/db
   pnpm db:push
   ```

4. **使用 Drizzle Studio 查看数据库**：
   ```bash
   cd packages/db
   pnpm db:studio
   ```

### 无法从 EC2 连接到 Redis

1. **验证安全组**：
   - `funmagic-redis-sg` 必须允许来自 `funmagic-ec2-sg` 的端口 6379
   - 检查两个安全组是否在同一 VPC 中

2. **检查 ElastiCache 端点**：
   - 进入 ElastiCache → Redis caches → `funmagic-redis`
   - 复制主端点（而非集群 ID）

3. **测试连接**：
   ```bash
   # From EC2 (without TLS)
   redis-cli -h funmagic-redis.abc123.use2.cache.amazonaws.com -p 6379 ping

   # With TLS
   redis-cli -h funmagic-redis.abc123.use2.cache.amazonaws.com -p 6379 --tls ping
   ```

4. **检查 REDIS_URL 格式**：
   - 无 TLS：`redis://ENDPOINT:6379`
   - 有 TLS：`rediss://ENDPOINT:6379`（注意双 's'）

5. **验证 ElastiCache 状态**：
   - 集群必须处于"Available"状态
   - 检查是否有待处理的修改

### Worker 未处理任务

1. **检查 Worker 容器是否运行**：
   ```bash
   docker-compose ps worker
   docker-compose logs -f worker
   ```

2. **验证 Redis 连接**：
   - 检查 REDIS_URL 环境变量是否已设置
   - 从 Worker 容器测试 Redis 连接

3. **检查队列中的任务**：
   ```bash
   # From EC2 or container with redis-cli
   redis-cli -h YOUR_REDIS_HOST KEYS "bull:*"
   redis-cli -h YOUR_REDIS_HOST LLEN "bull:default:wait"
   ```

4. **检查 AI 提供商 API 密钥**：
   - 验证 FAL_API_KEY、OPENAI_API_KEY、GOOGLE_GENERATIVE_AI_API_KEY 已设置
   - 检查数据库中的提供商凭证是否有效

5. **查看死信队列**：
   - 检查 `dead_letter_tasks` 表中的失败任务
   - 管理员面板 → System → Dead Letters

### 任务卡在 pending/processing 状态

1. **检查 Worker 日志**：
   ```bash
   docker-compose logs -f worker
   ```

2. **在 Redis 中验证任务**：
   ```bash
   redis-cli -h YOUR_REDIS_HOST LRANGE "bull:default:active" 0 -1
   ```

3. **检查熔断器状态**：
   - 提供商可能在多次失败后处于"open"状态
   - 检查 `providers` 表的 `circuitState` 列
   - 等待 30 秒进入半开状态

4. **强制重试**：
   - 检查任务的死信队列
   - 使用管理员面板重新处理失败的任务

---

## 安全最佳实践

1. **永远不要在应用程序中使用 root 凭证** - 创建 IAM 用户
2. **永远不要将 AWS 凭证提交到 git**
3. **为每个应用使用单独的 IAM 用户**（admin vs web）
4. **将存储桶策略限制为**最小所需权限
5. **为重要存储桶启用 S3 版本控制**（可选）
6. **设置 CloudTrail** 进行审计日志（生产环境）
7. **定期轮换访问密钥**
8. **使用 Secrets Manager** 存储生产环境凭证
9. **在 AWS root 账户和 IAM 用户上启用 MFA**
10. **为 admin 和 web 签名 URL 使用不同的密钥对**（可选，额外安全）

---

## 域名结构摘要

| 域名 | 服务 | 备注 |
|------|------|------|
| `funmagic.ai` | EC2（Web 应用） | 面向用户的主站点 |
| `www.funmagic.ai` | EC2（Web 应用） | 重定向或别名 |
| `admin.funmagic.ai` | EC2（管理员应用） | 内部管理员面板 |
| `cdn.funmagic.ai` | CloudFront（funmagic-web-public-assets） | 公开静态资源 |
| `shared.funmagic.ai` | CloudFront（funmagic-web-users-assets-shared） | 用户共享文件 |
| *(CF 域名)* | CloudFront（funmagic-admin-users-assets） | 私有，无自定义域名 |
| *(CF 域名)* | CloudFront（funmagic-web-users-assets-private） | 私有，无自定义域名 |
