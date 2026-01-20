/**
 * @fileoverview BullMQ Queue Definitions
 * @fileoverview BullMQ 队列定义
 *
 * Queue factory and configuration for task processing.
 * 任务处理的队列工厂和配置。
 *
 * @module @magiworld/queue/queues
 */

import { Queue, QueueOptions } from 'bullmq';
import { getRedisConnection } from './redis';
import { getQueuePrefix, getQueueEnvironment } from './config';
import {
  QueueNames,
  QueueName,
  DynamicQueueName,
  DEFAULT_QUEUE_CONFIG,
  TaskJobData,
  TaskJobResult,
} from './types';

/**
 * Queue instances cache (keyed by prefixed name)
 */
const queues = new Map<string, Queue<TaskJobData, TaskJobResult>>();

/**
 * Get prefixed queue name
 * @param name - Base queue name or dynamic provider slug
 * @returns Prefixed queue name (e.g., "admin_default" or "default" if no prefix)
 * Note: Uses underscore separator because BullMQ doesn't allow colons in queue names
 */
export function getPrefixedQueueName(name: DynamicQueueName): string {
  const prefix = getQueuePrefix();
  return prefix ? `${prefix}_${name}` : name;
}

/**
 * Get default queue options
 * Uses 'queue' connection type for BullMQ operations
 */
function getDefaultQueueOptions(): QueueOptions {
  return {
    connection: getRedisConnection('queue', 'bullmq'),
    defaultJobOptions: {
      attempts: DEFAULT_QUEUE_CONFIG.attempts,
      backoff: DEFAULT_QUEUE_CONFIG.backoff,
      removeOnComplete: DEFAULT_QUEUE_CONFIG.removeOnComplete,
      removeOnFail: DEFAULT_QUEUE_CONFIG.removeOnFail,
    },
  };
}

/**
 * Get or create a queue by name (with prefix applied)
 * @param name - Base queue name or dynamic provider slug
 * @param options - Optional queue options
 */
export function getQueue(
  name: DynamicQueueName,
  options?: Partial<QueueOptions>
): Queue<TaskJobData, TaskJobResult> {
  const prefixedName = getPrefixedQueueName(name);
  let queue = queues.get(prefixedName);

  if (!queue) {
    const defaultOptions = getDefaultQueueOptions();
    queue = new Queue<TaskJobData, TaskJobResult>(prefixedName, {
      ...defaultOptions,
      ...options,
    });

    const env = getQueueEnvironment();
    queue.on('error', (err) => {
      console.error(`[Queue:${env}:${prefixedName}] Error:`, err.message);
    });

    queues.set(prefixedName, queue);
    console.log(`[Queue:${env}] Created queue: ${prefixedName}`);
  }

  return queue;
}

/**
 * Get queue for a specific provider
 * 获取特定供应商的队列
 *
 * @param providerSlug - Provider slug (fal_ai, google, openai)
 */
export function getProviderQueue(
  providerSlug: string
): Queue<TaskJobData, TaskJobResult> {
  const queueName = (QueueNames[providerSlug.toUpperCase() as keyof typeof QueueNames] ||
    QueueNames.DEFAULT) as QueueName;
  return getQueue(queueName);
}

/**
 * Add a task job to the queue
 * 将任务作业添加到队列
 *
 * All tasks go to the DEFAULT queue.
 * Queue prefix (set via QUEUE_PREFIX env var) separates web vs admin.
 * 所有任务都进入 DEFAULT 队列。
 * 队列前缀（通过 QUEUE_PREFIX 环境变量设置）分隔 web 和 admin。
 *
 * @param jobData - Task job data / 任务作业数据
 * @param queueName - Optional queue name override (defaults to DEFAULT) / 可选的队列名称覆盖
 * @returns Job ID / 作业 ID
 */
export async function enqueueTask(
  jobData: TaskJobData,
  queueName?: DynamicQueueName
): Promise<string> {
  const queue = getQueue(queueName || QueueNames.DEFAULT);

  const job = await queue.add(jobData.taskId, jobData, {
    priority: jobData.priority,
    jobId: jobData.taskId, // Use task ID as job ID for easy lookup
  });

  console.log(
    `[Queue] Enqueued task ${jobData.taskId} (tool: ${jobData.toolSlug}) to ${queue.name} with priority ${jobData.priority}`
  );

  return job.id!;
}

/**
 * Get all registered queues
 * 获取所有已注册的队列
 */
export function getAllQueues(): Queue<TaskJobData, TaskJobResult>[] {
  return Array.from(queues.values());
}

/**
 * Close all queues gracefully
 * 优雅地关闭所有队列
 */
export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map(async (queue) => {
    await queue.close();
    console.log(`[Queue] Closed queue: ${queue.name}`);
  });

  await Promise.all(closePromises);
  queues.clear();
}

/**
 * Get queue statistics
 * @param name - Base queue name (prefix applied automatically)
 */
export async function getQueueStats(name: QueueName) {
  const queue = getQueue(name);
  const counts = await queue.getJobCounts();

  return {
    name: queue.name, // Returns prefixed name
    active: counts.active,
    waiting: counts.waiting,
    completed: counts.completed,
    failed: counts.failed,
    delayed: counts.delayed,
    paused: counts.paused,
  };
}

/**
 * Get statistics for all queues (with prefix applied)
 */
export async function getAllQueueStats() {
  const stats = await Promise.all(
    Object.values(QueueNames).map((name) => getQueueStats(name as QueueName))
  );
  return stats;
}

/**
 * Job state types for querying
 */
export type JobState = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

/**
 * Serialized job data for API responses
 * BullMQ JobProgress = number | object | boolean | string
 */
export interface SerializedJob {
  id: string;
  name: string;
  data: TaskJobData;
  progress: number | string | object | boolean;
  attemptsMade: number;
  timestamp: number;
  finishedOn?: number;
  processedOn?: number;
  failedReason?: string;
  state: JobState;
}

/**
 * Get jobs from queue by state
 * 按状态获取队列中的作业
 *
 * @param name - Queue name
 * @param states - Job states to fetch
 * @param start - Start index for pagination
 * @param end - End index for pagination
 */
export async function getQueueJobs(
  name: QueueName,
  states: JobState[] = ['waiting', 'active', 'completed', 'failed', 'delayed'],
  start = 0,
  end = 49
): Promise<SerializedJob[]> {
  const queue = getQueue(name);
  const jobs = await queue.getJobs(states, start, end);

  return Promise.all(
    jobs.map(async (job) => {
      const state = await job.getState();
      return {
        id: job.id || '',
        name: job.name,
        data: job.data,
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
        failedReason: job.failedReason,
        state: state as JobState,
      };
    })
  );
}

/**
 * Remove a job from queue
 * 从队列中删除作业
 */
export async function removeQueueJob(name: QueueName, jobId: string): Promise<boolean> {
  const queue = getQueue(name);
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
    return true;
  }
  return false;
}

/**
 * Retry a failed job
 * 重试失败的作业
 */
export async function retryQueueJob(name: QueueName, jobId: string): Promise<boolean> {
  const queue = getQueue(name);
  const job = await queue.getJob(jobId);
  if (job) {
    await job.retry();
    return true;
  }
  return false;
}

/**
 * Clean old jobs from queue
 * 清理队列中的旧作业
 *
 * @param name - Queue name
 * @param grace - Grace period in ms (jobs older than this will be removed)
 * @param status - Job status to clean ('completed' | 'failed')
 * @param limit - Max number of jobs to remove
 */
export async function cleanQueueJobs(
  name: QueueName,
  grace: number,
  status: 'completed' | 'failed',
  limit = 1000
): Promise<string[]> {
  const queue = getQueue(name);
  return queue.clean(grace, limit, status);
}

/**
 * Discover all BullMQ queues from Redis
 * 从 Redis 发现所有 BullMQ 队列
 *
 * Scans Redis for BullMQ queue keys and extracts unique queue names.
 * Returns both prefixed queues (admin_default, etc.) and unprefixed queues (default, etc.).
 * 扫描 Redis 中的 BullMQ 队列键并提取唯一的队列名称。
 * 返回带前缀的队列（admin_default等）和不带前缀的队列（default等）。
 */
export async function discoverAllQueues(): Promise<string[]> {
  const redis = getRedisConnection('queue', 'discover');
  const queueNames = new Set<string>();

  // Scan for BullMQ queue keys (pattern: bull:<queue-name>:*)
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'bull:*:meta', 'COUNT', 100);
    cursor = nextCursor;

    for (const key of keys) {
      // Extract queue name from "bull:<queue-name>:meta"
      const match = key.match(/^bull:([^:]+):meta$/);
      if (match) {
        queueNames.add(match[1]);
      }
    }
  } while (cursor !== '0');

  // Sort queue names: admin queues first, then by name
  return Array.from(queueNames).sort((a, b) => {
    const aIsAdmin = a.startsWith('admin_');
    const bIsAdmin = b.startsWith('admin_');
    if (aIsAdmin && !bIsAdmin) return -1;
    if (!aIsAdmin && bIsAdmin) return 1;
    return a.localeCompare(b);
  });
}

/**
 * Get or create a queue by full name (no prefix applied)
 * Used for accessing queues discovered via discoverAllQueues
 * 通过完整名称获取或创建队列（不应用前缀）
 * 用于访问通过 discoverAllQueues 发现的队列
 */
export function getQueueByFullName(
  fullName: string
): Queue<TaskJobData, TaskJobResult> {
  let queue = queues.get(fullName);

  if (!queue) {
    const defaultOptions = getDefaultQueueOptions();
    queue = new Queue<TaskJobData, TaskJobResult>(fullName, defaultOptions);

    queue.on('error', (err) => {
      console.error(`[Queue:${fullName}] Error:`, err.message);
    });

    queues.set(fullName, queue);
  }

  return queue;
}

/**
 * Get queue statistics by full name (no prefix applied)
 * 通过完整名称获取队列统计信息（不应用前缀）
 */
export async function getQueueStatsByFullName(fullName: string) {
  const queue = getQueueByFullName(fullName);
  const counts = await queue.getJobCounts();

  return {
    name: queue.name,
    active: counts.active,
    waiting: counts.waiting,
    completed: counts.completed,
    failed: counts.failed,
    delayed: counts.delayed,
    paused: counts.paused,
  };
}

/**
 * Get jobs from queue by full name (no prefix applied)
 * 通过完整名称从队列获取作业（不应用前缀）
 */
export async function getQueueJobsByFullName(
  fullName: string,
  states: JobState[] = ['waiting', 'active', 'completed', 'failed', 'delayed'],
  start = 0,
  end = 49
): Promise<SerializedJob[]> {
  const queue = getQueueByFullName(fullName);
  const jobs = await queue.getJobs(states, start, end);

  return Promise.all(
    jobs.map(async (job) => {
      const state = await job.getState();
      return {
        id: job.id || '',
        name: job.name,
        data: job.data,
        progress: job.progress,
        attemptsMade: job.attemptsMade,
        timestamp: job.timestamp,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
        failedReason: job.failedReason,
        state: state as JobState,
      };
    })
  );
}

/**
 * Remove a job from queue by full name
 * 通过完整名称从队列删除作业
 */
export async function removeQueueJobByFullName(fullName: string, jobId: string): Promise<boolean> {
  const queue = getQueueByFullName(fullName);
  const job = await queue.getJob(jobId);
  if (job) {
    await job.remove();
    return true;
  }
  return false;
}

/**
 * Retry a failed job by full queue name
 * 通过完整队列名称重试失败的作业
 */
export async function retryQueueJobByFullName(fullName: string, jobId: string): Promise<boolean> {
  const queue = getQueueByFullName(fullName);
  const job = await queue.getJob(jobId);
  if (job) {
    await job.retry();
    return true;
  }
  return false;
}

/**
 * Clean old jobs from queue by full name
 * 通过完整名称清理队列中的旧作业
 */
export async function cleanQueueJobsByFullName(
  fullName: string,
  grace: number,
  status: 'completed' | 'failed',
  limit = 1000
): Promise<string[]> {
  const queue = getQueueByFullName(fullName);
  return queue.clean(grace, limit, status);
}
