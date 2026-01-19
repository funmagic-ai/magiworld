/**
 * @fileoverview Dead Letter Queue Management Page
 * @fileoverview 死信队列管理页面
 *
 * Admin page for managing failed tasks in the dead letter queue.
 * Allows viewing, retrying, and archiving failed tasks.
 * 管理死信队列中失败任务的管理页面。
 * 允许查看、重试和归档失败任务。
 *
 * @module apps/admin/app/dead-letters/page
 */

import { db, deadLetterTasks, tasks, desc, eq } from '@magiworld/db';
import { DeadLetterList } from './dlq-list';

/**
 * Fetch dead letter tasks with related task info.
 */
async function getDeadLetterTasks() {
  const results = await db
    .select({
      dlq: deadLetterTasks,
      task: {
        id: tasks.id,
        toolId: tasks.toolId,
        userId: tasks.userId,
      },
    })
    .from(deadLetterTasks)
    .leftJoin(tasks, eq(deadLetterTasks.originalTaskId, tasks.id))
    .orderBy(desc(deadLetterTasks.createdAt))
    .limit(100);

  return results;
}

/**
 * Get summary stats for the DLQ.
 */
async function getDlqStats() {
  const all = await db
    .select({ status: deadLetterTasks.status })
    .from(deadLetterTasks);

  const pending = all.filter((r) => r.status === 'pending').length;
  const retried = all.filter((r) => r.status === 'retried').length;
  const archived = all.filter((r) => r.status === 'archived').length;

  return { total: all.length, pending, retried, archived };
}

export default async function DeadLettersPage() {
  const [dlqItems, stats] = await Promise.all([getDeadLetterTasks(), getDlqStats()]);

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Dead Letter Queue</h1>
        <p className="text-muted-foreground">
          Review and manage failed tasks. Retry or archive entries as needed.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard label="Total" value={stats.total} />
        <StatsCard label="Pending Review" value={stats.pending} variant="warning" />
        <StatsCard label="Retried" value={stats.retried} variant="info" />
        <StatsCard label="Archived" value={stats.archived} variant="muted" />
      </div>

      {/* DLQ Table */}
      <DeadLetterList items={dlqItems} />
    </div>
  );
}

/**
 * Stats card component.
 */
function StatsCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: number;
  variant?: 'default' | 'warning' | 'info' | 'muted';
}) {
  const variantStyles = {
    default: 'bg-card border',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    muted: 'bg-muted/50 border',
  };

  return (
    <div className={`rounded-lg p-4 ${variantStyles[variant]}`}>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
