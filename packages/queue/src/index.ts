/**
 * @fileoverview Task Queue Package
 * @fileoverview 任务队列包
 *
 * BullMQ-based task queue for async AI task processing.
 * 基于 BullMQ 的异步 AI 任务处理队列。
 *
 * @module @magiworld/queue
 */

// Redis configuration
export {
  getRedisUrl,
  createRedisOptions,
  getRedisConfig,
  getQueueEnvironment,
  getQueuePrefix,
  isAdminMode,
  getEnvironmentSettings,
  isTlsEnabled,
  logRedisConfig,
} from './config';
export type { RedisConnectionType, QueueEnvironment, RedisConfig } from './config';

// Redis client
export {
  getRedis,
  getRedisConnection,
  getPubSubConnection,
  createRedisConnection,
  createSubscriberConnection,
  closeRedis,
  closeConnection,
  closeAllConnections,
  pingRedis,
  checkAllConnections,
  getConnectionStats,
} from './redis';

// Queue management
export {
  getQueue,
  getProviderQueue,
  enqueueTask,
  getAllQueues,
  closeAllQueues,
  getQueueStats,
  getAllQueueStats,
  getPrefixedQueueName,
} from './queues';

// Pub/Sub for real-time updates
export {
  TASK_CHANNEL_PREFIX,
  getTaskChannel,
  publishTaskUpdate,
  createTaskUpdateMessage,
  createTaskSubscriber,
  subscribeToTaskUpdates,
} from './pubsub';

// User rate limiting
export {
  DEFAULT_MAX_CONCURRENT_TASKS,
  checkUserConcurrency,
  incrementUserTasks,
  decrementUserTasks,
  getUserTaskCount,
  resetUserTaskCount,
} from './ratelimit';

// Idempotency
export {
  checkIdempotency,
  setIdempotency,
  removeIdempotency,
  generateIdempotencyKey,
} from './idempotency';
export type { IdempotencyResult } from './idempotency';

// Circuit breaker
export {
  CircuitBreaker,
  CircuitBreakerOpenError,
  getCircuitBreaker,
} from './circuit-breaker';
export type { CircuitBreakerOptions } from './circuit-breaker';

// Types
export * from './types';

// Re-export BullMQ types for convenience
export { Queue, Worker, Job, QueueEvents } from 'bullmq';
export type { JobsOptions, WorkerOptions, QueueOptions } from 'bullmq';
