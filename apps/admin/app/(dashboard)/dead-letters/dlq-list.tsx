/**
 * @fileoverview Dead Letter List with Expandable Rows
 * @fileoverview 带可展开行的死信列表
 *
 * Client component for displaying dead letter queue entries.
 * Supports expanding rows to view error details and payload.
 * 显示死信队列条目的客户端组件。
 * 支持展开行查看错误详情和有效负载。
 *
 * @module apps/admin/app/dead-letters/dlq-list
 */

'use client';

import { Fragment, useState, useTransition } from 'react';
import type { DeadLetterTask } from '@magiworld/db';
import { archiveDeadLetter, retryDeadLetter } from './actions';

/**
 * Status badge styles
 */
const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  retried: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

interface DlqItem {
  dlq: DeadLetterTask;
  task: {
    id: string;
    toolId: string | null;
    userId: string | null;
  } | null;
}

interface DeadLetterListProps {
  items: DlqItem[];
}

/**
 * Format date for display.
 */
function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Truncate text with ellipsis.
 */
function truncate(text: string | null, maxLength: number): string {
  if (!text) return 'N/A';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\u2026';
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

export function DeadLetterList({ items }: DeadLetterListProps) {
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

  const handleRetry = (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      try {
        await retryDeadLetter(id);
      } catch (error) {
        console.error('Failed to retry:', error);
      } finally {
        setProcessingId(null);
      }
    });
  };

  const handleArchive = (id: string) => {
    setProcessingId(id);
    startTransition(async () => {
      try {
        await archiveDeadLetter(id);
      } catch (error) {
        console.error('Failed to archive:', error);
      } finally {
        setProcessingId(null);
      }
    });
  };

  return (
    <div className="rounded-lg border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="w-8 p-4"></th>
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Queue</th>
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Error</th>
            <th className="p-4 text-center text-sm font-medium text-muted-foreground">Attempts</th>
            <th className="p-4 text-center text-sm font-medium text-muted-foreground">Status</th>
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Created</th>
            <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ dlq, task }) => {
            const isExpanded = expandedIds.has(dlq.id);
            const payload = dlq.payload as Record<string, unknown> | null;
            const isProcessing = processingId === dlq.id && isPending;

            return (
              <Fragment key={dlq.id}>
                {/* Parent Row */}
                <tr
                  className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${
                    isExpanded ? 'bg-muted/20' : ''
                  }`}
                  onClick={() => toggleExpanded(dlq.id)}
                >
                  {/* Expand Icon */}
                  <td className="p-4 text-muted-foreground">
                    <ChevronIcon expanded={isExpanded} />
                  </td>

                  {/* Queue */}
                  <td className="p-4">
                    <code className="rounded bg-muted px-2 py-1 text-sm">{dlq.queue}</code>
                  </td>

                  {/* Error Message */}
                  <td className="p-4">
                    <div className="max-w-xs">
                      <span className="text-sm text-destructive">
                        {truncate(dlq.errorMessage, 60)}
                      </span>
                    </div>
                  </td>

                  {/* Attempts */}
                  <td className="p-4 text-center">
                    <span className="text-sm font-medium">{dlq.attemptsMade}</span>
                  </td>

                  {/* Status Badge */}
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[dlq.status] || STATUS_STYLES.pending
                      }`}
                    >
                      {dlq.status}
                    </span>
                  </td>

                  {/* Created At */}
                  <td className="p-4">
                    <span className="text-sm text-muted-foreground">
                      {formatDate(dlq.createdAt)}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    {dlq.status === 'pending' && (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRetry(dlq.id)}
                          disabled={isProcessing}
                          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:text-blue-400 dark:hover:bg-blue-900/30"
                        >
                          {isProcessing ? 'Retrying...' : 'Retry'}
                        </button>
                        <button
                          onClick={() => handleArchive(dlq.id)}
                          disabled={isProcessing}
                          className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                        >
                          Archive
                        </button>
                      </div>
                    )}
                    {dlq.status === 'retried' && dlq.retriedAt && (
                      <span className="text-xs text-muted-foreground">
                        Retried {formatDate(dlq.retriedAt)}
                      </span>
                    )}
                  </td>
                </tr>

                {/* Child Row (Expanded Details) */}
                {isExpanded && (
                  <tr className="border-b bg-muted/10">
                    <td colSpan={7} className="p-0">
                      <div className="px-12 py-4 space-y-4">
                        {/* Task Info */}
                        {task && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Task ID
                              </label>
                              <div className="mt-1">
                                <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                                  {task.id}
                                </code>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Tool ID
                              </label>
                              <div className="mt-1">
                                <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                                  {task.toolId || 'N/A'}
                                </code>
                              </div>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                User ID
                              </label>
                              <div className="mt-1">
                                <code className="rounded bg-muted px-2 py-1 text-xs font-mono">
                                  {task.userId || 'N/A'}
                                </code>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Error Details */}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Error Message
                          </label>
                          <div className="mt-1 rounded bg-destructive/10 p-3 text-sm text-destructive">
                            {dlq.errorMessage}
                          </div>
                        </div>

                        {/* Error Stack */}
                        {dlq.errorStack && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Stack Trace
                            </label>
                            <pre className="mt-1 rounded bg-muted p-3 text-xs font-mono overflow-x-auto max-h-48 text-muted-foreground">
                              {dlq.errorStack}
                            </pre>
                          </div>
                        )}

                        {/* Payload */}
                        {payload && Object.keys(payload).length > 0 && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Job Payload
                            </label>
                            <pre className="mt-1 rounded bg-muted p-3 text-xs font-mono overflow-x-auto max-h-48">
                              {JSON.stringify(payload, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Review Notes */}
                        {dlq.reviewNotes && (
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Review Notes
                            </label>
                            <div className="mt-1 rounded bg-muted p-3 text-sm">
                              {dlq.reviewNotes}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}

          {/* Empty State */}
          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="p-8 text-center text-muted-foreground">
                No failed tasks in the dead letter queue. All systems operational!
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
