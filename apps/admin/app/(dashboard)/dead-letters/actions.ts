/**
 * @fileoverview Dead Letter Queue Server Actions
 * @fileoverview 死信队列服务器操作
 *
 * Server actions for managing dead letter queue entries.
 * 管理死信队列条目的服务器操作。
 *
 * @module apps/admin/app/dead-letters/actions
 */

'use server';

import { revalidatePath } from 'next/cache';
import { db, deadLetterTasks, tasks, eq } from '@magiworld/db';

/**
 * Archive a dead letter entry.
 * Marks the entry as archived (no further action needed).
 *
 * @param id - Dead letter task ID
 * @param notes - Optional review notes
 */
export async function archiveDeadLetter(id: string, notes?: string) {
  await db
    .update(deadLetterTasks)
    .set({
      status: 'archived',
      reviewNotes: notes || null,
    })
    .where(eq(deadLetterTasks.id, id));

  revalidatePath('/dead-letters');
}

/**
 * Retry a dead letter entry.
 * Re-enqueues the original task for processing.
 *
 * @param id - Dead letter task ID
 */
export async function retryDeadLetter(id: string) {
  // Get the dead letter entry
  const [dlq] = await db
    .select()
    .from(deadLetterTasks)
    .where(eq(deadLetterTasks.id, id))
    .limit(1);

  if (!dlq) {
    throw new Error('Dead letter entry not found');
  }

  if (!dlq.originalTaskId) {
    throw new Error('Original task not found');
  }

  // Reset the original task to pending
  await db
    .update(tasks)
    .set({
      status: 'pending',
      attemptsMade: 0,
      errorMessage: null,
      startedAt: null,
      completedAt: null,
    })
    .where(eq(tasks.id, dlq.originalTaskId));

  // Mark the dead letter as retried
  await db
    .update(deadLetterTasks)
    .set({
      status: 'retried',
      retriedAt: new Date(),
    })
    .where(eq(deadLetterTasks.id, id));

  // TODO: Re-enqueue to BullMQ
  // This would require importing the queue package
  // For now, just reset the task status - worker can pick it up

  revalidatePath('/dead-letters');
}

/**
 * Archive multiple dead letter entries.
 *
 * @param ids - Array of dead letter task IDs
 */
export async function archiveMultiple(ids: string[]) {
  for (const id of ids) {
    await archiveDeadLetter(id);
  }

  revalidatePath('/dead-letters');
}
