## 步骤 10：设置 AWS RDS PostgreSQL

AWS RDS 提供托管的 PostgreSQL 数据库，具有自动备份、更新和高可用性。

### 10.1 创建数据库安全组

1. 进入 **EC2** → **Security Groups** → **Create security group**
2. **名称**：`funmagic-rds-sg`
3. **描述**：Funmagic RDS 实例的安全组
4. **VPC**：默认 VPC（与您的 EC2 实例相同）
5. **入站规则**：

| 类型 | 端口 | 来源 | 描述 |
|------|------|------|------|
| PostgreSQL | 5432 | `funmagic-ec2-sg` | 允许 EC2 连接 |
| PostgreSQL | 5432 | 您的 IP | 允许本地开发（可选） |

> **注意**：对于本地开发访问，添加您的家庭/办公室 IP。为了安全，在生产环境中删除此规则。

6. **出站规则**：保持默认（允许所有流量）
7. 点击 **Create security group**

### 10.2 创建 RDS PostgreSQL 实例

1. 进入 **RDS** → **Create database**
2. **引擎选项**：
   - **引擎类型**：PostgreSQL
   - **版本**：PostgreSQL 16.x（或最新稳定版）
3. **模板**：选择 **Free tier**（用于测试）或 **Production**
4. **设置**：
   - **数据库实例标识符**：`funmagic-db`
   - **主用户名**：`postgres`（或您偏好的用户名）
   - **主密码**：生成强密码并**安全保存**
5. **实例配置**：
   - **免费套餐**：`db.t3.micro`（1 vCPU，1GB RAM）
   - **生产环境**：`db.t3.small` 或 `db.t3.medium`
6. **存储**：
   - **存储类型**：gp3
   - **分配的存储**：20 GB（最小）
   - **启用存储自动扩展**：✅ 选中
   - **最大存储阈值**：100 GB
7. **连接**：
   - **VPC**：默认 VPC
   - **公开访问**：**否**（为了安全）或 **是**（用于本地开发访问）
   - **VPC 安全组**：选择 `funmagic-rds-sg`
   - **可用区**：无偏好
8. **数据库身份验证**：密码身份验证
9. **其他配置**：
   - **初始数据库名称**：`funmagic`
   - **启用自动备份**：✅ 是
   - **备份保留期**：7 天
   - **启用删除保护**：✅ 是（用于生产环境）
10. 点击 **Create database**

> **等待 5-10 分钟**，数据库创建完成并变为"Available"状态。

### 10.3 获取连接端点

1. 进入 **RDS** → **Databases** → 点击 `funmagic-db`
2. 在"Connectivity & security"部分找到 **Endpoint**
   - 示例：`funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com`
3. 记录 **端口**：`5432`（默认）

### 10.4 构建连接字符串

您的 `DATABASE_URL` 遵循以下格式：

```
postgresql://USERNAME:PASSWORD@ENDPOINT:PORT/DATABASE
```
**注意：如果连接 AWS 数据库时遇到身份验证错误，请使用 "postgresql://USERNAME:PASSWORD@ENDPOINT:PORT/DATABASE?sslmode=no-verify"**

**示例**：
```
postgresql://postgres:YourSecurePassword123@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic
```

### 10.5 测试连接

**从您的本地机器**（如果启用了公开访问）：

```bash
# Install psql if not installed
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql-client

# Test connection
psql "postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic"

# If connected successfully, you'll see:
# funmagic=>
```

**从 EC2**（设置 EC2 后）：

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Install psql
sudo dnf install postgresql15 -y  # Amazon Linux 2023
# sudo apt install postgresql-client -y  # Ubuntu

# Test connection
psql "postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic"
```

### 10.6 初始化数据库架构

此项目使用 **Drizzle ORM** 进行数据库管理。

**选项 A：从本地机器运行 Drizzle 迁移**

如果在 RDS 上启用了公开访问：

```bash
# Set the DATABASE_URL in your .env.local (in packages/db directory)
DATABASE_URL=postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic

# Navigate to db package
cd packages/db

# Option 1: Push schema directly (recommended for initial setup)
pnpm db:push

# Option 2: Run migrations (if you have generated migration files)
pnpm db:migrate
```

**选项 B：从 EC2 运行 Drizzle 迁移**

如果 RDS 没有公开访问：

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Clone your repo or copy the packages/db folder
cd ~/funmagic

# Install Node.js if not installed
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install nodejs -y

# Install pnpm
npm install -g pnpm

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic"

# Install dependencies and run migrations
cd packages/db
pnpm install
pnpm db:push
```

**可用的 Drizzle 命令：**

| 命令 | 描述 |
|------|------|
| `pnpm db:push` | 直接将架构推送到数据库（推荐用于开发/初始设置） |
| `pnpm db:generate` | 从架构更改生成迁移文件 |
| `pnpm db:migrate` | 应用生成的迁移文件 |
| `pnpm db:studio` | 打开 Drizzle Studio 浏览数据库 |

### 10.7 更新环境变量

使用 RDS 连接字符串更新您的 `.env.local` 文件：

**本地开发**（`apps/web/.env.local` 和 `apps/admin/.env.local`）：

```bash
# For local dev with public RDS access
DATABASE_URL=postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic

# OR keep using local PostgreSQL for development
DATABASE_URL=postgresql://postgres:password@localhost:5432/funmagic
```

**生产环境**（EC2 上的 `.env.web` 和 `.env.admin`）：

```bash
DATABASE_URL=postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic
```

### 10.8 成本估算

| 实例类型 | vCPU | RAM | 月费用 |
|----------|------|-----|--------|
| db.t3.micro | 2 | 1 GB | 约 $13/月（免费套餐资格） |
| db.t3.small | 2 | 2 GB | 约 $26/月 |
| db.t3.medium | 2 | 4 GB | 约 $52/月 |

**额外费用**：
- 存储：约 $0.115/GB/月（gp3）
- 备份存储：免费（不超过数据库大小），之后约 $0.095/GB/月
- 数据传输：同区域内 EC2 ↔ RDS 免费

**推荐起步配置**：
- **开发/测试**：`db.t3.micro`（免费套餐）- 约 $13/月
- **生产环境**：`db.t3.small` + Multi-AZ - 约 $52/月

### 10.9 生产环境最佳实践

1. **启用 Multi-AZ** 以实现高可用性（成本翻倍但提供故障转移）
2. **启用静态加密**（免费，只需勾选）
3. **启用删除保护** 以防止意外删除
4. **设置 CloudWatch 告警** 监控 CPU、存储和连接数
5. **使用强唯一密码**（考虑使用 AWS Secrets Manager）
6. **禁用公开访问** 仅允许 EC2 安全组
7. **启用 Performance Insights** 进行查询分析
8. **安排维护窗口** 在低流量时段

---

