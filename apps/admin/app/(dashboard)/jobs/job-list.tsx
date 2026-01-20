/**
 * @fileoverview Job List Component
 * @fileoverview 作业列表组件
 *
 * Client component for displaying BullMQ jobs with auto-refresh.
 * 显示 BullMQ 作业的客户端组件，支持自动刷新。
 *
 * @module apps/admin/app/jobs/job-list
 */

'use client';

import { Fragment, useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { retryJob, removeJob } from './actions';

/**
 * Serialized job data type
 */
interface JobData {
  taskId?: string;
  toolSlug?: string;
  userId?: string;
  [key: string]: unknown;
}

interface SerializedJob {
  id: string;
  name: string;
  data: JobData;
  progress: number | string | object | boolean;
  attemptsMade: number;
  timestamp: number;
  finishedOn?: number;
  processedOn?: number;
  failedReason?: string;
  state: string;
}

/**
 * Status badge styles
 */
const STATE_STYLES: Record<string, string> = {
  waiting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  delayed: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  paused: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

interface JobListProps {
  jobs: SerializedJob[];
  page: number;
  hasMore: boolean;
  currentState?: string;
  currentQueue?: string;
}

/**
 * Format timestamp for display (UTC to avoid hydration issues).
 */
function formatTimestamp(ts: number | undefined): string {
  if (!ts) return 'N/A';
  return new Date(ts).toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Format duration in human-readable format.
 */
function formatDuration(startTs?: number, endTs?: number): string {
  if (!startTs) return 'N/A';
  const end = endTs || Date.now();
  const durationMs = end - startTs;

  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${(durationMs / 60000).toFixed(1)}m`;
}

/**
 * Get progress as number
 */
function getProgressNumber(progress: number | string | object | boolean): number {
  if (typeof progress === 'number') return progress;
  if (progress === true) return 100;
  return 0;
}

/**
 * Chevron icon component
 */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-4 w-4 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function JobList({ jobs, page, hasMore, currentState, currentQueue }: JobListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      router.refresh();
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, router]);

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    startTransition(() => {
      router.push(`/jobs?${params.toString()}`);
    });
  };

  const handleRetry = async (jobId: string) => {
    if (!currentQueue) return;
    setProcessingId(jobId);
    try {
      await retryJob(currentQueue, jobId);
      router.refresh();
    } catch (error) {
      console.error('Failed to retry job:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemove = async (jobId: string) => {
    if (!currentQueue) return;
    if (!confirm('Are you sure you want to remove this job?')) return;
    setProcessingId(jobId);
    try {
      await removeJob(currentQueue, jobId);
      router.refresh();
    } catch (error) {
      console.error('Failed to remove job:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div>
      {/* Controls */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            <svg
              className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 11-9-9" />
            </svg>
            Refresh
          </button>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300"
            />
            Auto-refresh
          </label>

          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="rounded-md border bg-background px-2 py-1 text-sm"
            >
              <option value={3}>3s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
            </select>
          )}
        </div>

        <p className="text-sm text-muted-foreground">
          {jobs.length} job{jobs.length !== 1 ? 's' : ''} shown
          {currentState && ` (${currentState})`}
        </p>
      </div>

      {/* Job Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 p-4"></th>
                <th className="w-32 p-4 text-left text-sm font-medium text-muted-foreground">Job ID</th>
                <th className="w-32 p-4 text-left text-sm font-medium text-muted-foreground">Task ID</th>
                <th className="w-28 p-4 text-left text-sm font-medium text-muted-foreground">Tool</th>
                <th className="w-24 p-4 text-center text-sm font-medium text-muted-foreground">State</th>
                <th className="w-28 p-4 text-center text-sm font-medium text-muted-foreground">Progress</th>
                <th className="w-20 p-4 text-center text-sm font-medium text-muted-foreground">Attempts</th>
                <th className="w-40 p-4 text-left text-sm font-medium text-muted-foreground">Created</th>
                <th className="w-28 p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => {
                const isExpanded = expandedIds.has(job.id);
                const isProcessing = processingId === job.id;
                const progressNum = getProgressNumber(job.progress);

                return (
                  <Fragment key={job.id}>
                    {/* Parent Row */}
                    <tr
                      className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${
                        isExpanded ? 'bg-muted/20' : ''
                      }`}
                      onClick={() => toggleExpanded(job.id)}
                    >
                      {/* Expand Icon */}
                      <td className="p-4 text-muted-foreground">
                        <ChevronIcon expanded={isExpanded} />
                      </td>

                      {/* Job ID */}
                      <td className="p-4">
                        <code className="block truncate rounded bg-muted px-2 py-1 text-xs font-mono" title={job.id}>
                          {job.id.slice(0, 12)}...
                        </code>
                      </td>

                      {/* Task ID */}
                      <td className="p-4">
                        <code className="block truncate rounded bg-muted px-2 py-1 text-xs font-mono" title={job.data.taskId || 'N/A'}>
                          {job.data.taskId?.slice(0, 12) || 'N/A'}
                        </code>
                      </td>

                      {/* Tool */}
                      <td className="p-4">
                        <span className="block truncate text-sm font-medium" title={job.data.toolSlug || 'Unknown'}>
                          {job.data.toolSlug || 'Unknown'}
                        </span>
                      </td>

                      {/* State Badge */}
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            STATE_STYLES[job.state] || STATE_STYLES.waiting
                          }`}
                        >
                          {job.state}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-2 w-12 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${progressNum}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">{progressNum}%</span>
                        </div>
                      </td>

                      {/* Attempts */}
                      <td className="p-4 text-center">
                        <span className="text-sm">{job.attemptsMade}</span>
                      </td>

                      {/* Created */}
                      <td className="p-4">
                        <span className="block truncate text-sm text-muted-foreground" title={formatTimestamp(job.timestamp)}>
                          {formatTimestamp(job.timestamp)}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {job.state === 'failed' && (
                            <button
                              onClick={() => handleRetry(job.id)}
                              disabled={isProcessing}
                              className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            >
                              Retry
                            </button>
                          )}
                          {(job.state === 'waiting' || job.state === 'delayed' || job.state === 'failed' || job.state === 'completed') && (
                            <button
                              onClick={() => handleRemove(job.id)}
                              disabled={isProcessing}
                              className="inline-flex items-center justify-center rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/30"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr className="border-b bg-muted/10">
                        <td colSpan={9} className="p-0">
                          <div className="p-6 space-y-4">
                            {/* Job Info Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="min-w-0">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Full Job ID
                                </label>
                                <div className="mt-1">
                                  <code className="block truncate rounded bg-muted px-2 py-1 text-xs font-mono" title={job.id}>
                                    {job.id}
                                  </code>
                                </div>
                              </div>
                              <div className="min-w-0">
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Full Task ID
                                </label>
                                <div className="mt-1">
                                  <code className="block truncate rounded bg-muted px-2 py-1 text-xs font-mono" title={job.data.taskId || 'N/A'}>
                                    {job.data.taskId || 'N/A'}
                                  </code>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Duration
                                </label>
                                <div className="mt-1">
                                  <span className="text-sm">
                                    {formatDuration(job.processedOn, job.finishedOn)}
                                  </span>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Finished At
                                </label>
                                <div className="mt-1">
                                  <span className="text-sm">
                                    {formatTimestamp(job.finishedOn)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Failed Reason */}
                            {job.failedReason && (
                              <div>
                                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Failed Reason
                                </label>
                                <div className="mt-1 rounded bg-destructive/10 p-3 text-sm text-destructive overflow-x-auto">
                                  <pre className="whitespace-pre-wrap break-words">{job.failedReason}</pre>
                                </div>
                              </div>
                            )}

                            {/* Job Data */}
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Job Data
                              </label>
                              <div className="mt-1 rounded bg-muted overflow-hidden">
                                <pre className="p-3 text-xs font-mono overflow-x-auto max-h-64 whitespace-pre-wrap break-words">
                                  {JSON.stringify(job.data, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}

              {/* Empty State */}
              {jobs.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No jobs found in the queue{currentState && ` with state "${currentState}"`}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          onClick={() => goToPage(page - 1)}
          disabled={page === 1 || isPending}
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-muted-foreground">Page {page}</span>
        <button
          onClick={() => goToPage(page + 1)}
          disabled={!hasMore || isPending}
          className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/**
 * Skeleton fallback for JobList while loading.
 */
export function JobListSkeleton() {
  return (
    <div>
      {/* Controls skeleton */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-24 bg-muted rounded animate-pulse" />
          <div className="h-5 w-28 bg-muted rounded animate-pulse" />
        </div>
        <div className="h-5 w-20 bg-muted rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 p-4"><div className="h-4 w-4 bg-muted rounded animate-pulse" /></th>
                <th className="w-32 p-4"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></th>
                <th className="w-32 p-4"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></th>
                <th className="w-28 p-4"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></th>
                <th className="w-24 p-4"><div className="h-4 w-12 bg-muted rounded animate-pulse mx-auto" /></th>
                <th className="w-28 p-4"><div className="h-4 w-16 bg-muted rounded animate-pulse mx-auto" /></th>
                <th className="w-20 p-4"><div className="h-4 w-12 bg-muted rounded animate-pulse mx-auto" /></th>
                <th className="w-40 p-4"><div className="h-4 w-20 bg-muted rounded animate-pulse" /></th>
                <th className="w-28 p-4"><div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" /></th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-4"><div className="h-4 w-4 bg-muted rounded animate-pulse" /></td>
                  <td className="p-4"><div className="h-6 w-20 bg-muted rounded animate-pulse" /></td>
                  <td className="p-4"><div className="h-6 w-20 bg-muted rounded animate-pulse" /></td>
                  <td className="p-4"><div className="h-5 w-16 bg-muted rounded animate-pulse" /></td>
                  <td className="p-4"><div className="h-5 w-16 bg-muted rounded-full animate-pulse mx-auto" /></td>
                  <td className="p-4"><div className="h-2 w-12 bg-muted rounded-full animate-pulse mx-auto" /></td>
                  <td className="p-4"><div className="h-5 w-6 bg-muted rounded animate-pulse mx-auto" /></td>
                  <td className="p-4"><div className="h-5 w-32 bg-muted rounded animate-pulse" /></td>
                  <td className="p-4"><div className="h-6 w-14 bg-muted rounded animate-pulse ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination skeleton */}
      <div className="mt-4 flex items-center justify-center gap-2">
        <div className="h-10 w-20 bg-muted rounded animate-pulse" />
        <div className="h-5 w-16 bg-muted rounded animate-pulse" />
        <div className="h-10 w-16 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
