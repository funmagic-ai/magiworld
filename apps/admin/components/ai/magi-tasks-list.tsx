'use client';

import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download04Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export interface TaskItem {
  id: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  progress: number;
  inputParams: Record<string, unknown> | null;
  outputData: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: Date;
  completedAt: Date | null;
  toolName: string | null;
  userName: string | null;
  userEmail: string | null;
}

interface MagiTasksListProps {
  tasks: TaskItem[];
}

function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  // Use UTC to avoid hydration mismatch between server and client timezones
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(date));
}

function truncate(text: string | null, maxLength: number): string {
  if (!text) return 'N/A';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\u2026';
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function getInputThumbnail(task: TaskItem): string | null {
  if (!task.inputParams) return null;
  return (task.inputParams.imageUrl as string) || null;
}

function getOutputThumbnail(task: TaskItem): string | null {
  if (!task.outputData) return null;
  return (task.outputData.resultUrl as string) || null;
}

function handleDownload(url: string, filename?: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || 'result.png';
  link.target = '_blank';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function MagiTasksList({ tasks }: MagiTasksListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

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

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-8 px-2 py-3 sm:px-4"></th>
              <th className="w-12 px-2 py-3 sm:w-16 sm:px-4"></th>
              <th className="px-2 py-3 sm:px-4 text-left text-sm font-medium text-muted-foreground">Tool</th>
              <th className="hidden md:table-cell px-2 py-3 sm:px-4 text-left text-sm font-medium text-muted-foreground">User</th>
              <th className="px-2 py-3 sm:px-4 text-center text-sm font-medium text-muted-foreground">Status</th>
              <th className="hidden sm:table-cell px-2 py-3 sm:px-4 text-center text-sm font-medium text-muted-foreground">Progress</th>
              <th className="px-2 py-3 sm:px-4 text-left text-sm font-medium text-muted-foreground">Created</th>
            </tr>
          </thead>
        <tbody>
          {tasks.map((task) => {
            const isExpanded = expandedIds.has(task.id);
            const thumbnail = getOutputThumbnail(task) || getInputThumbnail(task);

            return (
              <Fragment key={task.id}>
                <tr
                  className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${
                    isExpanded ? 'bg-muted/20' : ''
                  }`}
                  onClick={() => toggleExpanded(task.id)}
                >
                  <td className="px-2 py-3 sm:px-4 text-muted-foreground">
                    <ChevronIcon expanded={isExpanded} />
                  </td>

                  <td className="px-2 py-3 sm:px-4">
                    {thumbnail ? (
                      <img
                        src={thumbnail}
                        alt="Thumbnail"
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex items-center justify-center">
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </td>

                  <td className="px-2 py-3 sm:px-4">
                    <span className="text-sm font-medium">{task.toolName || 'Unknown Tool'}</span>
                  </td>

                  <td className="hidden md:table-cell px-2 py-3 sm:px-4">
                    <div className="text-sm">
                      <div className="font-medium truncate max-w-[150px]">{task.userName || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[150px]">{task.userEmail || ''}</div>
                    </div>
                  </td>

                  <td className="px-2 py-3 sm:px-4 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[task.status] || STATUS_STYLES.pending
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>

                  <td className="hidden sm:table-cell px-2 py-3 sm:px-4 text-center">
                    {task.status === 'processing' ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 sm:w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 transition-all"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{task.progress}%</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {task.status === 'success' ? '100%' : '-'}
                      </span>
                    )}
                  </td>

                  <td className="px-2 py-3 sm:px-4">
                    <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(task.createdAt)}
                    </span>
                  </td>
                </tr>

                {isExpanded && (
                  <tr className="border-b bg-muted/10">
                    <td colSpan={7} className="p-0">
                      <div className="px-4 sm:px-8 py-4 space-y-4 max-w-full overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="min-w-0">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Task ID
                            </label>
                            <div className="mt-1">
                              <code className="rounded bg-muted px-2 py-1 text-xs font-mono break-all">
                                {task.id}
                              </code>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Created At
                            </label>
                            <div className="mt-1 text-sm">{formatDate(task.createdAt)}</div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Completed At
                            </label>
                            <div className="mt-1 text-sm">{formatDate(task.completedAt)}</div>
                          </div>
                        </div>

                        {task.errorMessage && (
                          <div className="min-w-0">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Error Message
                            </label>
                            <div className="mt-1 rounded bg-destructive/10 p-3 text-sm text-destructive break-words">
                              {task.errorMessage}
                            </div>
                          </div>
                        )}

                        {task.status === 'success' && (getInputThumbnail(task) || getOutputThumbnail(task)) && (
                          <div className="min-w-0">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Result Preview
                            </label>
                            <div className="mt-2 flex flex-wrap items-start gap-4">
                              {getInputThumbnail(task) && (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-xs text-muted-foreground">Input</span>
                                  <img
                                    src={getInputThumbnail(task)!}
                                    alt="Input"
                                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg object-cover border"
                                  />
                                </div>
                              )}
                              {getInputThumbnail(task) && getOutputThumbnail(task) && (
                                <div className="flex items-center self-center">
                                  <HugeiconsIcon icon={ArrowRight01Icon} className="w-5 h-5 text-muted-foreground" />
                                </div>
                              )}
                              {getOutputThumbnail(task) && (
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-xs text-muted-foreground">Output</span>
                                  <img
                                    src={getOutputThumbnail(task)!}
                                    alt="Output"
                                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg object-cover border"
                                  />
                                </div>
                              )}
                              {getOutputThumbnail(task) && (
                                <div className="flex items-end self-end pb-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownload(getOutputThumbnail(task)!, `result-${task.id.slice(0, 8)}.png`);
                                    }}
                                  >
                                    <HugeiconsIcon icon={Download04Icon} className="w-4 h-4 mr-1.5" />
                                    Download
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {task.inputParams && Object.keys(task.inputParams).length > 0 && (
                          <div className="min-w-0">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Input Parameters
                            </label>
                            <pre className="mt-1 rounded bg-muted p-3 text-xs font-mono overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
                              {JSON.stringify(task.inputParams, null, 2)}
                            </pre>
                          </div>
                        )}

                        {task.outputData && Object.keys(task.outputData).length > 0 && (
                          <div className="min-w-0">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Output Data
                            </label>
                            <pre className="mt-1 rounded bg-muted p-3 text-xs font-mono overflow-x-auto max-h-32 whitespace-pre-wrap break-all">
                              {JSON.stringify(task.outputData, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}

          {tasks.length === 0 && (
            <tr>
              <td colSpan={7} className="p-6 sm:p-8 text-center text-muted-foreground">
                No tasks found. Tasks will appear here when you run AI tools.
              </td>
            </tr>
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
}
