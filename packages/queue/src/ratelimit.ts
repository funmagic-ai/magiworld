/**
 * @fileoverview User Rate Limiting
 * @fileoverview 用户限流
 *
 * Redis-based user concurrency limiting for task creation.
 * 基于 Redis 的用户任务创建并发限制。
 *
 * @module @magiworld/queue/ratelimit
 */

import { getRedis } from './redis';

/**
 * Default maximum concurrent tasks per user
 * 每个用户的默认最大并发任务数
 */
export const DEFAULT_MAX_CONCURRENT_TASKS = 5;

/**
 * TTL for user task counter in seconds (1 hour)
 * 用户任务计数器的 TTL（1 小时）
 */
const USER_TASKS_TTL = 3600;

/**
 * Redis key prefix for user active task count
 * 用户活跃任务计数的 Redis 键前缀
 */
const USER_TASKS_KEY_PREFIX = 'user:tasks:active:';

/**
 * Get the Redis key for a user's active task count
 * 获取用户活跃任务计数的 Redis 键
 *
 * @param userId - User ID / 用户 ID
 * @returns Redis key / Redis 键
 */
function getUserTasksKey(userId: string): string {
  return `${USER_TASKS_KEY_PREFIX}${userId}`;
}

/**
 * Check if a user can create a new task based on concurrency limit
 * 根据并发限制检查用户是否可以创建新任务
 *
 * @param userId - User ID / 用户 ID
 * @param maxConcurrent - Maximum concurrent tasks (default: 5) / 最大并发任务数（默认：5）
 * @returns Object with allowed status and current count / 包含允许状态和当前计数的对象
 */
export async function checkUserConcurrency(
  userId: string,
  maxConcurrent: number = DEFAULT_MAX_CONCURRENT_TASKS
): Promise<{ allowed: boolean; current: number; max: number }> {
  const redis = getRedis();
  const key = getUserTasksKey(userId);

  const currentStr = await redis.get(key);
  const current = currentStr ? parseInt(currentStr, 10) : 0;

  return {
    allowed: current < maxConcurrent,
    current,
    max: maxConcurrent,
  };
}

/**
 * Increment user's active task count
 * 增加用户的活跃任务计数
 *
 * Call this when a task is created/started.
 * 在任务创建/开始时调用此函数。
 *
 * @param userId - User ID / 用户 ID
 * @returns New count / 新计数
 */
export async function incrementUserTasks(userId: string): Promise<number> {
  const redis = getRedis();
  const key = getUserTasksKey(userId);

  const newCount = await redis.incr(key);

  // Set TTL on first increment
  if (newCount === 1) {
    await redis.expire(key, USER_TASKS_TTL);
  }

  return newCount;
}

/**
 * Decrement user's active task count
 * 减少用户的活跃任务计数
 *
 * Call this when a task completes or fails.
 * 在任务完成或失败时调用此函数。
 *
 * @param userId - User ID / 用户 ID
 * @returns New count (minimum 0) / 新计数（最小为 0）
 */
export async function decrementUserTasks(userId: string): Promise<number> {
  const redis = getRedis();
  const key = getUserTasksKey(userId);

  const newCount = await redis.decr(key);

  // Ensure count doesn't go negative
  if (newCount < 0) {
    await redis.set(key, '0', 'EX', USER_TASKS_TTL);
    return 0;
  }

  // Refresh TTL
  await redis.expire(key, USER_TASKS_TTL);

  return newCount;
}

/**
 * Get user's current active task count
 * 获取用户当前的活跃任务计数
 *
 * @param userId - User ID / 用户 ID
 * @returns Current count / 当前计数
 */
export async function getUserTaskCount(userId: string): Promise<number> {
  const redis = getRedis();
  const key = getUserTasksKey(userId);

  const countStr = await redis.get(key);
  return countStr ? parseInt(countStr, 10) : 0;
}

/**
 * Reset user's active task count (for admin/debugging)
 * 重置用户的活跃任务计数（用于管理员/调试）
 *
 * @param userId - User ID / 用户 ID
 */
export async function resetUserTaskCount(userId: string): Promise<void> {
  const redis = getRedis();
  const key = getUserTasksKey(userId);
  await redis.del(key);
}
