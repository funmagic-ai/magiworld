'use client';

/**
 * @fileoverview Task Card Component
 *
 * Displays a single task in a grid card format with:
 * - Result preview (image or 3D thumbnail)
 * - Progress overlay for processing tasks
 * - Tool and step badges
 * - Status indicator
 *
 * @module components/ailab/task-card
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { HugeiconsIcon } from '@hugeicons/react';
import { Image01Icon, CubeIcon } from '@hugeicons/core-free-icons';

/**
 * Task item data structure
 */
export interface TaskItem {
  id: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  progress: number;
  inputParams: Record<string, unknown>;
  outputData: Record<string, unknown> | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  parentTaskId: string | null;
  tool: {
    slug: string;
    title: string;
    type: {
      slug: string;
      name: string;
      badgeColor: string;
    };
  };
  /** Child tasks for multi-step workflows */
  childTasks?: TaskItem[];
}

interface TaskCardProps {
  task: TaskItem;
  locale: string;
  onClick?: () => void;
  translations: {
    status: Record<string, string>;
  };
}

/**
 * Multi-step tools that require additional steps after the first
 * Maps tool slug to the step name that indicates it's the first step
 */
const MULTI_STEP_TOOLS: Record<string, string> = {
  'fig-me': 'transform', // transform step needs a 3d child to be complete
};

/**
 * Get effective status for a task (considers child tasks for multi-step workflows)
 * For multi-step tasks: success only if ALL expected children are success
 */
function getEffectiveStatus(task: TaskItem): TaskItem['status'] {
  const isMultiStepTool = task.tool.slug in MULTI_STEP_TOOLS;
  const step = task.outputData?.step as string | undefined;

  // Check if this is the first step of a multi-step tool
  if (isMultiStepTool) {
    const firstStepName = MULTI_STEP_TOOLS[task.tool.slug];
    const isFirstStep = step === firstStepName || !step; // No step means it's the initial task

    // If first step is complete but no child tasks yet, show as processing
    if (isFirstStep && task.status === 'success') {
      if (!task.childTasks || task.childTasks.length === 0) {
        // First step done, waiting for next step to be triggered
        return 'processing';
      }
    }
  }

  // If task has children, determine status from children
  if (task.childTasks && task.childTasks.length > 0) {
    const childStatuses = task.childTasks.map((c) => c.status);

    // If any child failed, the whole task failed
    if (childStatuses.includes('failed')) return 'failed';

    // If any child is still processing/pending, show as processing
    if (childStatuses.includes('processing')) return 'processing';
    if (childStatuses.includes('pending')) return 'pending';

    // All children must be success for the task to be success
    if (childStatuses.every((s) => s === 'success')) return 'success';

    // Default to processing if mixed states
    return 'processing';
  }

  // No children, use task's own status
  return task.status;
}

/**
 * Get combined progress for multi-step tasks
 */
function getEffectiveProgress(task: TaskItem): number {
  const isMultiStepTool = task.tool.slug in MULTI_STEP_TOOLS;

  // For multi-step tools, calculate progress across all expected steps
  if (isMultiStepTool) {
    const step = task.outputData?.step as string | undefined;
    const firstStepName = MULTI_STEP_TOOLS[task.tool.slug];
    const isFirstStep = step === firstStepName || !step;

    // If first step done but no children, show 50% progress
    if (isFirstStep && task.status === 'success' && (!task.childTasks || task.childTasks.length === 0)) {
      return 50;
    }

    // If has children, calculate combined progress (first step = 50%, children = 50%)
    if (task.childTasks && task.childTasks.length > 0) {
      const firstStepProgress = task.status === 'success' ? 50 : (task.progress / 2);
      const childProgress = task.childTasks.reduce((sum, c) => {
        return sum + (c.status === 'success' ? 100 : c.progress);
      }, 0);
      const avgChildProgress = childProgress / task.childTasks.length;
      return Math.round(firstStepProgress + (avgChildProgress / 2));
    }
  }

  // For single-step tools with children, average all progress
  if (task.childTasks && task.childTasks.length > 0) {
    const total = task.childTasks.reduce((sum, c) => {
      return sum + (c.status === 'success' ? 100 : c.progress);
    }, 0);
    return Math.round(total / task.childTasks.length);
  }

  return task.progress;
}

/**
 * Determine if the output is a 3D model based on format or URL
 */
function is3DOutput(outputData: Record<string, unknown> | null): boolean {
  if (!outputData) return false;
  const format = outputData.format as string | undefined;
  const resultUrl = outputData.resultUrl as string | undefined;

  if (format && ['glb', 'gltf', 'fbx', 'obj'].includes(format.toLowerCase())) {
    return true;
  }
  if (resultUrl) {
    const ext = resultUrl.split('.').pop()?.split('?')[0]?.toLowerCase();
    return ext ? ['glb', 'gltf', 'fbx', 'obj'].includes(ext) : false;
  }
  return false;
}

/**
 * Check if output is an image (not 3D, video, etc.)
 */
function isImageOutput(outputData: Record<string, unknown> | null): boolean {
  if (!outputData || !outputData.resultUrl) return false;
  // If it's 3D, it's not an image
  if (is3DOutput(outputData)) return false;
  // TODO: Add video check when video tools are added
  return true;
}

/**
 * Get the thumbnail URL for a task
 *
 * Unified logic for single-step and multi-step:
 * 1. If final output is an image → show that image
 * 2. If final output is NOT an image → show final step's input image
 * 3. Fallback to first step's input image
 * 4. Return null (placeholder will be shown)
 */
function getThumbnail(task: TaskItem): string | null {
  // Determine the "final" task (last child if multi-step, or self)
  let finalTask: TaskItem = task;

  if (task.childTasks && task.childTasks.length > 0) {
    // Get the last child (regardless of status, we want to show progress)
    // Prefer successful children, but fall back to any child
    const successfulChildren = task.childTasks.filter((c) => c.status === 'success');
    if (successfulChildren.length > 0) {
      finalTask = successfulChildren[successfulChildren.length - 1];
    } else {
      // Use the last child even if not successful (shows what's being worked on)
      finalTask = task.childTasks[task.childTasks.length - 1];
    }
  }

  // 1. If final output is an image, show it
  if (finalTask.status === 'success' && isImageOutput(finalTask.outputData)) {
    return finalTask.outputData!.resultUrl as string;
  }

  // 2. If final output is NOT an image (3D, video, etc.), show final step's input
  if (finalTask.inputParams?.imageUrl) {
    return finalTask.inputParams.imageUrl as string;
  }

  // 3. Fallback to first step's (parent task's) input image
  if (task.inputParams?.imageUrl) {
    return task.inputParams.imageUrl as string;
  }

  // 4. No image available
  return null;
}

/**
 * Check if final output is 3D (for badge display)
 */
function isFinal3DOutput(task: TaskItem): boolean {
  // For multi-step, check final child
  if (task.childTasks && task.childTasks.length > 0) {
    const successfulChildren = task.childTasks.filter((c) => c.status === 'success');
    if (successfulChildren.length > 0) {
      const finalChild = successfulChildren[successfulChildren.length - 1];
      return is3DOutput(finalChild.outputData);
    }
  }
  // Check own output
  return is3DOutput(task.outputData);
}

/**
 * Status color mapping
 */
const statusStyles: Record<TaskItem['status'], string> = {
  pending: 'bg-yellow-500/80 text-white',
  processing: 'bg-blue-500/80 text-white',
  success: 'bg-green-500/80 text-white',
  failed: 'bg-red-500/80 text-white',
};

export function TaskCard({ task, locale, onClick, translations }: TaskCardProps) {
  const thumbnail = getThumbnail(task);
  const is3D = isFinal3DOutput(task);

  // Get effective status and progress (considers child tasks for multi-step workflows)
  const effectiveStatus = getEffectiveStatus(task);
  const effectiveProgress = getEffectiveProgress(task);

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative bg-card rounded-xl overflow-hidden border cursor-pointer',
        'transition-all duration-200 hover:shadow-lg hover:border-primary/50',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
      )}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Image/Preview Area */}
      <div className="relative aspect-square bg-muted">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={task.tool.title}
            className={cn(
              'w-full h-full object-cover',
              (effectiveStatus === 'processing' || effectiveStatus === 'pending') && 'opacity-60 blur-sm'
            )}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <HugeiconsIcon
              icon={is3D ? CubeIcon : Image01Icon}
              className="w-12 h-12 text-muted-foreground/30"
            />
          </div>
        )}

        {/* 3D Badge */}
        {is3D && effectiveStatus === 'success' && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-black/60 text-white text-xs gap-1">
              <HugeiconsIcon icon={CubeIcon} className="w-3 h-3" />
              3D
            </Badge>
          </div>
        )}

        {/* Processing Overlay - progress bar only, no spinner */}
        {effectiveStatus === 'processing' && (
          <div className="absolute inset-x-0 bottom-0 p-2">
            <div className="w-full h-1.5 bg-black/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${effectiveProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Failed Overlay */}
        {effectiveStatus === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
            <div className="bg-red-500/80 text-white text-xs px-2 py-1 rounded max-w-[80%] text-center truncate">
              {task.errorMessage || 'Failed'}
            </div>
          </div>
        )}

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
      </div>

      {/* Info Area */}
      <div className="p-3 space-y-2">
        {/* Tool Name and Time */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm truncate flex-1">{task.tool.title}</h3>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatRelativeTime(task.createdAt)}
          </span>
        </div>

        {/* Badges Row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Tool Type Badge */}
          <Badge
            variant={task.tool.type.badgeColor as 'default' | 'secondary' | 'outline'}
            className="text-xs h-5"
          >
            {task.tool.type.name}
          </Badge>

          {/* Status Badge */}
          <Badge className={cn('text-xs h-5 ml-auto', statusStyles[effectiveStatus])}>
            {translations.status[effectiveStatus]}
          </Badge>
        </div>
      </div>
    </div>
  );
}
