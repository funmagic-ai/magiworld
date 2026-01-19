## Step 11: Set Up AWS ElastiCache Redis

AWS ElastiCache provides a managed Redis instance for the BullMQ task queue and real-time pub/sub messaging.

### 11.1 Create a Redis Security Group

1. Go to **EC2** → **Security Groups** → **Create security group**
2. **Name**: `funmagic-redis-sg`
3. **Description**: Security group for Funmagic ElastiCache Redis
4. **VPC**: Default VPC (same as your EC2 instance)
5. **Inbound rules**:

| Type | Port | Source | Description |
|------|------|--------|-------------|
| Custom TCP | 6379 | `funmagic-ec2-sg` | Allow EC2 to connect |

6. **Outbound rules**: Keep default (all traffic allowed)
7. Click **Create security group**

### 11.2 Create ElastiCache Subnet Group

1. Go to **ElastiCache** → **Subnet groups** → **Create subnet group**
2. **Name**: `funmagic-redis-subnet`
3. **Description**: Subnet group for Funmagic Redis
4. **VPC ID**: Default VPC
5. **Subnets**: Select subnets in at least 2 availability zones
6. Click **Create**

### 11.3 Create ElastiCache Redis Cluster

1. Go to **ElastiCache** → **Redis caches** → **Create Redis cache**
2. **Cluster mode**: Disabled (simpler for single-node setup)
3. **Cluster info**:
   - **Name**: `funmagic-redis`
   - **Description**: Redis for Funmagic task queue
4. **Location**: AWS Cloud
5. **Node type**:
   - **Development**: `cache.t3.micro` (free tier eligible)
   - **Production**: `cache.t3.small` or `cache.r6g.large`
6. **Number of replicas**: 0 (development) or 1-2 (production for HA)
7. **Subnet group**: Select `funmagic-redis-subnet`
8. **Security groups**: Select `funmagic-redis-sg`
9. **Encryption**:
   - **Encryption at-rest**: ✅ Enabled
   - **Encryption in-transit**: ✅ Enabled (requires TLS connection)
10. **Automatic backups**: ✅ Enabled (retention: 1-7 days)
11. Click **Create**

> **Wait 5-10 minutes** for the cluster to be created and become "Available".

### 11.4 Get the Connection Endpoint

1. Go to **ElastiCache** → **Redis caches** → Click on `funmagic-redis`
2. Find the **Primary endpoint** in the "Cluster details" section
   - Example: `funmagic-redis.abc123.ng.0001.use2.cache.amazonaws.com:6379`
3. For clusters with encryption in-transit enabled, use `rediss://` (note the double 's')

### 11.5 Build Your Connection String

Your `REDIS_URL` follows this format:

```
# Without TLS (encryption in-transit disabled)
redis://ENDPOINT:PORT

# With TLS (encryption in-transit enabled) - RECOMMENDED
rediss://ENDPOINT:PORT
```

**Example**:
```bash
# Development (no TLS)
REDIS_URL=redis://funmagic-redis.abc123.ng.0001.use2.cache.amazonaws.com:6379

# Production (with TLS)
REDIS_URL=rediss://funmagic-redis.abc123.ng.0001.use2.cache.amazonaws.com:6379
```

### 11.6 Test the Connection

**From EC2** (after EC2 is set up):

```bash
# SSH into EC2
ssh -i your-key.pem ec2-user@YOUR_EC2_IP

# Install redis-cli
sudo dnf install redis6 -y  # Amazon Linux 2023
# sudo apt install redis-tools -y  # Ubuntu

# Test connection (without TLS)
redis-cli -h funmagic-redis.abc123.ng.0001.use2.cache.amazonaws.com -p 6379 ping
# Should return: PONG

# Test connection (with TLS)
redis-cli -h funmagic-redis.abc123.ng.0001.use2.cache.amazonaws.com -p 6379 --tls ping
# Should return: PONG
```

### 11.7 Cost Estimate

| Node Type | vCPU | Memory | Monthly Cost |
|-----------|------|--------|--------------|
| cache.t3.micro | 2 | 0.5 GB | ~$12/month (Free tier eligible) |
| cache.t3.small | 2 | 1.37 GB | ~$24/month |
| cache.t3.medium | 2 | 3.09 GB | ~$48/month |
| cache.r6g.large | 2 | 13.07 GB | ~$98/month |

**Additional costs**:
- Backup storage: ~$0.085/GB/month
- Data transfer: EC2 ↔ ElastiCache in same AZ is free

**Recommended starting configuration**:
- **Development/Testing**: `cache.t3.micro` (free tier) - ~$12/month
- **Production**: `cache.t3.small` with 1 replica - ~$48/month

### 11.8 Production Best Practices

1. **Enable encryption in-transit** for secure connections (TLS)
2. **Enable encryption at-rest** for data security
3. **Use at least 1 replica** for high availability in production
4. **Enable automatic failover** if using replicas
5. **Set up CloudWatch alarms** for CPU, memory, and connections
6. **Configure maintenance windows** during low-traffic hours
7. **Enable automatic backups** with appropriate retention period

### 11.9 Advanced Configuration: Multiple Redis Instances

For future scaling, the platform supports separate Redis instances for different purposes:

| Environment Variable | Purpose | When to Use |
|---------------------|---------|-------------|
| `REDIS_URL` | Default Redis URL (required) | Always |
| `REDIS_QUEUE_URL` | BullMQ queue operations | Separate Redis for job queues |
| `REDIS_PUBSUB_URL` | Real-time pub/sub messaging | Separate Redis for SSE/WebSocket updates |
| `REDIS_TLS` | Enable TLS connections | When using `redis://` URLs with TLS |

**Basic Setup (Single Redis):**
```bash
REDIS_URL=rediss://funmagic-redis.abc123.use2.cache.amazonaws.com:6379
```

**Advanced Setup (Separate Redis Instances):**
```bash
# Primary for general operations
REDIS_URL=rediss://redis-main.abc123.use2.cache.amazonaws.com:6379

# Dedicated for BullMQ queues (higher memory, persistence)
REDIS_QUEUE_URL=rediss://redis-queue.abc123.use2.cache.amazonaws.com:6379

# Dedicated for pub/sub (low latency, no persistence needed)
REDIS_PUBSUB_URL=rediss://redis-pubsub.abc123.use2.cache.amazonaws.com:6379
```

**When to Use Multiple Redis Instances:**
- **High throughput**: Queue Redis can be optimized for persistence
- **Low latency updates**: Pub/Sub Redis can be optimized for speed
- **Cost optimization**: Different instance sizes for different workloads
- **Isolation**: Queue issues don't affect real-time updates

### 11.10 Web vs Admin Isolation

Run separate workers for web and admin with different Redis instances:

```bash
# Web Worker (production traffic)
REDIS_URL=rediss://redis-prod.example.com:6379
QUEUE_PREFIX=

# Admin Worker (internal tools)
REDIS_URL=rediss://redis-admin.example.com:6379
QUEUE_PREFIX=admin
```

See **design.md Section 25** for complete architecture and migration guide.

---

