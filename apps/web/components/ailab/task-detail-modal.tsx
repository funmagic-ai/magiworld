'use client';

/**
 * @fileoverview Task Detail Modal Component
 *
 * Modal dialog for viewing task details including:
 * - Full-size image or 3D model viewer
 * - Task metadata (tool, status, timestamps)
 * - Download action for results
 * - Support for multi-step tasks (shows final 3D result from child tasks)
 *
 * @module components/ailab/task-detail-modal
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Download01Icon,
  Copy01Icon,
  CheckmarkCircle02Icon,
  CubeIcon,
  Image01Icon,
  Clock01Icon,
  AlertCircleIcon,
} from '@hugeicons/core-free-icons';
import { ModelViewer } from '@/components/tools/shared/model-viewer';
import type { TaskItem } from './task-card';

interface TaskDetailModalProps {
  task: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: string;
  translations: {
    status: Record<string, string>;
    step?: Record<string, string>;
    download: string;
    copyUrl: string;
    copied: string;
    createdAt: string;
    completedAt: string;
    error: string;
    close: string;
  };
}

/**
 * Determine if the output is a 3D model
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
 * Get the final result for a task (considers child tasks for multi-step workflows)
 * Returns the final task and its result URL
 */
function getFinalResult(task: TaskItem): { resultUrl: string | null; is3D: boolean; step: string | undefined; finalTask: TaskItem } {
  // Check child tasks first (for multi-step workflows like fig-me)
  if (task.childTasks && task.childTasks.length > 0) {
    // Find the last successful child task
    const successfulChildren = task.childTasks.filter((c) => c.status === 'success');
    if (successfulChildren.length > 0) {
      const finalChild = successfulChildren[successfulChildren.length - 1];
      const resultUrl = finalChild.outputData?.resultUrl as string | undefined;
      return {
        resultUrl: resultUrl || null,
        is3D: is3DOutput(finalChild.outputData),
        step: finalChild.outputData?.step as string | undefined,
        finalTask: finalChild,
      };
    }
    // If no successful children, show the last child's state
    const lastChild = task.childTasks[task.childTasks.length - 1];
    return {
      resultUrl: lastChild.outputData?.resultUrl as string | null,
      is3D: is3DOutput(lastChild.outputData),
      step: lastChild.outputData?.step as string | undefined,
      finalTask: lastChild,
    };
  }

  // Single task - use its own output
  return {
    resultUrl: task.outputData?.resultUrl as string | null,
    is3D: is3DOutput(task.outputData),
    step: task.outputData?.step as string | undefined,
    finalTask: task,
  };
}

/**
 * Status styles
 */
const statusStyles: Record<TaskItem['status'], string> = {
  pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  processing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  success: 'bg-green-500/10 text-green-600 border-green-500/20',
  failed: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export function TaskDetailModal({
  task,
  open,
  onOpenChange,
  locale,
  translations,
}: TaskDetailModalProps) {
  const [copied, setCopied] = useState(false);

  // Get final result (considers child tasks for multi-step workflows)
  const finalResult = useMemo(() => {
    if (!task) return { resultUrl: null, is3D: false, step: undefined, finalTask: task };
    return getFinalResult(task);
  }, [task]);

  const { resultUrl, is3D, step } = finalResult;

  const formatDate = useCallback(
    (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [locale]
  );

  const handleDownload = useCallback(async () => {
    if (!resultUrl || !task) return;

    try {
      const response = await fetch(resultUrl);
      const blob = await response.blob();

      // Determine file extension from final task output (handles multi-step workflows)
      const finalTask = finalResult.finalTask || task;
      const format = (finalTask.outputData?.format as string) || (is3D ? 'glb' : 'png');
      const filename = `${task.tool.slug}-${task.id.slice(0, 8)}.${format}`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  }, [resultUrl, task, finalResult.finalTask, is3D]);

  const handleCopyUrl = useCallback(async () => {
    if (!resultUrl) return;

    try {
      await navigator.clipboard.writeText(resultUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }, [resultUrl]);

  // Get effective status considering child tasks
  const effectiveStatus = useMemo(() => {
    if (!task) return 'pending';
    if (task.childTasks && task.childTasks.length > 0) {
      const childStatuses = task.childTasks.map((c) => c.status);
      if (childStatuses.includes('failed')) return 'failed';
      if (childStatuses.includes('processing')) return 'processing';
      if (childStatuses.includes('pending')) return 'pending';
      if (childStatuses.every((s) => s === 'success')) return 'success';
      return 'processing';
    }
    return task.status;
  }, [task]);

  // Early return after all hooks
  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Modal: 60vw width on desktop (4:3), taller on mobile (3:4) for better preview */}
      <DialogContent className="!w-[90vw] sm:!w-[60vw] sm:!max-w-4xl !max-w-[calc(100%-2rem)] aspect-[3/4] sm:aspect-[4/3] overflow-hidden flex flex-col !p-0">
        <DialogHeader className="p-4 pb-2 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <HugeiconsIcon icon={is3D ? CubeIcon : Image01Icon} className="w-4 h-4" />
            {task.tool.title}
            {step && (
              <Badge variant="outline" className="ml-2 text-xs">
                {translations.step?.[step] || step}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Content Area - fills remaining space */}
        <div className="flex-1 overflow-auto px-4 pb-4 flex flex-col min-h-0">
          {/* Preview - fills available space */}
          <div className="relative bg-muted rounded-lg overflow-hidden flex-1 min-h-0">
            {effectiveStatus === 'success' && resultUrl ? (
              is3D ? (
                <div className="w-full h-full">
                  {/* Key forces clean remount when switching between different 3D models */}
                  <ModelViewer key={resultUrl} url={resultUrl} autoRotate allowMaximize className="w-full h-full" />
                </div>
              ) : (
                <div className="flex items-center justify-center p-4 w-full h-full">
                  <img
                    src={resultUrl}
                    alt={task.tool.title}
                    className="max-w-full max-h-full object-contain rounded"
                  />
                </div>
              )
            ) : effectiveStatus === 'failed' ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-destructive">
                <HugeiconsIcon icon={AlertCircleIcon} className="w-10 h-10" />
                <p className="text-sm text-center px-4">{finalResult.finalTask?.errorMessage || task.errorMessage || translations.error}</p>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">{translations.status[effectiveStatus]}</p>
                {effectiveStatus === 'processing' && (
                  <div className="w-32 h-2 bg-muted-foreground/20 rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Compact footer: badges, time, and actions in one row */}
          <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t shrink-0 flex-wrap">
            {/* Left: Badges and time */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={task.tool.type.badgeColor as 'default' | 'secondary' | 'outline'}
                className="text-xs"
              >
                {task.tool.type.name}
              </Badge>
              <Badge variant="outline" className={`text-xs ${statusStyles[effectiveStatus]}`}>
                {translations.status[effectiveStatus]}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <HugeiconsIcon icon={Clock01Icon} className="w-3 h-3" />
                {formatDate(task.createdAt)}
              </span>
            </div>

            {/* Right: Actions */}
            {effectiveStatus === 'success' && resultUrl && (
              <div className="flex items-center gap-2">
                <Button onClick={handleDownload} size="sm" className="gap-1.5 h-8">
                  <HugeiconsIcon icon={Download01Icon} className="w-3.5 h-3.5" />
                  {translations.download}
                </Button>
                <Button onClick={handleCopyUrl} variant="outline" size="sm" className="gap-1.5 h-8">
                  <HugeiconsIcon
                    icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
                    className="w-3.5 h-3.5"
                  />
                  {copied ? translations.copied : translations.copyUrl}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
