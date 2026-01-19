## Step 13: Deploy Code and Run

Now that RDS, Redis, and environment variables are configured, you can deploy your code.

### 13.1 Set Up Git Access for Private Repository

If your repository is private, you need to configure authentication on the EC2 instance.

#### Option A: SSH Deploy Key (Recommended for Production)

Deploy keys are repository-specific and more secure than personal keys.

**Step 1: Generate SSH key on EC2**
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ec2-user@YOUR_ELASTIC_IP

# Generate a new SSH key (no passphrase for automation)
ssh-keygen -t ed25519 -C "deploy@funmagic-ec2" -f ~/.ssh/github_deploy -N ""

# Display the public key
cat ~/.ssh/github_deploy.pub
```

**Step 2: Add deploy key to GitHub**
1. Go to your GitHub repo → **Settings** → **Deploy keys** → **Add deploy key**
2. Title: `funmagic-ec2-deploy`
3. Key: Paste the public key from above
4. ✅ Check "Allow write access" (if you need to push from server)
5. Click **Add key**

**Step 3: Configure SSH to use the deploy key**
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

#### Option B: Personal Access Token (Quick Setup)

Use this for quick testing or small teams.

**Step 1: Create a Personal Access Token**
1. Go to GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)**
2. Click **Generate new token (classic)**
3. Note: `funmagic-ec2-deploy`
4. Expiration: 90 days (or custom)
5. Scopes: ✅ `repo` (full control of private repositories)
6. Click **Generate token** and copy it immediately!

**Step 2: Clone using the token**
```bash
# Clone with token embedded in URL
git clone https://YOUR_TOKEN@github.com/your-org/magiworld.git ~/funmagic

# Or configure git credential helper to store it
git config --global credential.helper store
git clone https://github.com/your-org/magiworld.git ~/funmagic
# Enter username: your-github-username
# Enter password: YOUR_TOKEN (not your password!)
```

> **Security Note**: Tokens stored in `.git-credentials` are in plain text. For production, prefer SSH deploy keys.

#### Option C: Upload Without Git (rsync)

If you don't want to use Git on the server:

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

### 13.2 Clone Repository and Prepare Files

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

### 13.3 Create Environment Files

Create the production environment files on the server:

```bash
cd ~/funmagic

# Create .env.web (copy from your local .env.local and update values)
nano .env.web

# Create .env.admin (copy from your local .env.local and update values)
nano .env.admin

# Create .env.worker (copy from your local .env.local and update values)
nano .env.worker
```

**Important**: Update these values for production:
- `DATABASE_URL` → Your RDS endpoint
- `REDIS_URL` → Your ElastiCache Redis endpoint (use `rediss://` for TLS)
- `LOGTO_BASE_URL` → `https://funmagic.ai` or `https://admin.funmagic.ai`
- AI API keys (FAL_API_KEY, OPENAI_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY)
- All other secrets should match your production configuration

### 13.4 Build and Start Containers

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

### 13.5 Verify Deployment

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

### 13.6 Useful Docker Commands

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

### 13.7 Deploy Updates

When you push new code to your repository:

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

**Zero-downtime deployment tip**: Build new images before stopping:
```bash
# Build new images first (doesn't affect running containers)
docker-compose build

# Then quickly swap to new images
docker-compose up -d
```

---

