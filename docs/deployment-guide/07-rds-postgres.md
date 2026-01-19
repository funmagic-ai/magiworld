## Step 10: Set Up AWS RDS PostgreSQL

AWS RDS provides a managed PostgreSQL database with automatic backups, updates, and high availability.

### 10.1 Create a Database Security Group

1. Go to **EC2** → **Security Groups** → **Create security group**
2. **Name**: `funmagic-rds-sg`
3. **Description**: Security group for Funmagic RDS instance
4. **VPC**: Default VPC (same as your EC2 instance)
5. **Inbound rules**:

| Type | Port | Source | Description |
|------|------|--------|-------------|
| PostgreSQL | 5432 | `funmagic-ec2-sg` | Allow EC2 to connect |
| PostgreSQL | 5432 | Your IP | Allow local development (optional) |

> **Note**: For local development access, add your home/office IP. Remove this rule in production for security.

6. **Outbound rules**: Keep default (all traffic allowed)
7. Click **Create security group**

### 10.2 Create RDS PostgreSQL Instance

1. Go to **RDS** → **Create database**
2. **Engine options**:
   - **Engine type**: PostgreSQL
   - **Version**: PostgreSQL 16.x (or latest stable)
3. **Templates**: Choose **Free tier** (for testing) or **Production**
4. **Settings**:
   - **DB instance identifier**: `funmagic-db`
   - **Master username**: `postgres` (or your preferred username)
   - **Master password**: Generate a strong password and **save it securely**
5. **Instance configuration**:
   - **Free tier**: `db.t3.micro` (1 vCPU, 1GB RAM)
   - **Production**: `db.t3.small` or `db.t3.medium`
6. **Storage**:
   - **Storage type**: gp3
   - **Allocated storage**: 20 GB (minimum)
   - **Enable storage autoscaling**: ✅ Check this
   - **Maximum storage threshold**: 100 GB
7. **Connectivity**:
   - **VPC**: Default VPC
   - **Public access**: **No** (for security) or **Yes** (for local dev access)
   - **VPC security group**: Select `funmagic-rds-sg`
   - **Availability Zone**: No preference
8. **Database authentication**: Password authentication
9. **Additional configuration**:
   - **Initial database name**: `funmagic`
   - **Enable automated backups**: ✅ Yes
   - **Backup retention period**: 7 days
   - **Enable deletion protection**: ✅ Yes (for production)
10. Click **Create database**

> **Wait 5-10 minutes** for the database to be created and become "Available".

### 10.3 Get the Connection Endpoint

1. Go to **RDS** → **Databases** → Click on `funmagic-db`
2. Find the **Endpoint** in the "Connectivity & security" section
   - Example: `funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com`
3. Note the **Port**: `5432` (default)

### 10.4 Build Your Connection String

Your `DATABASE_URL` follows this format:

```
postgresql://USERNAME:PASSWORD@ENDPOINT:PORT/DATABASE
```
**BE CAREFUL:use "postgresql://USERNAME:PASSWORD@ENDPOINT:PORT/DATABASE
?sslmode=no-verify" if you connect the AWS DB and got authentication error
**Example**:
```
postgresql://postgres:YourSecurePassword123@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic
```

### 10.5 Test the Connection

**From your local machine** (if public access enabled):

```bash
# Install psql if not installed
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql-client

# Test connection
psql "postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic"

# If connected successfully, you'll see:
# funmagic=>
```

**From EC2** (after EC2 is set up):

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Install psql
sudo dnf install postgresql15 -y  # Amazon Linux 2023
# sudo apt install postgresql-client -y  # Ubuntu

# Test connection
psql "postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic"
```

### 10.6 Initialize the Database Schema

This project uses **Drizzle ORM** for database management.

**Option A: Run Drizzle migrations from local machine**

If you have public access enabled on RDS:

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

**Option B: Run Drizzle migrations from EC2**

If RDS has no public access:

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

**Available Drizzle commands:**

| Command | Description |
|---------|-------------|
| `pnpm db:push` | Push schema directly to database (recommended for dev/initial setup) |
| `pnpm db:generate` | Generate migration files from schema changes |
| `pnpm db:migrate` | Apply generated migration files |
| `pnpm db:studio` | Open Drizzle Studio to browse database |

### 10.7 Update Environment Variables

Update your `.env.local` files with the RDS connection string:

**Local development** (`apps/web/.env.local` and `apps/admin/.env.local`):

```bash
# For local dev with public RDS access
DATABASE_URL=postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic

# OR keep using local PostgreSQL for development
DATABASE_URL=postgresql://postgres:password@localhost:5432/funmagic
```

**Production** (`.env.web` and `.env.admin` on EC2):

```bash
DATABASE_URL=postgresql://postgres:YourPassword@funmagic-db.abc123xyz.us-east-2.rds.amazonaws.com:5432/funmagic
```

### 10.8 Cost Estimate

| Instance Type | vCPU | RAM | Monthly Cost |
|---------------|------|-----|--------------|
| db.t3.micro | 2 | 1 GB | ~$13/month (Free tier eligible) |
| db.t3.small | 2 | 2 GB | ~$26/month |
| db.t3.medium | 2 | 4 GB | ~$52/month |

**Additional costs**:
- Storage: ~$0.115/GB/month (gp3)
- Backup storage: Free up to DB size, then ~$0.095/GB/month
- Data transfer: EC2 ↔ RDS in same region is free

**Recommended starting configuration**:
- **Development/Testing**: `db.t3.micro` (free tier) - ~$13/month
- **Production**: `db.t3.small` with Multi-AZ - ~$52/month

### 10.9 Production Best Practices

1. **Enable Multi-AZ** for high availability (doubles cost but provides failover)
2. **Enable encryption at rest** (free, just check the box)
3. **Enable deletion protection** to prevent accidental deletion
4. **Set up CloudWatch alarms** for CPU, storage, and connections
5. **Use a strong, unique password** (consider AWS Secrets Manager)
6. **Disable public access** and only allow EC2 security group
7. **Enable Performance Insights** for query analysis
8. **Schedule maintenance windows** during low-traffic hours

---

