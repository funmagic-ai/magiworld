'use client';

import { useState, useCallback, useRef } from 'react';

export type TaskStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface TaskUpdate {
  taskId: string;
  status: TaskStatus;
  progress: number;
  message?: string;
  outputData?: {
    resultUrl?: string;
    [key: string]: unknown;
  };
  error?: string;
  timestamp: number;
}

export interface CreateTaskParams {
  toolId: string;
  inputParams: Record<string, unknown>;
  idempotencyKey?: string;
  /** Parent task ID for multi-step workflows */
  parentTaskId?: string;
}

interface CreateTaskResponse {
  taskId: string;
  status: string;
  message: string;
}

export interface UseTaskState {
  taskId: string | null;
  status: TaskStatus | null;
  progress: number;
  outputData: TaskUpdate['outputData'] | null;
  error: string | null;
  isLoading: boolean;
}

export interface AttachToTaskParams {
  taskId: string;
  /** Initial progress (from fetched task data) */
  progress?: number;
  /** Initial output data (from fetched task data) */
  outputData?: TaskUpdate['outputData'];
}

export interface UseTaskReturn extends UseTaskState {
  createTask: (params: CreateTaskParams) => Promise<string | null>;
  /** Attach to an existing task and subscribe to its SSE stream */
  attachToTask: (params: AttachToTaskParams) => void;
  cancel: () => void;
  reset: () => void;
}

export function useTask(): UseTaskReturn {
  const [state, setState] = useState<UseTaskState>({
    taskId: null,
    status: null,
    progress: 0,
    outputData: null,
    error: null,
    isLoading: false,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const subscribeToUpdates = useCallback((taskId: string) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/tasks/${taskId}/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const update: TaskUpdate = JSON.parse(event.data);

        setState((prev) => ({
          ...prev,
          status: update.status,
          progress: update.progress,
          outputData: update.outputData || prev.outputData,
          error: update.error || null,
          isLoading: update.status === 'pending' || update.status === 'processing',
        }));

        if (update.status === 'success' || update.status === 'failed') {
          eventSource.close();
          eventSourceRef.current = null;
        }
      } catch (err) {
        console.error('[useTask] Failed to parse SSE message:', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('[useTask] SSE error:', err);
      eventSource.close();
      eventSourceRef.current = null;

      setState((prev) => ({
        ...prev,
        error: 'Connection lost. Please check task status.',
        isLoading: false,
      }));
    };
  }, []);

  const createTask = useCallback(
    async (params: CreateTaskParams): Promise<string | null> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setState({
        taskId: null,
        status: 'pending',
        progress: 0,
        outputData: null,
        error: null,
        isLoading: true,
      });

      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to create task: ${response.status}`);
        }

        const data: CreateTaskResponse = await response.json();

        setState((prev) => ({
          ...prev,
          taskId: data.taskId,
        }));

        subscribeToUpdates(data.taskId);

        return data.taskId;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null;
        }

        const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
        setState((prev) => ({
          ...prev,
          status: 'failed',
          error: errorMessage,
          isLoading: false,
        }));

        return null;
      }
    },
    [subscribeToUpdates]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      status: 'failed',
      error: 'Cancelled',
      isLoading: false,
    }));
  }, []);

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState({
      taskId: null,
      status: null,
      progress: 0,
      outputData: null,
      error: null,
      isLoading: false,
    });
  }, []);

  const attachToTask = useCallback(
    ({ taskId, progress = 0, outputData }: AttachToTaskParams) => {
      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      // Set initial state with provided data
      setState({
        taskId,
        status: 'processing',
        progress,
        outputData: outputData || null,
        error: null,
        isLoading: true,
      });

      // Subscribe to SSE for live updates
      subscribeToUpdates(taskId);
    },
    [subscribeToUpdates]
  );

  return {
    ...state,
    createTask,
    attachToTask,
    cancel,
    reset,
  };
}
