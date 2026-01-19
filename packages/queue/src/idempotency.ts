/**
 * @fileoverview Idempotency Utilities
 * @fileoverview 幂等性工具
 *
 * Redis-based idempotency checking to prevent duplicate task processing.
 * 基于 Redis 的幂等性检查，防止重复任务处理。
 *
 * @module @magiworld/queue/idempotency
 */

import { getRedis } from './redis';

/**
 * TTL for idempotency keys in seconds (1 hour)
 * 幂等键的 TTL（1 小时）
 */
const IDEMPOTENCY_TTL = 3600;

/**
 * Redis key prefix for idempotency
 * 幂等性的 Redis 键前缀
 */
const IDEMPOTENCY_KEY_PREFIX = 'idem:';

/**
 * Get the Redis key for an idempotency check
 * 获取幂等性检查的 Redis 键
 *
 * @param userId - User ID / 用户 ID
 * @param key - Idempotency key (hash of request) / 幂等键（请求的哈希）
 * @returns Redis key / Redis 键
 */
function getIdempotencyKey(userId: string, key: string): string {
  return `${IDEMPOTENCY_KEY_PREFIX}${userId}:${key}`;
}

/**
 * Result of idempotency check
 * 幂等性检查的结果
 */
export interface IdempotencyResult {
  /** Whether this is a duplicate request / 是否为重复请求 */
  exists: boolean;
  /** Existing task ID if duplicate / 如果重复则为现有任务 ID */
  taskId?: string;
}

/**
 * Check if a request with this idempotency key has already been processed
 * 检查具有此幂等键的请求是否已处理
 *
 * @param userId - User ID / 用户 ID
 * @param idempotencyKey - Unique key for this request / 此请求的唯一键
 * @returns Idempotency check result / 幂等性检查结果
 */
export async function checkIdempotency(
  userId: string,
  idempotencyKey: string
): Promise<IdempotencyResult> {
  const redis = getRedis();
  const key = getIdempotencyKey(userId, idempotencyKey);

  const taskId = await redis.get(key);

  if (taskId) {
    return { exists: true, taskId };
  }

  return { exists: false };
}

/**
 * Store idempotency key with associated task ID
 * 存储幂等键及其关联的任务 ID
 *
 * @param userId - User ID / 用户 ID
 * @param idempotencyKey - Unique key for this request / 此请求的唯一键
 * @param taskId - Task ID to associate / 要关联的任务 ID
 */
export async function setIdempotency(
  userId: string,
  idempotencyKey: string,
  taskId: string
): Promise<void> {
  const redis = getRedis();
  const key = getIdempotencyKey(userId, idempotencyKey);

  await redis.set(key, taskId, 'EX', IDEMPOTENCY_TTL);
}

/**
 * Remove an idempotency key (for cleanup or retry)
 * 移除幂等键（用于清理或重试）
 *
 * @param userId - User ID / 用户 ID
 * @param idempotencyKey - Unique key for this request / 此请求的唯一键
 */
export async function removeIdempotency(
  userId: string,
  idempotencyKey: string
): Promise<void> {
  const redis = getRedis();
  const key = getIdempotencyKey(userId, idempotencyKey);

  await redis.del(key);
}

/**
 * Generate an idempotency key from request data
 * 从请求数据生成幂等键
 *
 * Uses a simple hash of the stringified data.
 * 使用字符串化数据的简单哈希。
 *
 * @param data - Request data to hash / 要哈希的请求数据
 * @returns Idempotency key / 幂等键
 */
export function generateIdempotencyKey(data: Record<string, unknown>): string {
  const str = JSON.stringify(data);
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash).toString(36);
}
