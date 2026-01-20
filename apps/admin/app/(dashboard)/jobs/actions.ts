/**
 * @fileoverview Job Actions
 * @fileoverview 作业操作
 *
 * Server actions for managing BullMQ jobs across all queues.
 * 管理所有队列中 BullMQ 作业的服务器操作。
 *
 * @module apps/admin/app/jobs/actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import {
  retryQueueJobByFullName,
  removeQueueJobByFullName,
  cleanQueueJobsByFullName,
} from '@magiworld/queue';

/**
 * Retry a failed job in the queue.
 * 重试队列中的失败作业。
 *
 * @param queueName - Full queue name (e.g., 'admin_default', 'default')
 * @param jobId - Job ID to retry
 */
export async function retryJob(
  queueName: string,
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await retryQueueJobByFullName(queueName, jobId);
    if (!result) {
      return { success: false, error: 'Job not found' };
    }
    revalidatePath('/jobs');
    return { success: true };
  } catch (error) {
    console.error('Failed to retry job:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Remove a job from the queue.
 * 从队列中删除作业。
 *
 * @param queueName - Full queue name (e.g., 'admin_default', 'default')
 * @param jobId - Job ID to remove
 */
export async function removeJob(
  queueName: string,
  jobId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await removeQueueJobByFullName(queueName, jobId);
    if (!result) {
      return { success: false, error: 'Job not found' };
    }
    revalidatePath('/jobs');
    return { success: true };
  } catch (error) {
    console.error('Failed to remove job:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean old completed jobs from a queue.
 * 清理队列中的旧已完成作业。
 *
 * @param queueName - Full queue name (e.g., 'admin_default', 'default')
 * @param gracePeriodHours - Hours to keep jobs (default: 24)
 */
export async function cleanCompletedJobs(
  queueName: string,
  gracePeriodHours = 24
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const graceMs = gracePeriodHours * 60 * 60 * 1000;
    const removedIds = await cleanQueueJobsByFullName(queueName, graceMs, 'completed');
    revalidatePath('/jobs');
    return { success: true, count: removedIds.length };
  } catch (error) {
    console.error('Failed to clean completed jobs:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Clean old failed jobs from a queue.
 * 清理队列中的旧失败作业。
 *
 * @param queueName - Full queue name (e.g., 'admin_default', 'default')
 * @param gracePeriodHours - Hours to keep jobs (default: 72)
 */
export async function cleanFailedJobs(
  queueName: string,
  gracePeriodHours = 72
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const graceMs = gracePeriodHours * 60 * 60 * 1000;
    const removedIds = await cleanQueueJobsByFullName(queueName, graceMs, 'failed');
    revalidatePath('/jobs');
    return { success: true, count: removedIds.length };
  } catch (error) {
    console.error('Failed to clean failed jobs:', error);
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
