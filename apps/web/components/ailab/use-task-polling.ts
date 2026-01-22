'use client';

/**
 * @fileoverview Task Polling Hook (with SSE)
 *
 * Shared hook for fetching task lists with real-time updates:
 * - Initial fetch to get current task list
 * - SSE subscription for real-time updates
 * - Automatic reconnection on SSE failure
 * - Falls back to polling if SSE unavailable
 *
 * @module components/ailab/use-task-polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { type TaskItem, getEffectiveStatus } from './task-card';

/** Polling interval as fallback when SSE fails */
const FALLBACK_POLL_INTERVAL_MS = 5000;

/** SSE reconnection delay */
const SSE_RECONNECT_DELAY_MS = 3000;

type StatusFilter = 'all' | 'pending' | 'processing' | 'success' | 'failed';

export interface UseTaskPollingOptions {
  /** Locale for translations */
  locale: string;
  /** Filter by tool ID (for tool-specific task lists) */
  toolId?: string;
  /** Filter by status */
  filter?: StatusFilter;
  /** Maximum number of tasks to fetch */
  limit?: number;
  /** Only fetch root tasks (no child tasks) */
  rootOnly?: boolean;
  /** Include child tasks in response */
  includeChildren?: boolean;
}

export interface UseTaskPollingReturn {
  /** List of tasks */
  tasks: TaskItem[];
  /** Whether initial loading is in progress */
  isLoading: boolean;
  /** Manually trigger a refetch */
  refetch: () => Promise<void>;
}

interface TaskUpdate {
  taskId: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  progress: number;
  outputData?: Record<string, unknown>;
  error?: string;
}

/**
 * Hook for fetching task lists with real-time SSE updates
 *
 * - Fetches initial task list on mount
 * - Subscribes to SSE for real-time updates
 * - Updates task in list when SSE message arrives
 * - Falls back to polling if SSE fails
 */
export function useTaskPolling({
  locale,
  toolId,
  filter = 'all',
  limit,
  rootOnly = true,
  includeChildren = true,
}: UseTaskPollingOptions): UseTaskPollingReturn {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Refs for SSE and fallback polling
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasActiveTasks = useRef(false);

  // Build fetch params
  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ locale });
    if (toolId) params.set('toolId', toolId);
    if (filter !== 'all') params.set('status', filter);
    if (limit) params.set('limit', String(limit));
    if (rootOnly) params.set('rootOnly', 'true');
    if (includeChildren) params.set('includeChildren', 'true');
    return params;
  }, [locale, toolId, filter, limit, rootOnly, includeChildren]);

  // Fetch tasks from API
  const fetchTasks = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const response = await fetch(`/api/tasks?${buildParams()}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);

        // Check if any tasks are active
        hasActiveTasks.current = (data.tasks as TaskItem[]).some((task) => {
          const status = getEffectiveStatus(task);
          return status === 'pending' || status === 'processing';
        });
      }
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [buildParams]);

  // Update a single task in the list when SSE update arrives
  const updateTaskInList = useCallback((update: TaskUpdate) => {
    setTasks((prevTasks) => {
      // Find and update the task (could be root or child)
      const updatedTasks = prevTasks.map((task) => {
        // Check if this is the task being updated
        if (task.id === update.taskId) {
          return {
            ...task,
            status: update.status,
            progress: update.progress,
            outputData: update.outputData || task.outputData,
            errorMessage: update.error || task.errorMessage,
          };
        }

        // Check if it's a child task
        if (task.childTasks) {
          const updatedChildren = task.childTasks.map((child) => {
            if (child.id === update.taskId) {
              return {
                ...child,
                status: update.status,
                progress: update.progress,
                outputData: update.outputData || child.outputData,
                errorMessage: update.error || child.errorMessage,
              };
            }
            return child;
          });

          // Only return new object if children actually changed
          const hasChange = updatedChildren.some((c, i) => c !== task.childTasks![i]);
          if (hasChange) {
            return { ...task, childTasks: updatedChildren };
          }
        }

        return task;
      });

      // Check if we still have active tasks
      hasActiveTasks.current = updatedTasks.some((task) => {
        const status = getEffectiveStatus(task);
        return status === 'pending' || status === 'processing';
      });

      return updatedTasks;
    });
  }, []);

  // Start SSE connection
  const startSSE = useCallback(() => {
    // Don't start if already connected or no active tasks
    if (eventSourceRef.current) return;

    const eventSource = new EventSource('/api/tasks/stream');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Skip connection messages
        if (data.type === 'connected') return;

        // Update task in list
        if (data.taskId) {
          updateTaskInList(data as TaskUpdate);
        }
      } catch (error) {
        console.error('[SSE] Failed to parse message:', error);
      }
    };

    eventSource.onerror = () => {
      console.warn('[SSE] Connection error, will reconnect...');
      eventSource.close();
      eventSourceRef.current = null;

      // Schedule reconnection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        if (hasActiveTasks.current && document.visibilityState === 'visible') {
          startSSE();
        }
      }, SSE_RECONNECT_DELAY_MS);
    };
  }, [updateTaskInList]);

  // Stop SSE connection
  const stopSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  // Start fallback polling (only used if SSE completely fails)
  const startFallbackPolling = useCallback(() => {
    if (fallbackPollRef.current) return;

    fallbackPollRef.current = setInterval(() => {
      if (hasActiveTasks.current && document.visibilityState === 'visible') {
        fetchTasks(false);
      }
    }, FALLBACK_POLL_INTERVAL_MS);
  }, [fetchTasks]);

  const stopFallbackPolling = useCallback(() => {
    if (fallbackPollRef.current) {
      clearInterval(fallbackPollRef.current);
      fallbackPollRef.current = null;
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // SSE subscription (visibility-aware)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refetch to catch up on any missed updates
        if (hasActiveTasks.current) {
          fetchTasks(false);
        }
        startSSE();
      } else {
        stopSSE();
      }
    };

    // Start SSE if tab is visible
    if (document.visibilityState === 'visible') {
      startSSE();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopSSE();
      stopFallbackPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [startSSE, stopSSE, stopFallbackPolling, fetchTasks]);

  return {
    tasks,
    isLoading,
    refetch: () => fetchTasks(false),
  };
}
