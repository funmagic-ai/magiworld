/**
 * @fileoverview Redis Configuration
 * @fileoverview Redis 配置
 *
 * Centralized configuration for Redis connections.
 * Supports multiple Redis instances for future scaling.
 * 集中式 Redis 连接配置。
 * 支持多个 Redis 实例以便未来扩展。
 *
 * Environment Variables:
 * - REDIS_URL: Default Redis URL (required)
 * - REDIS_QUEUE_URL: Redis for BullMQ queues (optional, falls back to REDIS_URL)
 * - REDIS_PUBSUB_URL: Redis for pub/sub (optional, falls back to REDIS_URL)
 * - REDIS_TLS: Enable TLS ('true' to enable)
 * - QUEUE_PREFIX: Queue prefix for isolation ('admin' for admin queues)
 *
 * @module @magiworld/queue/config
 */

import type { RedisOptions } from 'ioredis';

/**
 * Redis connection purpose / Redis 连接用途
 */
export type RedisConnectionType = 'queue' | 'pubsub' | 'default';

/**
 * Queue environment type / 队列环境类型
 */
export type QueueEnvironment = 'web' | 'admin';

/**
 * Redis configuration interface / Redis 配置接口
 */
export interface RedisConfig {
  /** Redis URL */
  url: string;
  /** Connection options */
  options: RedisOptions;
  /** Connection type */
  type: RedisConnectionType;
}

/**
 * Environment-specific settings / 环境特定设置
 */
interface EnvironmentSettings {
  /** Max retries for reconnection */
  maxReconnectAttempts: number;
  /** Base delay for reconnection (ms) */
  reconnectBaseDelay: number;
  /** Max delay for reconnection (ms) */
  reconnectMaxDelay: number;
  /** Connection timeout (ms) */
  connectTimeout: number;
  /** Command timeout (ms) */
  commandTimeout: number;
}

/**
 * Default settings for web environment (production-critical)
 * Web 环境的默认设置（生产关键）
 */
const WEB_SETTINGS: EnvironmentSettings = {
  maxReconnectAttempts: 20,
  reconnectBaseDelay: 100,
  reconnectMaxDelay: 3000,
  connectTimeout: 10000,
  commandTimeout: 5000,
};

/**
 * Default settings for admin environment (can be more lenient)
 * Admin 环境的默认设置（可以更宽松）
 */
const ADMIN_SETTINGS: EnvironmentSettings = {
  maxReconnectAttempts: 10,
  reconnectBaseDelay: 200,
  reconnectMaxDelay: 5000,
  connectTimeout: 15000,
  commandTimeout: 10000,
};

/**
 * Get current queue environment based on QUEUE_PREFIX
 * 根据 QUEUE_PREFIX 获取当前队列环境
 */
export function getQueueEnvironment(): QueueEnvironment {
  return process.env.QUEUE_PREFIX === 'admin' ? 'admin' : 'web';
}

/**
 * Get queue prefix
 * 获取队列前缀
 */
export function getQueuePrefix(): string {
  return process.env.QUEUE_PREFIX || '';
}

/**
 * Check if running in admin mode
 * 检查是否在管理员模式下运行
 */
export function isAdminMode(): boolean {
  return getQueueEnvironment() === 'admin';
}

/**
 * Get environment-specific settings
 * 获取环境特定设置
 */
export function getEnvironmentSettings(): EnvironmentSettings {
  return isAdminMode() ? ADMIN_SETTINGS : WEB_SETTINGS;
}

/**
 * Get Redis URL for a specific connection type
 * 获取特定连接类型的 Redis URL
 *
 * Falls back to REDIS_URL if specific URL is not set.
 * 如果未设置特定 URL，则回退到 REDIS_URL。
 *
 * @param type - Connection type / 连接类型
 * @returns Redis URL
 */
export function getRedisUrl(type: RedisConnectionType = 'default'): string {
  const defaultUrl = process.env.REDIS_URL;

  if (!defaultUrl) {
    throw new Error('REDIS_URL environment variable is not set');
  }

  switch (type) {
    case 'queue':
      return process.env.REDIS_QUEUE_URL || defaultUrl;
    case 'pubsub':
      return process.env.REDIS_PUBSUB_URL || defaultUrl;
    default:
      return defaultUrl;
  }
}

/**
 * Check if TLS is enabled
 * 检查是否启用 TLS
 */
export function isTlsEnabled(): boolean {
  return process.env.REDIS_TLS === 'true';
}

/**
 * Create Redis options based on connection type and environment
 * 根据连接类型和环境创建 Redis 选项
 *
 * @param type - Connection type / 连接类型
 * @returns Redis options / Redis 选项
 */
export function createRedisOptions(type: RedisConnectionType = 'default'): RedisOptions {
  const settings = getEnvironmentSettings();
  const env = getQueueEnvironment();

  const baseOptions: RedisOptions = {
    // TLS configuration for AWS ElastiCache / Upstash
    tls: isTlsEnabled() ? {} : undefined,

    // Required for BullMQ - allows blocking commands
    maxRetriesPerRequest: null,

    // Disable ready check for faster connection
    enableReadyCheck: false,

    // Lazy connect - don't connect until first command
    lazyConnect: true,

    // Connection timeout
    connectTimeout: settings.connectTimeout,

    // Note: commandTimeout is intentionally NOT set here for BullMQ compatibility.
    // BullMQ workers use blocking commands (BRPOPLPUSH, BZPOPMIN) that wait
    // indefinitely for jobs. Setting commandTimeout causes these to fail with
    // "Command timed out" errors every few seconds.
    // See: https://docs.bullmq.io/guide/connections

    // Reconnection strategy
    retryStrategy: (times: number) => {
      if (times > settings.maxReconnectAttempts) {
        console.error(`[Redis:${type}:${env}] Max reconnection attempts (${settings.maxReconnectAttempts}) reached`);
        return null; // Stop retrying
      }
      const delay = Math.min(
        times * settings.reconnectBaseDelay,
        settings.reconnectMaxDelay
      );
      console.log(`[Redis:${type}:${env}] Reconnecting in ${delay}ms (attempt ${times}/${settings.maxReconnectAttempts})`);
      return delay;
    },
  };

  // Add type-specific options
  switch (type) {
    case 'queue':
      // BullMQ queues need specific settings
      return {
        ...baseOptions,
        // Enable offline queue for BullMQ reliability
        enableOfflineQueue: true,
      };

    case 'pubsub':
      // Pub/Sub connections have different needs
      return {
        ...baseOptions,
        // Disable lazy connect for pub/sub - need immediate connection for subscribing
        lazyConnect: false,
        // Enable offline queue to prevent "Stream isn't writeable" errors during connection
        enableOfflineQueue: true,
        // Auto-reconnect is critical for pub/sub
        retryStrategy: (times: number) => {
          // Always retry for pub/sub (with backoff)
          const delay = Math.min(times * 100, 10000);
          console.log(`[Redis:pubsub:${env}] Reconnecting in ${delay}ms (attempt ${times})`);
          return delay;
        },
      };

    default:
      return baseOptions;
  }
}

/**
 * Get complete Redis configuration for a connection type
 * 获取连接类型的完整 Redis 配置
 *
 * @param type - Connection type / 连接类型
 * @returns Complete Redis configuration / 完整的 Redis 配置
 */
export function getRedisConfig(type: RedisConnectionType = 'default'): RedisConfig {
  return {
    url: getRedisUrl(type),
    options: createRedisOptions(type),
    type,
  };
}

/**
 * Log configuration summary (for debugging)
 * 记录配置摘要（用于调试）
 */
export function logRedisConfig(): void {
  const env = getQueueEnvironment();
  const prefix = getQueuePrefix();

  console.log('[Redis Config]', {
    environment: env,
    queuePrefix: prefix || '(none)',
    tlsEnabled: isTlsEnabled(),
    urls: {
      default: process.env.REDIS_URL ? '(set)' : '(not set)',
      queue: process.env.REDIS_QUEUE_URL ? '(set)' : '(using default)',
      pubsub: process.env.REDIS_PUBSUB_URL ? '(set)' : '(using default)',
    },
  });
}
