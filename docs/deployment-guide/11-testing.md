## Step 14: Test the Configuration

### 14.1 Test Admin Library Upload

```bash
# Start admin app
pnpm dev:admin
```

1. Go to `http://localhost:3001/library`
2. Create a folder and upload an image
3. Check AWS Console → S3 → `funmagic-admin-users-assets` → Verify file exists

### 14.2 Test Public Banner Upload

1. Go to Admin → Banners → Add Banner
2. Upload a banner image
3. Check AWS Console → S3 → `funmagic-web-public-assets/banners/main/` → Verify file exists
4. Test public URL: `https://cdn.funmagic.ai/banners/main/your-file.jpg`

### 14.3 Test Web User Upload

```bash
# Start web app
pnpm dev:web
```

1. Log in to the web app
2. Use a tool (e.g., background-remove) to upload an image
3. Check AWS Console → S3 → `funmagic-web-users-assets-private` → Verify file exists

### 14.4 Test Task Queue (Worker)

```bash
# Start worker
pnpm dev:worker
```

1. Submit a task via web app (e.g., background removal)
2. Check Redis for queued job: `redis-cli KEYS "bull:*"`
3. Watch worker logs for job processing
4. Verify task result uploads to S3 `funmagic-web-users-assets-private`
5. Check task status updates in real-time via SSE

### 14.5 Test Signed URLs

Private bucket URLs without signature should return **403 Forbidden**:
```
https://d1234admin.cloudfront.net/path/to/file.jpg  → 403 Forbidden
```

Signed URLs should work:
```
https://d1234admin.cloudfront.net/path/to/file.jpg?Expires=...&Signature=...&Key-Pair-Id=...  → 200 OK
```

### 14.6 Test EC2 Deployment

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
# https://funmagic.ai - should show web app
# https://admin.funmagic.ai - should show admin app
```

---

## Quick Checklist

| Step | Task | Status |
|------|------|--------|
| 1.1 | Create `funmagic-admin-users-assets` bucket (private) | ⬜ |
| 1.2 | Create `funmagic-web-public-assets` bucket (public) | ⬜ |
| 1.3 | Create `funmagic-web-users-assets-private` bucket (private) | ⬜ |
| 1.4 | Create `funmagic-web-users-assets-shared` bucket (public) | ⬜ |
| 2.1 | Add public bucket policy to `funmagic-web-public-assets` | ⬜ |
| 2.2 | Add public bucket policy to `funmagic-web-users-assets-shared` | ⬜ |
| 3 | Configure CORS on all 4 buckets | ⬜ |
| 4.1 | Create `funmagic-admin-s3-policy` IAM policy | ⬜ |
| 4.2 | Create `funmagic-admin-app` IAM user | ⬜ |
| 4.3 | Create access keys for admin user | ⬜ |
| 4.4 | Create `funmagic-web-s3-policy` IAM policy | ⬜ |
| 4.5 | Create `funmagic-web-app` IAM user + access keys | ⬜ |
| 4.6 | Delete root user access keys (if applicable) | ⬜ |
| 5.1 | Create CloudFront for `funmagic-admin-users-assets` (with OAC) | ⬜ |
| 5.2 | Create CloudFront for `funmagic-web-public-assets` (public) | ⬜ |
| 5.3 | Create CloudFront for `funmagic-web-users-assets-private` (with OAC) | ⬜ |
| 5.4 | Create CloudFront for `funmagic-web-users-assets-shared` (public) | ⬜ |
| 6.1 | Create CloudFront key pair for signed URLs | ⬜ |
| 6.2 | Create key group for signed URLs | ⬜ |
| 6.3 | Configure private distributions to require signed URLs | ⬜ |
| 6.4 | Add private key to `.env.local` | ⬜ |
| 7 | Set up lifecycle policies | ⬜ |
| 8.1a | Add domain to Cloudflare | ⬜ |
| 8.1b | Update nameservers in GoDaddy | ⬜ |
| 8.1c | Verify nameservers propagated | ⬜ |
| 8.2 | Configure Google Workspace email records (MX, SPF, DKIM) | ⬜ |
| 8.3 | Configure DNS for CloudFront distributions | ⬜ |
| 8.4 | Configure DNS for EC2 | ⬜ |
| 9.1 | Create EC2 security group | ⬜ |
| 9.2 | Launch EC2 instance | ⬜ |
| 9.3 | Allocate Elastic IP | ⬜ |
| 9.4 | Install Docker on EC2 | ⬜ |
| 9.5 | Create Docker Compose and Dockerfiles | ⬜ |
| 9.6 | Set up SSL (Cloudflare Origin Cert or Let's Encrypt) | ⬜ |
| 9.7 | Update Cloudflare DNS to EC2 IP | ⬜ |
| 10.1 | Create RDS security group (`funmagic-rds-sg`) | ⬜ |
| 10.2 | Create RDS PostgreSQL instance (`funmagic-db`) | ⬜ |
| 10.3 | Get RDS endpoint and build connection string | ⬜ |
| 10.4 | Test database connection | ⬜ |
| 10.5 | Run Drizzle migrations to initialize schema (`pnpm db:push`) | ⬜ |
| 11.1 | Create Redis security group (`funmagic-redis-sg`) | ⬜ |
| 11.2 | Create ElastiCache subnet group | ⬜ |
| 11.3 | Create ElastiCache Redis cluster (`funmagic-redis`) | ⬜ |
| 11.4 | Get Redis endpoint and build connection string | ⬜ |
| 11.5 | Test Redis connection | ⬜ |
| 12 | Configure `.env.local` files for web, admin, and worker | ⬜ |
| 13.1 | Set up Git access for private repo (SSH deploy key) | ⬜ |
| 13.2 | Clone repository to EC2 | ⬜ |
| 13.3 | Create production environment files (.env.web, .env.admin, .env.worker) | ⬜ |
| 13.4 | Build and start Docker containers (web, admin, worker) | ⬜ |
| 13.5 | Verify all containers running | ⬜ |
| 14.1 | Test admin library upload | ⬜ |
| 14.2 | Test public banner upload | ⬜ |
| 14.3 | Test web user upload | ⬜ |
| 14.4 | Test task queue (worker processes jobs) | ⬜ |
| 14.5 | Test signed URLs work correctly | ⬜ |
| 14.6 | Test production deployment via HTTPS | ⬜ |

---

