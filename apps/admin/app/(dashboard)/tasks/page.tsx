/**
 * @fileoverview Task Management Page
 * @fileoverview 任务管理页面
 *
 * Admin page for monitoring and managing BullMQ tasks.
 * Shows queue statistics and allows searching/filtering tasks.
 * 监控和管理 BullMQ 任务的管理页面。
 * 显示队列统计信息并允许搜索/过滤任务。
 *
 * @module apps/admin/app/tasks/page
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { db, tasks, tools, users, desc, eq, and, like, or, count, sql } from '@magiworld/db';
import { getQueueStats } from '@magiworld/queue';
import { TaskList, TaskListSkeleton } from './task-list';
import { TaskFilters, TaskFiltersSkeleton } from './task-filters';

export const dynamic = 'force-dynamic';

interface SearchParams {
  status?: string;
  toolId?: string;
  userId?: string;
  search?: string;
  page?: string;
}

/**
 * Fetch queue statistics from BullMQ.
 */
async function getQueueStatistics() {
  try {
    const stats = await getQueueStats('default');
    return stats;
  } catch (error) {
    console.error('Failed to fetch queue stats:', error);
    return null;
  }
}

/**
 * Fetch task counts by status.
 */
async function getTaskCounts() {
  const results = await db
    .select({
      status: tasks.status,
      count: count(),
    })
    .from(tasks)
    .groupBy(tasks.status);

  const counts: Record<string, number> = {
    pending: 0,
    processing: 0,
    success: 0,
    failed: 0,
  };

  results.forEach((r) => {
    counts[r.status] = Number(r.count);
  });

  return counts;
}

/**
 * Fetch filtered tasks from database.
 */
async function getTasks(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1');
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (searchParams.status) {
    conditions.push(eq(tasks.status, searchParams.status as 'pending' | 'processing' | 'success' | 'failed'));
  }

  if (searchParams.toolId) {
    conditions.push(eq(tasks.toolId, searchParams.toolId));
  }

  if (searchParams.userId) {
    conditions.push(eq(tasks.userId, searchParams.userId));
  }

  if (searchParams.search) {
    const searchTerm = `%${searchParams.search}%`;
    conditions.push(
      or(
        like(tasks.id, searchTerm),
        like(tasks.bullJobId, searchTerm),
        sql`${tasks.inputParams}::text ILIKE ${searchTerm}`
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [taskResults, totalResult] = await Promise.all([
    db
      .select({
        task: tasks,
        toolSlug: tools.slug,
        userEmail: users.email,
      })
      .from(tasks)
      .leftJoin(tools, eq(tasks.toolId, tools.id))
      .leftJoin(users, eq(tasks.userId, users.id))
      .where(whereClause)
      .orderBy(desc(tasks.createdAt))
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: count() })
      .from(tasks)
      .where(whereClause),
  ]);

  // Serialize dates to strings for client component
  const serializedTasks = taskResults.map(({ task, toolSlug, userEmail }) => ({
    task: {
      ...task,
      startedAt: task.startedAt?.toISOString() ?? null,
      completedAt: task.completedAt?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    },
    toolSlug,
    userEmail,
  }));

  return {
    tasks: serializedTasks,
    total: Number(totalResult[0]?.count || 0),
    page,
    pageSize,
    totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / pageSize),
  };
}

/**
 * Fetch all tools for filter dropdown.
 */
async function getTools() {
  return db.select({ id: tools.id, slug: tools.slug }).from(tools).orderBy(tools.slug);
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const [queueStats, taskCounts, taskData, toolsList] = await Promise.all([
    getQueueStatistics(),
    getTaskCounts(),
    getTasks(params),
    getTools(),
  ]);
  const pageKey = JSON.stringify(params);

  return (
    <div key={pageKey} className="p-8">
      {/* Page Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Task Monitor</h1>
          <p className="text-muted-foreground">
            Monitor BullMQ queue status and manage tasks across the system.
          </p>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          View BullMQ Jobs
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </Link>
      </div>

      {/* BullMQ Queue Stats */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Queue Status</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <QueueStatsCard label="Waiting" value={queueStats?.waiting ?? 0} variant="warning" />
          <QueueStatsCard label="Active" value={queueStats?.active ?? 0} variant="info" />
          <QueueStatsCard label="Completed" value={queueStats?.completed ?? 0} variant="success" />
          <QueueStatsCard label="Failed" value={queueStats?.failed ?? 0} variant="error" />
          <QueueStatsCard label="Delayed" value={queueStats?.delayed ?? 0} variant="muted" />
          <QueueStatsCard label="Paused" value={queueStats?.paused ?? 0} variant="muted" />
        </div>
      </div>

      {/* Database Task Stats */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Task Statistics</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatsCard label="Pending" value={taskCounts.pending} variant="warning" />
          <StatsCard label="Processing" value={taskCounts.processing} variant="info" />
          <StatsCard label="Success" value={taskCounts.success} variant="success" />
          <StatsCard label="Failed" value={taskCounts.failed} variant="error" />
        </div>
      </div>

      {/* Filters */}
      <Suspense fallback={<TaskFiltersSkeleton />}>
        <TaskFilters tools={toolsList} currentFilters={params} />
      </Suspense>

      {/* Task List */}
      <Suspense fallback={<TaskListSkeleton />}>
        <TaskList
          tasks={taskData.tasks}
          total={taskData.total}
          page={taskData.page}
          pageSize={taskData.pageSize}
          totalPages={taskData.totalPages}
        />
      </Suspense>
    </div>
  );
}

/**
 * Queue stats card component.
 */
function QueueStatsCard({
  label,
  value,
  variant = 'default',
}: {
  label: string;
  value: number;
  variant?: 'default' | 'warning' | 'info' | 'success' | 'error' | 'muted';
}) {
  const variantStyles = {
    default: 'bg-card border',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    muted: 'bg-muted/50 border',
  };

  return (
    <div className={`rounded-lg p-3 border ${variantStyles[variant]}`}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
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
  variant?: 'default' | 'warning' | 'info' | 'success' | 'error' | 'muted';
}) {
  const variantStyles = {
    default: 'bg-card border',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    muted: 'bg-muted/50 border',
  };

  return (
    <div className={`rounded-lg p-4 ${variantStyles[variant]}`}>
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
