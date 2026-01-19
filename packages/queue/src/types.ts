/**
 * @fileoverview Task Queue Types
 * @fileoverview 任务队列类型定义
 *
 * Shared types for task orchestration system.
 * 任务编排系统的共享类型。
 *
 * @module @magiworld/queue/types
 */

/**
 * Task priority levels / 任务优先级
 *
 * In BullMQ, lower numbers = higher priority (processed first).
 * 在BullMQ中，数字越小优先级越高（优先处理）。
 */
export enum TaskPriority {
  /** Highest priority - for urgent user-facing tasks */
  URGENT = 1,
  /** High priority - for web user tasks (processed before admin) */
  HIGH = 5,
  /** Web user tasks - default for web app */
  WEB = 5,
  /** Normal priority */
  NORMAL = 10,
  /** Admin tasks - lower priority than web users */
  ADMIN = 15,
  /** Low priority - background/batch tasks */
  LOW = 20,
}

/**
 * Task status in the queue / 任务在队列中的状态
 */
export type TaskStatus = 'pending' | 'processing' | 'success' | 'failed';

/**
 * Provider status / 供应商状态
 */
export type ProviderStatus = 'active' | 'inactive' | 'degraded';

/**
 * Circuit breaker states / 熔断器状态
 */
export type CircuitState = 'closed' | 'open' | 'half-open';

/**
 * Price configuration structure for flexible billing
 * 灵活计费的价格配置结构
 */
export interface PriceConfig {
  type: 'token' | 'request' | 'image' | 'second';
  input_per_1k?: number;
  output_per_1k?: number;
  cost_per_call?: number;
  cost_per_image?: number;
  cost_per_second?: number;
}

/**
 * Job data payload for BullMQ / BullMQ 任务数据负载
 *
 * Tool processors determine which provider(s) to use.
 * Provider credentials are fetched from DB by tool processors.
 * 工具处理器决定使用哪个提供商。
 * 提供商凭据由工具处理器从数据库获取。
 */
export interface TaskJobData {
  taskId: string;
  userId: string;
  toolId: string;
  /** Tool slug for routing to correct processor */
  toolSlug: string;
  /** Price config (snapshot from tool at task creation) */
  priceConfig?: PriceConfig;
  /** Tool-specific config (snapshot from tool at task creation) */
  toolConfig?: Record<string, unknown>;
  inputParams: Record<string, unknown>;
  priority: TaskPriority;
  idempotencyKey?: string;
  requestId?: string;
  timeout?: number;
}

/**
 * Job result from worker / Worker 返回的任务结果
 */
export interface TaskJobResult {
  success: boolean;
  outputData?: Record<string, unknown>;
  error?: string;
  duration?: number;
}

/**
 * Provider configuration / 供应商配置
 */
export interface ProviderConfig {
  id: string;
  slug: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  rateLimitMax: number;
  rateLimitWindow: number;
  defaultTimeout: number;
  status: ProviderStatus;
  configJson?: Record<string, unknown>;
}

/**
 * Cache entry with TTL / 带 TTL 的缓存条目
 */
export interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Task progress update / 任务进度更新
 */
export interface TaskProgress {
  taskId: string;
  progress: number;
  message?: string;
  status: TaskStatus;
  outputData?: Record<string, unknown>;
  error?: string;
}

/**
 * Redis pub/sub message for task updates / 任务更新的 Redis 发布订阅消息
 */
export interface TaskUpdateMessage {
  taskId: string;
  userId: string;
  status: TaskStatus;
  progress: number;
  message?: string;
  outputData?: Record<string, unknown>;
  error?: string;
  timestamp: number;
}

/**
 * Dead letter task entry / 死信任务条目
 */
export interface DeadLetterEntry {
  originalTaskId: string;
  queue: string;
  errorMessage: string;
  errorStack?: string;
  attemptsMade: number;
  payload: TaskJobData;
}

/**
 * Queue names for different providers / 不同供应商的队列名称
 */
export const QueueNames = {
  FAL_AI: 'fal_ai',
  GOOGLE: 'google',
  OPENAI: 'openai',
  DEFAULT: 'default',
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];

/**
 * Default queue configuration / 默认队列配置
 *
 * Job retention strategy:
 * - Completed jobs: Keep 100 jobs OR 3 days (whichever comes first)
 * - Failed jobs: Keep 200 jobs OR 7 days (for debugging)
 *
 * Long-term task history is stored in PostgreSQL (tasks/admin_tasks tables).
 * BullMQ/Redis is only for queue processing and short-term Bull Board debugging.
 *
 * 作业保留策略：
 * - 已完成作业：保留100个作业或3天（以先到者为准）
 * - 失败作业：保留200个作业或7天（用于调试）
 *
 * 长期任务历史存储在PostgreSQL中（tasks/admin_tasks表）。
 * BullMQ/Redis仅用于队列处理和短期Bull Board调试。
 */
export const DEFAULT_QUEUE_CONFIG = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 1000,
  },
  // Keep 100 completed jobs OR jobs less than 3 days old
  removeOnComplete: {
    count: 100,
    age: 60 * 60 * 24 * 3, // 3 days in seconds
  },
  // Keep 200 failed jobs OR jobs less than 7 days old (for debugging)
  removeOnFail: {
    count: 200,
    age: 60 * 60 * 24 * 7, // 7 days in seconds
  },
};
