/**
 * @fileoverview Task List with Expandable Rows
 * @fileoverview 带可展开行的任务列表
 *
 * Client component for displaying tasks with expandable details.
 * Supports pagination and retry/cancel actions.
 * 显示任务并支持展开详情的客户端组件。
 * 支持分页和重试/取消操作。
 *
 * @module apps/admin/app/tasks/task-list
 */

'use client';

import { Fragment, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { retryTask, cancelTask } from './actions';

/**
 * Task type for the task list (serialized from server)
 * Note: Dates become strings when serialized across Server/Client boundary
 */
interface TaskData {
  id: string;
  userId: string;
  toolId: string;
  providerId: string | null;
  inputParams: unknown;
  outputData: unknown;
  status: 'pending' | 'processing' | 'success' | 'failed';
  errorMessage: string | null;
  priority: number | null;
  progress: number | null;
  bullJobId: string | null;
  idempotencyKey: string | null;
  requestId: string | null;
  attemptsMade: number | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  parentTaskId: string | null;
}

/**
 * Status badge styles
 */
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

interface TaskItem {
  task: TaskData;
  toolSlug: string | null;
  userEmail: string | null;
}

interface TaskListProps {
  tasks: TaskItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Format date for display.
 * Handles both Date objects and ISO strings (from serialization).
 */
function formatDate(date: Date | string | null): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  // Use UTC to avoid hydration mismatch between server/client timezones
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Chevron icon component
 */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 ${expanded ? 'rotate-90' : ''}`}
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

export function TaskList({ tasks, total, page, pageSize, totalPages }: TaskListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);

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
      router.push(`/tasks?${params.toString()}`);
    });
  };

  const handleRetry = async (taskId: string) => {
    setProcessingId(taskId);
    try {
      await retryTask(taskId);
      router.refresh();
    } catch (error) {
      console.error('Failed to retry task:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (taskId: string) => {
    setProcessingId(taskId);
    try {
      await cancelTask(taskId);
      router.refresh();
    } catch (error) {
      console.error('Failed to cancel task:', error);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="mt-4">
      {/* Results Summary */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} of {total} tasks
        </p>
      </div>

      {/* Task Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 p-4"></th>
                <th className="w-32 p-4 text-left text-sm font-medium text-muted-foreground">Task ID</th>
                <th className="w-28 p-4 text-left text-sm font-medium text-muted-foreground">Tool</th>
                <th className="w-40 p-4 text-left text-sm font-medium text-muted-foreground">User</th>
                <th className="w-24 p-4 text-center text-sm font-medium text-muted-foreground">Status</th>
                <th className="w-28 p-4 text-center text-sm font-medium text-muted-foreground">Progress</th>
                <th className="w-40 p-4 text-left text-sm font-medium text-muted-foreground">Created</th>
                <th className="w-28 p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
          <tbody>
            {tasks.map(({ task, toolSlug, userEmail }) => {
              const isExpanded = expandedIds.has(task.id);
              const isProcessing = processingId === task.id;

              return (
                <Fragment key={task.id}>
                  {/* Parent Row */}
                  <tr
                    className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${
                      isExpanded ? 'bg-muted/20' : ''
                    }`}
                    onClick={() => toggleExpanded(task.id)}
                  >
                    {/* Expand Icon */}
                    <td className="p-4 text-muted-foreground">
                      <ChevronIcon expanded={isExpanded} />
                    </td>

                    {/* Task ID */}
                    <td className="p-4">
                      <code className="block truncate rounded bg-muted px-2 py-1 text-xs font-mono" title={task.id}>
                        {task.id.slice(0, 12)}...
                      </code>
                    </td>

                    {/* Tool */}
                    <td className="p-4">
                      <span className="block truncate text-sm font-medium" title={toolSlug || 'Unknown'}>
                        {toolSlug || 'Unknown'}
                      </span>
                    </td>

                    {/* User */}
                    <td className="p-4">
                      <span className="block truncate text-sm text-muted-foreground" title={userEmail || 'Unknown'}>
                        {userEmail || 'Unknown'}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[task.status] || STATUS_STYLES.pending
                        }`}
                      >
                        {task.status}
                      </span>
                    </td>

                    {/* Progress */}
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${task.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{task.progress || 0}%</span>
                      </div>
                    </td>

                    {/* Created At */}
                    <td className="p-4">
                      <span className="block truncate text-sm text-muted-foreground" title={formatDate(task.createdAt)}>
                        {formatDate(task.createdAt)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        {task.status === 'failed' && (
                          <button
                            onClick={() => handleRetry(task.id)}
                            disabled={isProcessing}
                            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                          >
                            {isProcessing ? 'Retrying...' : 'Retry'}
                          </button>
                        )}
                        {(task.status === 'pending' || task.status === 'processing') && (
                          <button
                            onClick={() => handleCancel(task.id)}
                            disabled={isProcessing}
                            className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/30"
                          >
                            {isProcessing ? 'Canceling...' : 'Cancel'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Child Row (Expanded Details) */}
                  {isExpanded && (
                    <tr className="border-b bg-muted/10">
                      <td colSpan={8} className="p-0">
                        <div className="px-12 py-4 space-y-4">
                          {/* Task Info Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="min-w-0">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Full Task ID
                              </label>
                              <div className="mt-1">
                                <code className="block truncate rounded bg-muted px-2 py-1 text-xs font-mono" title={task.id}>
                                  {task.id}
                                </code>
                              </div>
                            </div>
                            <div className="min-w-0">
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Bull Job ID
                              </label>
                              <div className="mt-1">
                                <code className="block truncate rounded bg-muted px-2 py-1 text-xs font-mono" title={task.bullJobId || 'N/A'}>
                                  {task.bullJobId || 'N/A'}
                                </code>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Priority
                              </label>
                              <div className="mt-1">
                                <span className="text-sm">{task.priority ?? 'N/A'}</span>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Completed At
                              </label>
                              <div className="mt-1">
                                <span className="text-sm">{formatDate(task.completedAt)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Error Message */}
                          {task.errorMessage ? (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Error Message
                              </label>
                              <div className="mt-1 rounded bg-destructive/10 p-3 text-sm text-destructive overflow-x-auto">
                                <pre className="whitespace-pre-wrap break-words">{String(task.errorMessage)}</pre>
                              </div>
                            </div>
                          ) : null}

                          {/* Input Params */}
                          {task.inputParams ? (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Input Parameters
                              </label>
                              <div className="mt-1 rounded bg-muted overflow-hidden">
                                <pre className="p-3 text-xs font-mono overflow-x-auto max-h-64 whitespace-pre-wrap break-words">
                                  {JSON.stringify(task.inputParams, null, 2)}
                                </pre>
                              </div>
                            </div>
                          ) : null}

                          {/* Output Data */}
                          {task.outputData ? (
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Output Data
                              </label>
                              <div className="mt-1 rounded bg-muted overflow-hidden">
                                <pre className="p-3 text-xs font-mono overflow-x-auto max-h-64 whitespace-pre-wrap break-words">
                                  {JSON.stringify(task.outputData, null, 2)}
                                </pre>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}

            {/* Empty State */}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No tasks found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1 || isPending}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages || isPending}
            className="rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton fallback for TaskList while loading.
 */
export function TaskListSkeleton() {
  return (
    <div className="mt-4">
      {/* Results Summary skeleton */}
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-48 bg-muted rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-10 p-4"><div className="h-4 w-4 bg-muted rounded animate-pulse" /></th>
                <th className="w-32 p-4"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></th>
                <th className="w-28 p-4"><div className="h-4 w-12 bg-muted rounded animate-pulse" /></th>
                <th className="w-40 p-4"><div className="h-4 w-16 bg-muted rounded animate-pulse" /></th>
                <th className="w-24 p-4"><div className="h-4 w-12 bg-muted rounded animate-pulse mx-auto" /></th>
                <th className="w-28 p-4"><div className="h-4 w-16 bg-muted rounded animate-pulse mx-auto" /></th>
                <th className="w-40 p-4"><div className="h-4 w-20 bg-muted rounded animate-pulse" /></th>
                <th className="w-28 p-4"><div className="h-4 w-16 bg-muted rounded animate-pulse ml-auto" /></th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="p-4"><div className="h-4 w-4 bg-muted rounded animate-pulse" /></td>
                  <td className="p-4"><div className="h-6 w-20 bg-muted rounded animate-pulse" /></td>
                  <td className="p-4"><div className="h-5 w-16 bg-muted rounded animate-pulse" /></td>
                  <td className="p-4"><div className="h-5 w-28 bg-muted rounded animate-pulse" /></td>
                  <td className="p-4"><div className="h-5 w-16 bg-muted rounded-full animate-pulse mx-auto" /></td>
                  <td className="p-4"><div className="h-2 w-16 bg-muted rounded-full animate-pulse mx-auto" /></td>
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
        <div className="h-5 w-24 bg-muted rounded animate-pulse" />
        <div className="h-10 w-16 bg-muted rounded animate-pulse" />
      </div>
    </div>
  );
}
