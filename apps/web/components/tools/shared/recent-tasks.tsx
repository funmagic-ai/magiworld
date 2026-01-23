'use client';

/**
 * @fileoverview Recent Tasks Component
 *
 * Displays a grid of recent tasks for a specific tool with:
 * - Compact grid layout (4 columns)
 * - Click to view task detail modal (or redirect for active tasks)
 * - Link to all tasks page
 * - Auto-polling for real-time progress updates
 *
 * @module components/tools/shared/recent-tasks
 */

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Loading03Icon } from '@hugeicons/core-free-icons';
import { TaskCard, type TaskItem, getEffectiveStatus } from '@/components/ailab/task-card';
import { TaskDetailModal } from '@/components/ailab/task-detail-modal';
import { useTaskPolling } from '@/components/ailab/use-task-polling';

interface RecentTasksProps {
  /** Tool ID to filter tasks */
  toolId: string;
  /** Maximum number of tasks to show */
  limit?: number;
}

export function RecentTasks({ toolId, limit = 4 }: RecentTasksProps) {
  const t = useTranslations('tasks');
  const locale = useLocale();
  const router = useRouter();

  // Build localized link to all tasks page
  const allTasksHref = `/${locale}/assets/tasks`;
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Use shared polling hook
  const { tasks, isLoading } = useTaskPolling({
    locale,
    toolId,
    limit,
    rootOnly: true,
    includeChildren: true,
  });

  const handleTaskClick = useCallback((task: TaskItem) => {
    const effectiveStatus = getEffectiveStatus(task);

    // For completed or failed tasks, open the detail modal
    if (effectiveStatus === 'success' || effectiveStatus === 'failed') {
      setSelectedTask(task);
      setModalOpen(true);
      return;
    }

    // For processing/pending/waiting tasks, redirect to the tool page to continue
    const toolUrl = `/${locale}/ai-lab/${task.tool.type.slug}/${task.tool.slug}?taskId=${task.id}`;
    router.push(toolUrl);
  }, [locale, router]);

  const handleModalClose = useCallback((open: boolean) => {
    setModalOpen(open);
    if (!open) {
      setTimeout(() => setSelectedTask(null), 200);
    }
  }, []);

  // Build translations object for child components
  const cardTranslations = {
    status: {
      pending: t('status.pending'),
      processing: t('status.processing'),
      success: t('status.success'),
      failed: t('status.failed'),
      waiting: t('status.waiting'),
      continue: t('status.continue'),
    },
  };

  const modalTranslations = {
    ...cardTranslations,
    step: {
      transform: t('step.transform'),
      '3d': t('step.3d'),
    },
    download: t('download'),
    createdAt: t('createdAt'),
    completedAt: t('completedAt'),
    error: t('error'),
    close: t('close'),
  };

  // Don't render if no tasks and not loading
  if (!isLoading && tasks.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{t('recentTasks')}</CardTitle>
            <Link href={allTasksHref}>
              <Button variant="ghost" size="sm" className="gap-1">
                {t('allTasks')}
                <HugeiconsIcon icon={ArrowRight01Icon} className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <HugeiconsIcon icon={Loading03Icon} className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  locale={locale}
                  onClick={() => handleTaskClick(task)}
                  translations={cardTranslations}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        open={modalOpen}
        onOpenChange={handleModalClose}
        locale={locale}
        translations={modalTranslations}
      />
    </>
  );
}
