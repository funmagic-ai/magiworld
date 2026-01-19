'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon } from '@hugeicons/core-free-icons';

interface TaskItem {
  id: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  progress: number;
  inputParams: Record<string, unknown>;
  outputData: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  tool: {
    slug: string;
    title: string;
    type: {
      slug: string;
      name: string;
      badgeColor: string;
    };
  };
}

interface TaskListProps {
  locale: string;
}

const STATUS_FILTERS = ['all', 'pending', 'processing', 'success', 'failed'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

export function TaskList({ locale }: TaskListProps) {
  const t = useTranslations('tasks');
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ locale });
      if (filter !== 'all') {
        params.set('status', filter);
      }
      const response = await fetch(`/api/tasks?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [locale, filter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const statusColorMap: Record<TaskItem['status'], string> = {
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    processing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    success: 'bg-green-500/10 text-green-600 border-green-500/20',
    failed: 'bg-red-500/10 text-red-600 border-red-500/20',
  };

  const getStatusColor = (status: TaskItem['status']): string => {
    return statusColorMap[status] || '';
  };

  const getResultThumbnail = (task: TaskItem): string | null => {
    if (task.status !== 'success' || !task.outputData) return null;
    return (task.outputData.resultUrl as string) || null;
  };

  const getInputThumbnail = (task: TaskItem): string | null => {
    if (!task.inputParams) return null;
    return (task.inputParams.imageUrl as string) || null;
  };

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {STATUS_FILTERS.map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
          >
            {t(`filters.${status}`)}
          </Button>
        ))}
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TaskIcon className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">{t('empty')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t('emptyDescription')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const thumbnail = getResultThumbnail(task) || getInputThumbnail(task);

            return (
              <Card key={task.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex gap-4 p-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-20 h-20 bg-muted rounded-lg overflow-hidden">
                      {thumbnail ? (
                        <img
                          src={thumbnail}
                          alt={task.tool.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <TaskIcon className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-medium truncate">{task.tool.title}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={task.tool.type.badgeColor as 'default' | 'secondary' | 'outline'}
                              className="text-xs"
                            >
                              {task.tool.type.name}
                            </Badge>
                            <Badge variant="outline" className={`text-xs ${getStatusColor(task.status)}`}>
                              {t(`status.${task.status}`)}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-muted-foreground">
                          {t('createdAt')}: {formatDate(task.createdAt)}
                        </span>

                        {task.status === 'success' && !!task.outputData?.resultUrl && (
                          <Link
                            href={`/ai-lab/${task.tool.type.slug}/${task.tool.slug}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {t('viewResult')}
                          </Link>
                        )}

                        {task.status === 'processing' && (
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${task.progress}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{task.progress}%</span>
                          </div>
                        )}

                        {task.status === 'failed' && task.errorMessage && (
                          <span className="text-xs text-destructive truncate max-w-[200px]">
                            {task.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TaskIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
