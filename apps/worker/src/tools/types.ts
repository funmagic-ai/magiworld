/**
 * @fileoverview Tool Processor Types
 * @fileoverview 工具处理器类型
 *
 * Type definitions for the tool processor pattern.
 * Developers write tool logic in code; admin configures credentials and pricing.
 * 工具处理器模式的类型定义。
 * 开发者在代码中编写工具逻辑；管理员配置凭据和定价。
 *
 * @module @magiworld/worker/tools/types
 */

import type { Job } from 'bullmq';
import type { TaskJobData, TaskJobResult } from '@magiworld/queue';

/**
 * Provider credentials fetched from database
 * 从数据库获取的提供商凭据
 */
export interface ProviderCredentials {
  /** Provider slug (e.g., 'fal_ai', 'openai', 'google') */
  slug: string;
  /** API key for authentication */
  apiKey: string;
  /** Optional base URL for the provider API */
  baseUrl?: string;
}

/**
 * Tool processing context passed to processors
 * 传递给处理器的工具处理上下文
 */
export interface ToolContext {
  /** Task ID */
  taskId: string;
  /** User ID */
  userId: string;
  /** Tool ID */
  toolId: string;
  /** Tool slug for routing and S3 organization */
  toolSlug: string;
  /** Input parameters from the task */
  inputParams: Record<string, unknown>;
  /** BullMQ job for progress updates */
  job: Job<TaskJobData, TaskJobResult>;
}

/**
 * Tool processing result
 * 工具处理结果
 */
export interface ToolResult {
  /** Output data (e.g., { resultUrl: string }) */
  outputData: Record<string, unknown>;
  /** Optional usage data for billing */
  usageData?: Record<string, unknown>;
}

/**
 * Tool processor function type
 * 工具处理器函数类型
 *
 * Each tool implements this function to process tasks.
 * For multi-step tools, any failure should throw immediately to avoid duplicate costs.
 * 每个工具实现此函数来处理任务。
 * 对于多步骤工具，任何失败都应立即抛出以避免重复成本。
 */
export type ToolProcessor = (ctx: ToolContext) => Promise<ToolResult>;

/**
 * Tool registration entry
 * 工具注册条目
 */
export interface ToolRegistration {
  /** Tool slug (matches TOOL_REGISTRY in @magiworld/types) */
  slug: string;
  /** Tool processor function */
  process: ToolProcessor;
  /** Description for logging */
  description?: string;
}
