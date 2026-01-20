/**
 * @fileoverview Tool Processor Wrapper
 * @fileoverview 工具处理器包装器
 *
 * Wraps tool processor functions with BaseProcessor functionality
 * for progress updates, error handling, and usage logging.
 * 使用 BaseProcessor 功能包装工具处理器函数，
 * 用于进度更新、错误处理和使用日志记录。
 *
 * @module @magiworld/worker/tools/wrapper
 */

import type { Job } from 'bullmq';
import type { TaskJobData, TaskJobResult } from '@magiworld/queue';
import { BaseProcessor } from '../processors/base';
import type { ToolProcessor, ToolContext, ToolResult } from './types';
import { getToolProcessor, isToolRegistered } from './index';

/**
 * Tool Processor Wrapper
 * 工具处理器包装器
 *
 * Wraps tool processor functions to use BaseProcessor's common functionality.
 * 包装工具处理器函数以使用 BaseProcessor 的通用功能。
 */
export class ToolProcessorWrapper extends BaseProcessor {
  private toolSlug: string;
  private toolProcessor: ToolProcessor;

  constructor(toolSlug: string) {
    super();
    this.toolSlug = toolSlug;
    this.toolProcessor = getToolProcessor(toolSlug);
  }

  /**
   * Process a job using the tool processor
   * 使用工具处理器处理任务
   */
  async process(job: Job<TaskJobData, TaskJobResult>): Promise<TaskJobResult> {
    const { taskId, userId, toolId, toolSlug, inputParams, toolConfig } = job.data;

    return this.executeWithErrorHandling(job, async () => {
      // Create tool context
      const ctx: ToolContext = {
        taskId,
        userId,
        toolId,
        toolSlug: toolSlug || this.toolSlug,
        inputParams,
        toolConfig,
        job,
      };

      // Execute the tool processor
      const result: ToolResult = await this.toolProcessor(ctx);

      // Return in the format expected by executeWithErrorHandling
      return {
        outputData: result.outputData,
        usageData: result.usageData,
      };
    });
  }
}

/**
 * Get a tool processor wrapper for a tool slug
 * 获取工具 slug 的工具处理器包装器
 *
 * @param toolSlug - Tool slug
 * @returns ToolProcessorWrapper instance
 * @throws Error if tool is not registered
 */
export function getToolProcessorWrapper(toolSlug: string): ToolProcessorWrapper {
  if (!isToolRegistered(toolSlug)) {
    throw new Error(`Tool not registered: ${toolSlug}`);
  }
  return new ToolProcessorWrapper(toolSlug);
}

/**
 * Check if a tool slug is supported
 * 检查工具 slug 是否支持
 */
export function isToolSupported(toolSlug: string): boolean {
  return isToolRegistered(toolSlug);
}
