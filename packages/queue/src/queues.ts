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
 * @param name - Base queue name
 * @returns Prefixed queue name (e.g., "admin_default" or "default" if no prefix)
 * Note: Uses underscore separator because BullMQ doesn't allow colons in queue names
 */
export function getPrefixedQueueName(name: QueueName): string {
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
 * @param name - Base queue name
 * @param options - Optional queue options
 */
export function getQueue(
  name: QueueName,
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
 * Add a task job to the appropriate queue
 * 将任务作业添加到适当的队列
 *
 * Uses the default queue for all tasks since tool processors determine providers.
 * 对所有任务使用默认队列，因为工具处理器决定提供商。
 *
 * @param jobData - Task job data / 任务作业数据
 * @param queueName - Optional queue name override / 可选的队列名称覆盖
 * @returns Job ID / 作业 ID
 */
export async function enqueueTask(
  jobData: TaskJobData,
  queueName?: QueueName
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
