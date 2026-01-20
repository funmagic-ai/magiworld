/**
 * @fileoverview Worker Entry Point
 * @fileoverview Worker 入口点
 *
 * Main entry point for the task processing worker.
 * Routes jobs to tool processors based on tool slug.
 * Tool processors determine which provider(s) to use and fetch credentials from DB.
 * 任务处理 Worker 的主入口点。
 * 根据工具 slug 将任务路由到工具处理器。
 * 工具处理器决定使用哪个提供商并从数据库获取凭据。
 *
 * @module @magiworld/worker
 */

import { Worker, Job } from 'bullmq';
import {
  getRedis,
  closeRedis,
  QueueNames,
  TaskJobData,
  TaskJobResult,
  getPrefixedQueueName,
  QueueName,
} from '@magiworld/queue';
import { createLogger } from '@magiworld/utils/logger';
import { config } from './config';
import { setupGracefulShutdown } from './shutdown';
import { getToolProcessorWrapper, isToolSupported } from './tools/wrapper';
import { handleDeadLetter, shouldMoveToDlq } from './dlq';

const logger = createLogger('worker');

/**
 * Process a task job using the appropriate tool processor
 * 使用适当的工具处理器处理任务作业
 *
 * @param job - BullMQ job / BullMQ 作业
 */
async function processJob(job: Job<TaskJobData, TaskJobResult>): Promise<TaskJobResult> {
  const { taskId, toolSlug } = job.data;

  logger.info(`Processing job ${job.id}`, {
    taskId,
    tool: toolSlug,
  });

  // Check if tool is supported
  if (!isToolSupported(toolSlug)) {
    logger.error(`Unsupported tool: ${toolSlug}`, { taskId });
    return {
      success: false,
      error: `Unsupported tool: ${toolSlug}`,
    };
  }

  // Get the tool processor wrapper and execute
  const processor = getToolProcessorWrapper(toolSlug);
  return processor.process(job);
}

/**
 * Get list of queues to listen to
 * 获取要监听的队列列表
 *
 * Simple approach: Just use 'default' queue.
 * Queue prefix (QUEUE_PREFIX env var) separates web vs admin environments.
 * - Web: 'default' queue
 * - Admin: 'admin_default' queue (with QUEUE_PREFIX=admin)
 */
function getQueuesToListen(): string[] {
  // Simple: just use default queue
  // The prefix is applied separately by getPrefixedQueueName
  return ['default'];
}

/**
 * Create workers for all queues (with prefix applied)
 * Supports dynamic queue names discovered from database or env var
 */
function createWorkers(queues: string[]): Worker<TaskJobData, TaskJobResult>[] {
  const redis = getRedis();
  const workers: Worker<TaskJobData, TaskJobResult>[] = [];

  for (const baseQueueName of queues) {
    const prefixedName = getPrefixedQueueName(baseQueueName as QueueName);

    const worker = new Worker<TaskJobData, TaskJobResult>(prefixedName, processJob, {
      connection: redis,
      concurrency: config.WORKER_CONCURRENCY,
    });

    worker.on('completed', (job) => {
      logger.info(`[${prefixedName}] Job ${job.id} completed`);
    });

    worker.on('failed', async (job, err) => {
      logger.error(`[${prefixedName}] Job ${job?.id} failed`, {
        error: err.message,
        attempts: job?.attemptsMade,
      });

      if (job && shouldMoveToDlq(job)) {
        await handleDeadLetter(job, err);
      }
    });

    worker.on('error', (err) => {
      logger.error(`[${prefixedName}] Worker error`, { error: err.message });
    });

    workers.push(worker);
    logger.info(`Created worker for queue: ${prefixedName}`);
  }

  return workers;
}

/**
 * Main function
 */
async function main() {
  logger.info('Starting worker...', {
    concurrency: config.WORKER_CONCURRENCY,
    nodeEnv: config.NODE_ENV,
    queuePrefix: config.QUEUE_PREFIX || '(none)',
  });

  // Test Redis connection
  const redis = getRedis();
  try {
    await redis.ping();
    logger.info('Redis connection successful');
  } catch (error) {
    logger.error('Failed to connect to Redis', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }

  // Get queues to listen to
  const queues = getQueuesToListen();
  logger.info(`Will listen to queues: ${queues.join(', ')}`);

  // Create workers
  const workers = createWorkers(queues);

  // Setup graceful shutdown
  setupGracefulShutdown(workers, async () => {
    await closeRedis();
  });

  logger.info(`Worker started with ${workers.length} queue processors`);
}

// Start the worker
main().catch((error) => {
  logger.error('Worker failed to start', {
    error: error instanceof Error ? error.message : 'Unknown error',
  });
  process.exit(1);
});
