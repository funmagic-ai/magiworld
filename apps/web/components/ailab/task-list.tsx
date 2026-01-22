'use client';

/**
 * @fileoverview Task List Component
 *
 * Displays a grid of task cards with:
 * - Status filtering
 * - Responsive grid layout (2-3-4 columns)
 * - Click to expand modal
 * - Real-time progress updates
 *
 * @module components/ailab/task-list
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import { Loading03Icon, TaskDone01Icon } from '@hugeicons/core-free-icons';
import { TaskCard, type TaskItem } from './task-card';
import { TaskDetailModal } from './task-detail-modal';

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
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        locale,
        rootOnly: 'true',
        includeChildren: 'true',
      });
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

  const handleTaskClick = useCallback((task: TaskItem) => {
    setSelectedTask(task);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback((open: boolean) => {
    setModalOpen(open);
    if (!open) {
      // Delay clearing to allow animation
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
    },
  };

  const modalTranslations = {
    ...cardTranslations,
    step: {
      transform: t('step.transform'),
      '3d': t('step.3d'),
    },
    download: t('download'),
    copyUrl: t('copyUrl'),
    copied: t('copied'),
    createdAt: t('createdAt'),
    completedAt: t('completedAt'),
    error: t('error'),
    close: t('close'),
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

      {/* Task Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <HugeiconsIcon icon={Loading03Icon} className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HugeiconsIcon icon={TaskDone01Icon} className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">{t('empty')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t('emptyDescription')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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

      {/* Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        open={modalOpen}
        onOpenChange={handleModalClose}
        locale={locale}
        translations={modalTranslations}
      />
    </div>
  );
}
