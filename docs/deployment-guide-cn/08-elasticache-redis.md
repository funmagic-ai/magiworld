## 步骤 11：设置 AWS ElastiCache Redis

AWS ElastiCache 提供托管的 Redis 实例，用于 BullMQ 任务队列和实时发布/订阅消息传递。

### 11.1 创建 Redis 安全组

1. 进入 **EC2** → **Security Groups** → **Create security group**
2. **名称**：`funmagic-redis-sg`
3. **描述**：Funmagic ElastiCache Redis 的安全组
4. **VPC**：默认 VPC（与您的 EC2 实例相同）
5. **入站规则**：

| 类型 | 端口 | 来源 | 描述 |
|------|------|------|------|
| Custom TCP | 6379 | `funmagic-ec2-sg` | 允许 EC2 连接 |

6. **出站规则**：保持默认（允许所有流量）
7. 点击 **Create security group**

### 11.2 创建 ElastiCache 子网组

1. 进入 **ElastiCache** → **Subnet groups** → **Create subnet group**
2. **名称**：`funmagic-redis-subnet`
3. **描述**：Funmagic Redis 的子网组
4. **VPC ID**：默认 VPC
5. **子网**：选择至少 2 个可用区的子网
6. 点击 **Create**

### 11.3 创建 ElastiCache Redis 集群

1. 进入 **ElastiCache** → **Redis caches** → **Create Redis cache**
2. **集群模式**：已禁用（单节点设置更简单）
3. **集群信息**：
   - **名称**：`funmagic-redis`
   - **描述**：Funmagic 任务队列的 Redis
4. **位置**：AWS Cloud
5. **节点类型**：
   - **开发环境**：`cache.t3.micro`（免费套餐资格）
   - **生产环境**：`cache.t3.small` 或 `cache.r6g.large`
6. **副本数量**：0（开发环境）或 1-2（生产环境高可用）
7. **子网组**：选择 `funmagic-redis-subnet`
8. **安全组**：选择 `funmagic-redis-sg`
9. **加密**：
   - **静态加密**：✅ 已启用
   - **传输中加密**：✅ 已启用（需要 TLS 连接）
10. **自动备份**：✅ 已启用（保留期：1-7 天）
11. 点击 **Create**

> **等待 5-10 分钟**，集群创建完成并变为"Available"状态。

### 11.4 获取连接端点

1. 进入 **ElastiCache** → **Redis caches** → 点击 `funmagic-redis`
2. 在"Cluster details"部分找到 **Primary endpoint**
   - 示例：`funmagic-redis.abc123.ng.0001.use2.cache.amazonaws.com:6379`
3. 对于启用传输中加密的集群，使用 `rediss://`（注意双 's'）

### 11.5 构建连接字符串

您的 `REDIS_URL` 遵循以下格式：

```
# 无 TLS（传输中加密已禁用）
redis://ENDPOINT:PORT

# 有 TLS（传输中加密已启用）- 推荐
rediss://ENDPOINT:PORT
```

**示例**：
```bash
# Development (no TLS)
REDIS_URL=redis://funmagic-redis.abc123.ng.0001.use2.cache.amazonaws.com:6379

# Production (with TLS)
REDIS_URL=rediss://funmagic-redis.abc123.ng.0001.use2.cache.amazonaws.com:6379
```

### 11.6 测试连接

**从 EC2**（设置 EC2 后）：

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

### 11.7 成本估算

| 节点类型 | vCPU | 内存 | 月费用 |
|----------|------|------|--------|
| cache.t3.micro | 2 | 0.5 GB | 约 $12/月（免费套餐资格） |
| cache.t3.small | 2 | 1.37 GB | 约 $24/月 |
| cache.t3.medium | 2 | 3.09 GB | 约 $48/月 |
| cache.r6g.large | 2 | 13.07 GB | 约 $98/月 |

**额外费用**：
- 备份存储：约 $0.085/GB/月
- 数据传输：同可用区内 EC2 ↔ ElastiCache 免费

**推荐起步配置**：
- **开发/测试**：`cache.t3.micro`（免费套餐）- 约 $12/月
- **生产环境**：`cache.t3.small` + 1 副本 - 约 $48/月

### 11.8 生产环境最佳实践

1. **启用传输中加密** 以确保安全连接（TLS）
2. **启用静态加密** 以确保数据安全
3. 在生产环境中**使用至少 1 个副本** 以实现高可用性
4. 如果使用副本，**启用自动故障转移**
5. **设置 CloudWatch 告警** 监控 CPU、内存和连接数
6. **配置维护窗口** 在低流量时段
7. **启用自动备份** 并设置适当的保留期

### 11.9 高级配置：多 Redis 实例

为了未来扩展，平台支持为不同用途使用独立的 Redis 实例：

| 环境变量 | 用途 | 使用场景 |
|----------|------|----------|
| `REDIS_URL` | 默认 Redis URL（必需） | 始终需要 |
| `REDIS_QUEUE_URL` | BullMQ 队列操作 | 队列专用独立 Redis |
| `REDIS_PUBSUB_URL` | 实时发布/订阅消息 | SSE/WebSocket 更新专用 Redis |
| `REDIS_TLS` | 启用 TLS 连接 | 使用 `redis://` URL 时启用 TLS |

**基础配置（单一 Redis）：**
```bash
REDIS_URL=rediss://funmagic-redis.abc123.use2.cache.amazonaws.com:6379
```

**高级配置（独立 Redis 实例）：**
```bash
# 主 Redis 用于通用操作
REDIS_URL=rediss://redis-main.abc123.use2.cache.amazonaws.com:6379

# BullMQ 队列专用（更大内存，持久化）
REDIS_QUEUE_URL=rediss://redis-queue.abc123.use2.cache.amazonaws.com:6379

# 发布/订阅专用（低延迟，无需持久化）
REDIS_PUBSUB_URL=rediss://redis-pubsub.abc123.use2.cache.amazonaws.com:6379
```

**何时使用多 Redis 实例：**
- **高吞吐量**：队列 Redis 可针对持久化优化
- **低延迟更新**：发布/订阅 Redis 可针对速度优化
- **成本优化**：不同工作负载使用不同实例规格
- **隔离**：队列问题不会影响实时更新

### 11.10 Web 与 Admin 隔离

使用不同的 Redis 实例运行独立的 Web 和 Admin Worker：

```bash
# Web Worker（生产流量）
REDIS_URL=rediss://redis-prod.example.com:6379
QUEUE_PREFIX=

# Admin Worker（内部工具）
REDIS_URL=rediss://redis-admin.example.com:6379
QUEUE_PREFIX=admin
```

详见 **design-cn.md 第 25 节** 获取完整架构和迁移指南。

---

