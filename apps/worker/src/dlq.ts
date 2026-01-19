/**
 * @fileoverview Dead Letter Queue Handler
 * @fileoverview 死信队列处理器
 *
 * Handles tasks that have exhausted all retry attempts.
 * 处理已用尽所有重试次数的任务。
 *
 * @module @magiworld/worker/dlq
 */

import type { Job } from 'bullmq';
import { db, deadLetterTasks, tasks, eq } from '@magiworld/db';
import { decrementUserTasks, type TaskJobData } from '@magiworld/queue';
import { createLogger } from '@magiworld/utils/logger';

const logger = createLogger('dlq');

/**
 * Handle a job that has failed all retries
 * 处理已用尽所有重试次数的作业
 *
 * @param job - The failed BullMQ job / 失败的 BullMQ 作业
 * @param error - The final error / 最终错误
 */
export async function handleDeadLetter(
  job: Job<TaskJobData>,
  error: Error
): Promise<void> {
  const { taskId, userId } = job.data;

  logger.warn(`Moving task to DLQ`, {
    taskId,
    jobId: job.id,
    queue: job.queueName,
    attempts: job.attemptsMade,
    error: error.message,
  });

  try {
    // 1. Insert into dead_letter_tasks table
    await db.insert(deadLetterTasks).values({
      originalTaskId: taskId,
      queue: job.queueName,
      errorMessage: error.message,
      errorStack: error.stack,
      attemptsMade: job.attemptsMade,
      payload: job.data as unknown as Record<string, unknown>,
      status: 'pending',
    });

    // 2. Update original task status to 'failed'
    await db
      .update(tasks)
      .set({
        status: 'failed',
        errorMessage: `Failed after ${job.attemptsMade} attempts: ${error.message}`,
        attemptsMade: job.attemptsMade,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    // 3. Decrement user's active task count
    await decrementUserTasks(userId);

    // 4. Log for monitoring
    logger.error(`Task moved to DLQ`, {
      taskId,
      queue: job.queueName,
      error: error.message,
      attempts: job.attemptsMade,
    });
  } catch (dlqError) {
    logger.error(`Failed to move task to DLQ`, {
      taskId,
      error: dlqError instanceof Error ? dlqError.message : 'Unknown error',
    });
  }
}

/**
 * Check if a job should be moved to DLQ
 * 检查作业是否应该移到死信队列
 *
 * @param job - The failed job / 失败的作业
 * @returns Whether the job should be moved to DLQ / 作业是否应该移到死信队列
 */
export function shouldMoveToDlq(job: Job<TaskJobData>): boolean {
  const maxAttempts = job.opts.attempts ?? 3;
  return job.attemptsMade >= maxAttempts;
}
