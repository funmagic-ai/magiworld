import type {
  TaskJobData,
  TaskPriority,
  TaskUpdateMessage,
  IdempotencyResult,
  PriceConfig,
} from '@magiworld/queue';

export interface CreateTaskParams {
  taskId: string;
  userId: string;
  toolId: string;
  toolSlug: string;
  inputParams: Record<string, unknown>;
  priceConfig?: PriceConfig;
  toolConfig?: Record<string, unknown>;
  priority?: TaskPriority;
  idempotencyKey?: string;
  requestId?: string;
  timeout?: number;
}

export async function enqueueTask(params: CreateTaskParams): Promise<string> {
  const { enqueueTask: _enqueue, TaskPriority: _Priority } = await import('@magiworld/queue');

  const jobData: TaskJobData = {
    taskId: params.taskId,
    userId: params.userId,
    toolId: params.toolId,
    toolSlug: params.toolSlug,
    inputParams: params.inputParams,
    priceConfig: params.priceConfig,
    toolConfig: params.toolConfig,
    priority: params.priority ?? _Priority.WEB,
    idempotencyKey: params.idempotencyKey,
    requestId: params.requestId,
    timeout: params.timeout,
  };

  // All tasks go to default queue (prefix separates web vs admin)
  return _enqueue(jobData);
}

export async function checkUserConcurrency(
  userId: string,
  maxConcurrent?: number
): Promise<{ allowed: boolean; current: number; max: number }> {
  const { checkUserConcurrency: _check } = await import('@magiworld/queue');
  return _check(userId, maxConcurrent);
}

export async function incrementUserTasks(userId: string): Promise<number> {
  const { incrementUserTasks: _incr } = await import('@magiworld/queue');
  return _incr(userId);
}

export async function checkIdempotency(
  userId: string,
  idempotencyKey: string
): Promise<IdempotencyResult> {
  const { checkIdempotency: _check } = await import('@magiworld/queue');
  return _check(userId, idempotencyKey);
}

export async function setIdempotency(
  userId: string,
  idempotencyKey: string,
  taskId: string
): Promise<void> {
  const { setIdempotency: _set } = await import('@magiworld/queue');
  return _set(userId, idempotencyKey, taskId);
}

export async function generateIdempotencyKey(
  data: Record<string, unknown>
): Promise<string> {
  const { generateIdempotencyKey: _gen } = await import('@magiworld/queue');
  return _gen(data);
}

export async function createTaskSubscriber() {
  const { createTaskSubscriber: _create, subscribeToTaskUpdates: _subscribe } =
    await import('@magiworld/queue');
  return { createSubscriber: _create, subscribeToUpdates: _subscribe };
}

export type { TaskJobData, TaskPriority, TaskUpdateMessage, IdempotencyResult };
