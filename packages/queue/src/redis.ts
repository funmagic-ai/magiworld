/**
 * @fileoverview Redis Connection Factory
 * @fileoverview Redis 连接工厂
 *
 * Provides Redis connections for different purposes:
 * - Queue: BullMQ queue operations
 * - PubSub: Real-time task updates
 * - Default: General caching and operations
 *
 * Supports multiple Redis instances for scaling.
 * 支持多个 Redis 实例以便扩展。
 *
 * @module @magiworld/queue/redis
 */

import Redis from 'ioredis';
import {
  type RedisConnectionType,
  getRedisConfig,
  getQueueEnvironment,
  logRedisConfig,
} from './config';

/**
 * Connection registry for managing named connections
 * 用于管理命名连接的连接注册表
 */
const connections = new Map<string, Redis>();

/**
 * Get connection key for registry
 * 获取注册表的连接键
 */
function getConnectionKey(type: RedisConnectionType, name?: string): string {
  const env = getQueueEnvironment();
  return name ? `${env}:${type}:${name}` : `${env}:${type}:default`;
}

/**
 * Create a new Redis connection with proper configuration
 * 创建具有适当配置的新 Redis 连接
 *
 * @param type - Connection purpose / 连接用途
 * @param name - Optional connection name for identification / 可选的连接名称用于标识
 * @returns Redis client / Redis 客户端
 */
export function createRedisConnection(
  type: RedisConnectionType = 'default',
  name?: string
): Redis {
  const config = getRedisConfig(type);
  const env = getQueueEnvironment();
  const connectionName = name || 'unnamed';

  const client = new Redis(config.url, config.options);

  // Add connection event handlers
  client.on('connect', () => {
    console.log(`[Redis:${type}:${env}:${connectionName}] Connected`);
  });

  client.on('ready', () => {
    console.log(`[Redis:${type}:${env}:${connectionName}] Ready`);
  });

  client.on('error', (err) => {
    console.error(`[Redis:${type}:${env}:${connectionName}] Error:`, err.message);
  });

  client.on('close', () => {
    console.log(`[Redis:${type}:${env}:${connectionName}] Connection closed`);
  });

  client.on('reconnecting', () => {
    console.log(`[Redis:${type}:${env}:${connectionName}] Reconnecting...`);
  });

  return client;
}

/**
 * Get or create a named Redis connection
 * 获取或创建命名的 Redis 连接
 *
 * This is the recommended way to get connections - it reuses
 * existing connections when possible.
 * 这是获取连接的推荐方式 - 它会尽可能重用现有连接。
 *
 * @param type - Connection purpose / 连接用途
 * @param name - Optional connection name / 可选的连接名称
 * @returns Redis client / Redis 客户端
 */
export function getRedisConnection(
  type: RedisConnectionType = 'default',
  name?: string
): Redis {
  const key = getConnectionKey(type, name);

  let client = connections.get(key);

  if (!client || client.status === 'end') {
    client = createRedisConnection(type, name);
    connections.set(key, client);
  }

  return client;
}

/**
 * Get the default Redis client for queue operations
 * 获取队列操作的默认 Redis 客户端
 *
 * Shorthand for getRedisConnection('queue', 'main')
 * getRedisConnection('queue', 'main') 的简写
 *
 * @returns Redis client for queues / 队列用 Redis 客户端
 */
export function getRedis(): Redis {
  return getRedisConnection('queue', 'main');
}

/**
 * Get Redis client for pub/sub operations
 * 获取发布/订阅操作的 Redis 客户端
 *
 * Note: Pub/Sub requires dedicated connections
 * 注意：发布/订阅需要专用连接
 *
 * @param name - Connection name (useful for multiple subscribers) / 连接名称（对多个订阅者有用）
 * @returns Redis client for pub/sub / 发布订阅用 Redis 客户端
 */
export function getPubSubConnection(name?: string): Redis {
  return getRedisConnection('pubsub', name || 'pubsub');
}

/**
 * Create a new subscriber connection
 * 创建新的订阅者连接
 *
 * Each subscriber should have its own connection.
 * 每个订阅者应该有自己的连接。
 *
 * @param name - Subscriber identifier / 订阅者标识符
 * @returns New Redis connection for subscribing / 用于订阅的新 Redis 连接
 */
export function createSubscriberConnection(name: string): Redis {
  return createRedisConnection('pubsub', `subscriber:${name}`);
}

/**
 * Close a specific Redis connection
 * 关闭特定的 Redis 连接
 *
 * @param type - Connection type / 连接类型
 * @param name - Connection name / 连接名称
 */
export async function closeConnection(
  type: RedisConnectionType,
  name?: string
): Promise<void> {
  const key = getConnectionKey(type, name);
  const client = connections.get(key);

  if (client) {
    await client.quit();
    connections.delete(key);
    console.log(`[Redis] Connection ${key} closed gracefully`);
  }
}

/**
 * Close all Redis connections
 * 关闭所有 Redis 连接
 *
 * Call this during graceful shutdown.
 * 在优雅关闭时调用此方法。
 */
export async function closeAllConnections(): Promise<void> {
  const closePromises: Promise<void>[] = [];

  for (const [key, client] of connections.entries()) {
    closePromises.push(
      client.quit().then(() => {
        console.log(`[Redis] Connection ${key} closed`);
      }).catch((err) => {
        console.error(`[Redis] Error closing ${key}:`, err.message);
      })
    );
  }

  await Promise.all(closePromises);
  connections.clear();
  console.log('[Redis] All connections closed gracefully');
}

/**
 * Close Redis connection (legacy alias)
 * 关闭 Redis 连接（遗留别名）
 *
 * @deprecated Use closeAllConnections() or closeConnection() instead
 */
export async function closeRedis(): Promise<void> {
  await closeAllConnections();
}

/**
 * Check Redis connection health
 * 检查 Redis 连接健康状态
 *
 * @param type - Connection type to check / 要检查的连接类型
 * @returns true if connection is healthy / 如果连接健康则返回 true
 */
export async function pingRedis(type: RedisConnectionType = 'default'): Promise<boolean> {
  try {
    const client = getRedisConnection(type, 'health-check');
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    const err = error as Error;
    console.error(`[Redis:${type}] Ping failed:`, err.message);
    return false;
  }
}

/**
 * Check all Redis connections health
 * 检查所有 Redis 连接健康状态
 *
 * @returns Health status for each connection type / 每种连接类型的健康状态
 */
export async function checkAllConnections(): Promise<{
  queue: boolean;
  pubsub: boolean;
  default: boolean;
}> {
  const [queue, pubsub, defaultConn] = await Promise.all([
    pingRedis('queue'),
    pingRedis('pubsub'),
    pingRedis('default'),
  ]);

  return { queue, pubsub, default: defaultConn };
}

/**
 * Get connection statistics
 * 获取连接统计信息
 *
 * @returns Connection count and statuses / 连接数量和状态
 */
export function getConnectionStats(): {
  total: number;
  connections: Array<{ key: string; status: string }>;
} {
  const stats = Array.from(connections.entries()).map(([key, client]) => ({
    key,
    status: client.status,
  }));

  return {
    total: connections.size,
    connections: stats,
  };
}

/**
 * Log current configuration (for debugging)
 * 记录当前配置（用于调试）
 */
export { logRedisConfig };

// Re-export Redis class for type usage
export { Redis };
