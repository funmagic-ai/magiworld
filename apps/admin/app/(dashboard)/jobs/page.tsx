/**
 * @fileoverview BullMQ Jobs Page
 * @fileoverview BullMQ 作业页面
 *
 * Admin page for viewing and managing BullMQ queue jobs across ALL queues.
 * Shows actual jobs in all queues (both web and admin prefixed).
 * 查看和管理所有 BullMQ 队列作业的管理页面。
 * 显示所有队列中的实际作业（包括 web 和 admin 前缀的队列）。
 *
 * @module apps/admin/app/jobs/page
 */

import { Suspense } from 'react';
import Link from 'next/link';
import {
  discoverAllQueues,
  getQueueStatsByFullName,
  getQueueJobsByFullName,
  type JobState,
} from '@magiworld/queue';
import { JobList, JobListSkeleton } from './job-list';

export const dynamic = 'force-dynamic';

interface SearchParams {
  queue?: string;
  state?: string;
  page?: string;
}

const VALID_STATES: JobState[] = ['waiting', 'active', 'completed', 'failed', 'delayed'];

interface QueueStats {
  name: string;
  active: number;
  waiting: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
  total: number;
}

/**
 * Discover all queues and fetch their statistics.
 */
async function getAllQueueStatistics(): Promise<QueueStats[]> {
  try {
    const queueNames = await discoverAllQueues();

    if (queueNames.length === 0) {
      return [];
    }

    const statsPromises = queueNames.map(async (name) => {
      const stats = await getQueueStatsByFullName(name);
      return {
        ...stats,
        total:
          stats.active +
          stats.waiting +
          stats.completed +
          stats.failed +
          stats.delayed +
          stats.paused,
      };
    });

    return Promise.all(statsPromises);
  } catch (error) {
    console.error('Failed to fetch queue stats:', error);
    return [];
  }
}

/**
 * Fetch jobs from a specific BullMQ queue.
 */
async function getJobs(searchParams: SearchParams, availableQueues: string[]) {
  const page = parseInt(searchParams.page || '1');
  const pageSize = 50;
  const start = (page - 1) * pageSize;
  const end = start + pageSize - 1;

  const stateFilter = searchParams.state as JobState | undefined;
  const states: JobState[] =
    stateFilter && VALID_STATES.includes(stateFilter) ? [stateFilter] : VALID_STATES;

  // Use selected queue or first available queue
  const selectedQueue = searchParams.queue || availableQueues[0];

  if (!selectedQueue) {
    return {
      jobs: [],
      page,
      pageSize,
      hasMore: false,
      currentQueue: null,
    };
  }

  try {
    const jobs = await getQueueJobsByFullName(selectedQueue, states, start, end);
    // Serialize job data for client component
    const serializedJobs = jobs.map((job) => ({
      ...job,
      data: JSON.parse(JSON.stringify(job.data)),
    }));
    return {
      jobs: serializedJobs,
      page,
      pageSize,
      hasMore: jobs.length === pageSize,
      currentQueue: selectedQueue,
    };
  } catch (error) {
    console.error('Failed to fetch queue jobs:', error);
    return {
      jobs: [],
      page,
      pageSize,
      hasMore: false,
      currentQueue: selectedQueue,
    };
  }
}

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const allQueueStats = await getAllQueueStatistics();
  const availableQueues = allQueueStats.map((q) => q.name);
  const jobsData = await getJobs(params, availableQueues);

  // Calculate aggregated stats
  const aggregatedStats = allQueueStats.reduce(
    (acc, stats) => ({
      waiting: acc.waiting + stats.waiting,
      active: acc.active + stats.active,
      completed: acc.completed + stats.completed,
      failed: acc.failed + stats.failed,
      delayed: acc.delayed + stats.delayed,
      total: acc.total + stats.total,
    }),
    { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, total: 0 }
  );

  const pageKey = JSON.stringify(params);

  return (
    <div key={pageKey} className="p-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">BullMQ Jobs</h1>
        <p className="text-muted-foreground">
          View and manage BullMQ queue jobs across all queues. Showing jobs from both web and admin
          queues.
        </p>
      </div>

      {/* Aggregated Stats */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">All Queues Summary</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatsCard label="Waiting" value={aggregatedStats.waiting} variant="warning" />
          <StatsCard label="Active" value={aggregatedStats.active} variant="info" />
          <StatsCard label="Completed" value={aggregatedStats.completed} variant="success" />
          <StatsCard label="Failed" value={aggregatedStats.failed} variant="error" />
          <StatsCard label="Delayed" value={aggregatedStats.delayed} variant="muted" />
          <StatsCard label="Total" value={aggregatedStats.total} variant="default" />
        </div>
      </div>

      {/* Queue List */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Queues ({allQueueStats.length})</h2>
        {allQueueStats.length === 0 ? (
          <div className="rounded-lg border bg-muted/50 p-8 text-center text-muted-foreground">
            No queues found in Redis. Queues are created when jobs are added.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allQueueStats.map((stats) => (
              <QueueCard
                key={stats.name}
                stats={stats}
                isSelected={stats.name === jobsData.currentQueue}
                currentState={params.state}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Queue Stats & State Filter */}
      {jobsData.currentQueue && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">
            Queue: <code className="bg-muted px-2 py-1 rounded text-base">{jobsData.currentQueue}</code>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {(() => {
              const currentStats = allQueueStats.find((q) => q.name === jobsData.currentQueue);
              return (
                <>
                  <StateCard
                    label="Waiting"
                    value={currentStats?.waiting ?? 0}
                    state="waiting"
                    currentQueue={jobsData.currentQueue}
                    currentState={params.state}
                  />
                  <StateCard
                    label="Active"
                    value={currentStats?.active ?? 0}
                    state="active"
                    currentQueue={jobsData.currentQueue}
                    currentState={params.state}
                  />
                  <StateCard
                    label="Completed"
                    value={currentStats?.completed ?? 0}
                    state="completed"
                    currentQueue={jobsData.currentQueue}
                    currentState={params.state}
                  />
                  <StateCard
                    label="Failed"
                    value={currentStats?.failed ?? 0}
                    state="failed"
                    currentQueue={jobsData.currentQueue}
                    currentState={params.state}
                  />
                  <StateCard
                    label="Delayed"
                    value={currentStats?.delayed ?? 0}
                    state="delayed"
                    currentQueue={jobsData.currentQueue}
                    currentState={params.state}
                  />
                  <StateCard
                    label="All"
                    value={currentStats?.total ?? 0}
                    state=""
                    currentQueue={jobsData.currentQueue}
                    currentState={params.state}
                  />
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Job List */}
      <Suspense fallback={<JobListSkeleton />}>
        <JobList
          jobs={jobsData.jobs}
          page={jobsData.page}
          hasMore={jobsData.hasMore}
          currentState={params.state}
          currentQueue={jobsData.currentQueue || undefined}
        />
      </Suspense>
    </div>
  );
}

/**
 * Stats card component for aggregated stats.
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
    <div className={`rounded-lg p-3 border ${variantStyles[variant]}`}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

/**
 * Queue card component - clickable to select queue.
 */
function QueueCard({
  stats,
  isSelected,
  currentState,
}: {
  stats: QueueStats;
  isSelected: boolean;
  currentState?: string;
}) {
  const href = currentState
    ? `/jobs?queue=${encodeURIComponent(stats.name)}&state=${currentState}`
    : `/jobs?queue=${encodeURIComponent(stats.name)}`;

  const isAdminQueue = stats.name.startsWith('admin_');

  return (
    <Link
      href={href}
      className={`block rounded-lg p-4 border transition-all ${
        isSelected
          ? 'ring-2 ring-primary ring-offset-2 bg-primary/5'
          : 'hover:ring-1 hover:ring-primary/50 bg-card'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <code className="text-sm font-medium truncate" title={stats.name}>
          {stats.name}
        </code>
        {isAdminQueue && (
          <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-0.5 rounded">
            admin
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Wait:</span>{' '}
          <span className="font-medium">{stats.waiting}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Active:</span>{' '}
          <span className="font-medium">{stats.active}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Done:</span>{' '}
          <span className="font-medium">{stats.completed}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Failed:</span>{' '}
          <span className="font-medium text-red-600 dark:text-red-400">{stats.failed}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Delay:</span>{' '}
          <span className="font-medium">{stats.delayed}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Total:</span>{' '}
          <span className="font-bold">{stats.total}</span>
        </div>
      </div>
    </Link>
  );
}

/**
 * State card component - clickable to filter by state within selected queue.
 */
function StateCard({
  label,
  value,
  state,
  currentQueue,
  currentState,
}: {
  label: string;
  value: number;
  state: string;
  currentQueue: string;
  currentState?: string;
}) {
  const isActive = state === (currentState || '');
  const baseHref = `/jobs?queue=${encodeURIComponent(currentQueue)}`;
  const href = state ? `${baseHref}&state=${state}` : baseHref;

  const stateStyles: Record<string, string> = {
    waiting: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    active: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    completed: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    failed: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
    delayed: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
    '': 'bg-muted/50 border',
  };

  return (
    <Link
      href={href}
      className={`block rounded-lg p-3 border transition-all ${stateStyles[state] || stateStyles['']} ${
        isActive ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-primary/50'
      }`}
    >
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </Link>
  );
}
