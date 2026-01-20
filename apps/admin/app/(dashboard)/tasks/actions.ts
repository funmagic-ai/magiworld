/**
 * @fileoverview Task Actions
 * @fileoverview 任务操作
 *
 * Server actions for managing tasks (retry, cancel, etc.)
 * 管理任务的服务器操作（重试、取消等）
 *
 * @module apps/admin/app/tasks/actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { db, tasks, eq } from '@magiworld/db';
import { getQueue } from '@magiworld/queue';

/**
 * Retry a failed task by re-adding it to the queue.
 * 通过重新添加到队列来重试失败的任务。
 */
export async function retryTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the task
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    if (task.status !== 'failed') {
      return { success: false, error: 'Only failed tasks can be retried' };
    }

    // Update task status to pending
    await db
      .update(tasks)
      .set({
        status: 'pending',
        errorMessage: null,
        progress: 0,
        completedAt: null,
      })
      .where(eq(tasks.id, taskId));

    // Re-queue the task
    const queue = getQueue('default');
    await queue.add(taskId, {
      taskId,
      userId: task.userId,
      toolId: task.toolId,
      toolSlug: '', // Will be resolved by worker
      inputParams: task.inputParams as Record<string, unknown>,
      priority: task.priority ?? 5,
      idempotencyKey: task.idempotencyKey || undefined,
      requestId: task.requestId || undefined,
    }, {
      jobId: `${taskId}-retry-${Date.now()}`,
      priority: task.priority ?? 5,
    });

    revalidatePath('/tasks');
    return { success: true };
  } catch (error) {
    console.error('Failed to retry task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Cancel a pending or processing task.
 * 取消待处理或正在处理的任务。
 */
export async function cancelTask(taskId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the task
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId)).limit(1);

    if (!task) {
      return { success: false, error: 'Task not found' };
    }

    if (task.status !== 'pending' && task.status !== 'processing') {
      return { success: false, error: 'Only pending or processing tasks can be cancelled' };
    }

    // Try to remove from queue if pending
    if (task.bullJobId) {
      try {
        const queue = getQueue('default');
        const job = await queue.getJob(task.bullJobId);
        if (job) {
          await job.remove();
        }
      } catch (queueError) {
        console.warn('Could not remove job from queue:', queueError);
        // Continue anyway - update DB status
      }
    }

    // Update task status to failed with cancel message
    await db
      .update(tasks)
      .set({
        status: 'failed',
        errorMessage: 'Task cancelled by admin',
        completedAt: new Date(),
      })
      .where(eq(tasks.id, taskId));

    revalidatePath('/tasks');
    return { success: true };
  } catch (error) {
    console.error('Failed to cancel task:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
