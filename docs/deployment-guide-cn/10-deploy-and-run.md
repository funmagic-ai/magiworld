## 步骤 13：部署代码并运行

现在 RDS、Redis 和环境变量已配置完成，您可以部署代码了。

### 13.1 为私有仓库设置 Git 访问

如果您的仓库是私有的，需要在 EC2 实例上配置身份验证。

#### 选项 A：SSH 部署密钥（推荐用于生产环境）

部署密钥是仓库特定的，比个人密钥更安全。

**第 1 步：在 EC2 上生成 SSH 密钥**
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP

# Generate a new SSH key (no passphrase for automation)
ssh-keygen -t ed25519 -C "deploy@funmagic-ec2" -f ~/.ssh/github_deploy -N ""

# Display the public key
cat ~/.ssh/github_deploy.pub
```

**第 2 步：将部署密钥添加到 GitHub**
1. 进入您的 GitHub 仓库 → **Settings** → **Deploy keys** → **Add deploy key**
2. 标题：`funmagic-ec2-deploy`
3. 密钥：粘贴上面的公钥
4. ✅ 勾选"Allow write access"（如果需要从服务器推送）
5. 点击 **Add key**

**第 3 步：配置 SSH 以使用部署密钥**
```bash
# Create or edit SSH config
cat >> ~/.ssh/config << 'EOF'
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_deploy
  IdentitiesOnly yes
EOF

# Set correct permissions
chmod 600 ~/.ssh/config
chmod 600 ~/.ssh/github_deploy

# Test the connection
ssh -T git@github.com
# Should see: "Hi your-org/magiworld! You've successfully authenticated..."
```

#### 选项 B：个人访问令牌（快速设置）

用于快速测试或小团队。

**第 1 步：创建个人访问令牌**
1. 进入 GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. 点击 **Generate new token (classic)**
3. 备注：`funmagic-ec2-deploy`
4. 过期时间：90 天（或自定义）
5. 权限范围：✅ `repo`（私有仓库的完全控制权）
6. 点击 **Generate token** 并立即复制！

**第 2 步：使用令牌克隆**
```bash
# Clone with token embedded in URL
git clone https://YOUR_TOKEN@github.com/your-org/magiworld.git ~/funmagic

# Or configure git credential helper to store it
git config --global credential.helper store
git clone https://github.com/your-org/magiworld.git ~/funmagic
# Enter username: your-github-username
# Enter password: YOUR_TOKEN (not your password!)
```

> **安全说明**：存储在 `.git-credentials` 中的令牌是明文的。生产环境请优先使用 SSH 部署密钥。

#### 选项 C：不使用 Git 上传（rsync）

如果您不想在服务器上使用 Git：

```bash
# From your LOCAL machine, sync code to EC2
cd /path/to/magiworld

rsync -avz --progress \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='*.log' \
  -e "ssh -i your-key.pem" \
  . ec2-user@YOUR_ELASTIC_IP:~/funmagic/
```

### 13.2 克隆仓库并准备文件

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP

# Clone repository (adjust URL based on your auth method)
# For SSH:
git clone git@github.com:funmagic-ai/magiworld.git ~/funmagic

# For HTTPS with token:
# git clone https://github.com/your-org/magiworld.git ~/funmagic

cd ~/funmagic

# Verify the files are there
ls -la
```

### 13.3 创建环境变量文件

在服务器上创建生产环境变量文件：

```bash
cd ~/funmagic

# Create .env.web (copy from your local .env.local and update values)
nano .env.web

# Create .env.admin (copy from your local .env.local and update values)
nano .env.admin

# Create .env.worker (copy from your local .env.local and update values)
nano .env.worker
```

**重要提示**：为生产环境更新以下值：
- `DATABASE_URL` → 您的 RDS 端点
- `REDIS_URL` → 您的 ElastiCache Redis 端点（TLS 使用 `rediss://`）
- `LOGTO_BASE_URL` → `https://funmagic.ai` 或 `https://admin.funmagic.ai`
- AI API 密钥（FAL_API_KEY、OPENAI_API_KEY、GOOGLE_GENERATIVE_AI_API_KEY）
- 所有其他密钥应与您的生产环境配置匹配

### 13.4 构建并启动容器

```bash
cd ~/funmagic

# Build and start all services in detached mode
docker-compose up -d --build

# This will:
# 1. Build web image from Dockerfile.web
# 2. Build admin image from Dockerfile.admin
# 3. Build worker image from Dockerfile.worker
# 4. Pull nginx:alpine image
# 5. Start all 4 containers

# Watch the build progress
docker-compose logs -f

# Press Ctrl+C to exit logs (containers keep running)
```

### 13.5 验证部署

```bash
# Check all containers are running
docker-compose ps

# Should show:
# NAME              STATUS
# funmagic-web      Up
# funmagic-admin    Up
# funmagic-worker   Up
# funmagic-nginx    Up

# Check individual service logs
docker-compose logs web      # Next.js web app
docker-compose logs admin    # Next.js admin app
docker-compose logs worker   # BullMQ task worker
docker-compose logs nginx    # Nginx reverse proxy

# Test locally on EC2
curl -I http://localhost:3000   # Web app
curl -I http://localhost:3001   # Admin app
```

### 13.6 常用 Docker 命令

```bash
# View running containers
docker-compose ps

# View real-time logs
docker-compose logs -f web
docker-compose logs -f worker
docker-compose logs -f admin
docker-compose logs -f nginx

# Restart a specific service
docker-compose restart web
docker-compose restart admin

# Rebuild and restart (after code changes)
docker-compose up -d --build

# Stop all services
docker-compose stop

# Stop and remove containers
docker-compose down

# Clean up unused images (reclaim disk space)
docker system prune -a
```

### 13.7 部署更新

当您向仓库推送新代码时：

```bash
# SSH into server
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP
cd ~/funmagic

# Pull latest code
git pull origin main

# Rebuild and restart containers
docker-compose up -d --build

# Watch logs for any errors
docker-compose logs -f
```

**零停机部署技巧**：在停止之前先构建新镜像：
```bash
# Build new images first (doesn't affect running containers)
docker-compose build

# Then quickly swap to new images
docker-compose up -d
```

---

