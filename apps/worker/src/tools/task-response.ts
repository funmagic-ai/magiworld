/**
 * @fileoverview Task Response Recording
 * @fileoverview 任务响应记录
 *
 * Utility to save raw provider request/response data for debugging and auditing.
 * Supports multi-step tools with step-specific responses.
 * 用于保存原始提供商请求/响应数据的工具，用于调试和审计。
 * 支持具有步骤特定响应的多步骤工具。
 *
 * @module @magiworld/worker/tools/task-response
 */

import { db, taskResponses } from '@magiworld/db';
import { createLogger } from '@magiworld/utils/logger';

const logger = createLogger('tool:task-response');

/**
 * Task response data to save
 * 要保存的任务响应数据
 */
export interface TaskResponseData {
  /** Task ID */
  taskId: string;
  /** Step name for multi-step tools (e.g., 'transform', '3d') */
  stepName?: string;
  /** Provider slug (e.g., 'openai', 'fal_ai') */
  provider?: string;
  /** Model name used */
  model?: string;
  /** Raw request sent to provider (will be stored as JSON) */
  rawRequest?: unknown;
  /** Raw response from provider (will be stored as JSON) */
  rawResponse?: unknown;
  /** API latency in milliseconds */
  latencyMs?: number;
  /** HTTP status code */
  statusCode?: number;
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Save a task response to the database
 * 将任务响应保存到数据库
 *
 * Use this after each provider API call to record the raw request/response.
 * For multi-step tools, call this once per step.
 * 在每次提供商 API 调用后使用此函数记录原始请求/响应。
 * 对于多步骤工具，每个步骤调用一次。
 *
 * @param data - Task response data to save
 * @returns The created response ID
 *
 * @example
 * ```typescript
 * // After OpenAI API call
 * await saveTaskResponse({
 *   taskId: ctx.taskId,
 *   stepName: 'transform',
 *   provider: 'openai',
 *   model: 'gpt-4o',
 *   rawRequest: requestPayload,
 *   rawResponse: response,
 *   latencyMs: 3500,
 *   statusCode: 200,
 * });
 * ```
 */
export async function saveTaskResponse(data: TaskResponseData): Promise<string> {
  try {
    const [result] = await db
      .insert(taskResponses)
      .values({
        taskId: data.taskId,
        stepName: data.stepName || null,
        provider: data.provider || null,
        model: data.model || null,
        rawRequest: data.rawRequest as Record<string, unknown> | null,
        rawResponse: data.rawResponse as Record<string, unknown> | null,
        latencyMs: data.latencyMs || null,
        statusCode: data.statusCode || null,
        errorMessage: data.errorMessage || null,
      })
      .returning({ id: taskResponses.id });

    logger.debug('Saved task response', {
      taskId: data.taskId,
      stepName: data.stepName,
      provider: data.provider,
      responseId: result.id,
    });

    return result.id;
  } catch (error) {
    // Log but don't throw - response recording should not fail the task
    logger.error('Failed to save task response', {
      taskId: data.taskId,
      stepName: data.stepName,
      error: error instanceof Error ? error.message : String(error),
    });
    return '';
  }
}

/**
 * Helper to sanitize response before saving
 * 保存前清理响应的辅助函数
 *
 * Removes base64 image data to reduce storage size.
 * 删除 base64 图像数据以减少存储大小。
 *
 * @param response - Raw response object
 * @returns Sanitized response
 */
export function sanitizeResponse(response: unknown): unknown {
  if (!response || typeof response !== 'object') {
    return response;
  }

  // Clone to avoid mutating original
  const sanitized = JSON.parse(JSON.stringify(response));

  // Recursively remove large base64 strings
  const removeBase64 = (obj: Record<string, unknown>): void => {
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === 'string' && value.length > 1000) {
        // Check if it looks like base64
        if (/^[A-Za-z0-9+/=]+$/.test(value.slice(0, 100))) {
          obj[key] = `[BASE64_REMOVED:${value.length} chars]`;
        }
      } else if (value && typeof value === 'object') {
        removeBase64(value as Record<string, unknown>);
      }
    }
  };

  removeBase64(sanitized);
  return sanitized;
}
