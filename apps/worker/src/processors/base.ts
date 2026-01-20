/**
 * @fileoverview Base Processor Class
 * @fileoverview 基础处理器类
 *
 * Abstract base class for AI task processors with common functionality.
 * 带有通用功能的 AI 任务处理器抽象基类。
 *
 * @module @magiworld/worker/processors/base
 */

import type { Job } from 'bullmq';
import { db, tasks, adminTasks, taskUsageLogs, providers, eq } from '@magiworld/db';
import {
  publishTaskUpdate,
  createTaskUpdateMessage,
  decrementUserTasks,
  type TaskJobData,
  type TaskJobResult,
  type TaskStatus,
  type PriceConfig,
} from '@magiworld/queue';
import { createLogger } from '@magiworld/utils/logger';
import { uploadBase64Image } from '../s3';

const logger = createLogger('processor');

/**
 * Processor interface
 * 处理器接口
 */
export interface Processor {
  process(job: Job<TaskJobData, TaskJobResult>): Promise<TaskJobResult>;
}

/**
 * Processing result with optional usage data
 * 带可选使用数据的处理结果
 */
export interface ProcessResult {
  outputData: Record<string, unknown>;
  usageData?: Record<string, unknown>;
}

/**
 * Base processor class with common functionality
 * 带有通用功能的基础处理器类
 */
export abstract class BaseProcessor implements Processor {
  protected logger = createLogger(this.constructor.name);

  /**
   * Process a job - to be implemented by subclasses
   * 处理任务 - 由子类实现
   */
  abstract process(job: Job<TaskJobData, TaskJobResult>): Promise<TaskJobResult>;

  /**
   * Check if the job is for an admin task
   * 检查作业是否为管理员任务
   *
   * Admin tasks have toolId starting with "admin:"
   * 管理员任务的 toolId 以 "admin:" 开头
   */
  protected isAdminTask(job: Job<TaskJobData, TaskJobResult>): boolean {
    return job.data.toolId.startsWith('admin:');
  }

  /**
   * Get the appropriate tasks table for the job
   * 获取适用于作业的任务表
   */
  protected getTasksTable(job: Job<TaskJobData, TaskJobResult>) {
    return this.isAdminTask(job) ? adminTasks : tasks;
  }

  /**
   * Get the user ID field name for the tasks table
   * 获取任务表的用户 ID 字段名
   */
  protected getTaskIdField(job: Job<TaskJobData, TaskJobResult>) {
    return this.isAdminTask(job) ? adminTasks.id : tasks.id;
  }

  /**
   * Update task progress and publish to Redis
   * 更新任务进度并发布到 Redis
   *
   * @param job - BullMQ job / BullMQ 任务
   * @param progress - Progress percentage (0-100) / 进度百分比
   * @param message - Optional status message / 可选状态消息
   */
  protected async updateProgress(
    job: Job<TaskJobData, TaskJobResult>,
    progress: number,
    message?: string
  ): Promise<void> {
    const { taskId, userId } = job.data;

    // Update BullMQ job progress
    await job.updateProgress(progress);

    // Update database (use correct table based on task type)
    // Note: status stays 'processing' - only completeTask sets 'success'
    // This prevents SSE stream from closing before outputData is received
    const tasksTable = this.getTasksTable(job);
    const idField = this.getTaskIdField(job);
    await db
      .update(tasksTable)
      .set({
        progress,
        status: 'processing',
        updatedAt: new Date(),
        ...(progress === 0 && { startedAt: new Date() }),
      })
      .where(eq(idField, taskId));

    // Publish to Redis for SSE
    // Note: status stays 'processing' - only completeTask publishes 'success'
    await publishTaskUpdate(
      createTaskUpdateMessage({
        taskId,
        userId,
        status: 'processing',
        progress,
        message,
      })
    );
  }

  /**
   * Mark task as completed with output data
   * 将任务标记为已完成并附带输出数据
   *
   * @param job - BullMQ job / BullMQ 任务
   * @param outputData - Result data / 结果数据
   */
  protected async completeTask(
    job: Job<TaskJobData, TaskJobResult>,
    outputData: Record<string, unknown>
  ): Promise<void> {
    const { taskId, userId } = job.data;

    // Update database (use correct table based on task type)
    const tasksTable = this.getTasksTable(job);
    const idField = this.getTaskIdField(job);
    await db
      .update(tasksTable)
      .set({
        status: 'success',
        progress: 100,
        outputData,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(idField, taskId));

    // Decrement user's active task count
    await decrementUserTasks(userId);

    // Publish completion to Redis
    await publishTaskUpdate(
      createTaskUpdateMessage({
        taskId,
        userId,
        status: 'success',
        progress: 100,
        outputData,
      })
    );
  }

  /**
   * Mark task as failed with error
   * 将任务标记为失败并附带错误信息
   *
   * @param job - BullMQ job / BullMQ 任务
   * @param error - Error message / 错误消息
   */
  protected async failTask(
    job: Job<TaskJobData, TaskJobResult>,
    error: string
  ): Promise<void> {
    const { taskId, userId } = job.data;

    // Update database (use correct table based on task type)
    const tasksTable = this.getTasksTable(job);
    const idField = this.getTaskIdField(job);
    await db
      .update(tasksTable)
      .set({
        status: 'failed',
        errorMessage: error,
        attemptsMade: job.attemptsMade,
        updatedAt: new Date(),
      })
      .where(eq(idField, taskId));

    // Decrement user's active task count
    await decrementUserTasks(userId);

    // Publish failure to Redis
    await publishTaskUpdate(
      createTaskUpdateMessage({
        taskId,
        userId,
        status: 'failed',
        progress: job.progress as number || 0,
        error,
      })
    );
  }

  /**
   * Upload base64 image result to S3
   * 将 base64 图像结果上传到 S3
   *
   * @param userId - User ID / 用户 ID
   * @param taskId - Task ID / 任务 ID
   * @param base64 - Base64-encoded image / Base64 编码的图像
   * @param mimeType - MIME type / MIME 类型
   * @returns S3 URL / S3 URL
   */
  protected async uploadResult(
    userId: string,
    taskId: string,
    base64: string,
    mimeType: string = 'image/png'
  ): Promise<string> {
    return uploadBase64Image(userId, taskId, base64, mimeType);
  }

  /**
   * Log task usage for billing and analytics
   * 记录任务使用情况用于计费和分析
   *
   * Tool processors should include provider and model info in usageData.
   * 工具处理器应在 usageData 中包含提供商和模型信息。
   *
   * @param job - BullMQ job / BullMQ 任务
   * @param usageData - Provider-specific usage data including provider/model info / 包含提供商/模型信息的使用数据
   * @param latencyMs - Task execution latency in milliseconds / 任务执行延迟（毫秒）
   * @param status - Task status (success/failed) / 任务状态
   * @param errorMessage - Error message if failed / 失败时的错误消息
   */
  protected async logUsage(
    job: Job<TaskJobData, TaskJobResult>,
    usageData?: Record<string, unknown>,
    latencyMs?: number,
    status: 'success' | 'failed' = 'success',
    errorMessage?: string
  ): Promise<void> {
    const { taskId, userId, toolId, priceConfig } = job.data;

    // Only log if we have valid price config and usage data
    if (!priceConfig) {
      this.logger.debug(`Skipping usage log - no priceConfig for task ${taskId}`);
      return;
    }

    // Extract provider info from usageData (tool processors should include this)
    const providerSlug = usageData?.provider as string || 'unknown';
    const modelName = usageData?.model as string || 'unknown';
    const modelVersion = usageData?.modelVersion as string || null;

    try {
      // Lookup providerId from slug for the log entry
      const [provider] = await db.select({ id: providers.id }).from(providers).where(eq(providers.slug, providerSlug)).limit(1);
      const providerId = provider?.id;

      if (!providerId) {
        this.logger.warn(`Provider not found for usage log: ${providerSlug}`, { taskId });
        return;
      }

      await db.insert(taskUsageLogs).values({
        taskId,
        userId,
        providerId,
        toolId,
        modelName,
        modelVersion,
        priceConfig,
        usageData: usageData || null,
        latencyMs: latencyMs || null,
        status,
        errorMessage: errorMessage || null,
      });

      this.logger.debug(`Logged usage for task ${taskId}`, { status, latencyMs, provider: providerSlug });
    } catch (error) {
      // Don't fail the task if logging fails, just log the error
      this.logger.error(`Failed to log usage for task ${taskId}`, {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Wrap processor execution with error handling and usage logging
   * 使用错误处理和使用日志包装处理器执行
   *
   * @param job - BullMQ job / BullMQ 任务
   * @param processFn - Processing function that returns output and optional usage data / 返回输出和可选使用数据的处理函数
   * @returns Task result / 任务结果
   */
  protected async executeWithErrorHandling(
    job: Job<TaskJobData, TaskJobResult>,
    processFn: () => Promise<Record<string, unknown> | { outputData: Record<string, unknown>; usageData?: Record<string, unknown> }>
  ): Promise<TaskJobResult> {
    const startTime = Date.now();

    try {
      // Mark as processing
      await this.updateProgress(job, 0, 'Starting task');

      // Execute the processing function
      const result = await processFn();

      // Handle both legacy format (just outputData) and new format (with usageData)
      let outputData: Record<string, unknown>;
      let usageData: Record<string, unknown> | undefined;

      if ('outputData' in result && typeof result.outputData === 'object') {
        outputData = result.outputData as Record<string, unknown>;
        usageData = result.usageData as Record<string, unknown> | undefined;
      } else {
        outputData = result;
      }

      // Mark as completed
      await this.completeTask(job, outputData);

      const duration = Date.now() - startTime;

      // Log usage for billing and analytics
      await this.logUsage(job, usageData, duration, 'success');

      this.logger.info(`Task completed`, { taskId: job.data.taskId, duration });

      return {
        success: true,
        outputData,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(`Task failed`, {
        taskId: job.data.taskId,
        error: errorMessage,
        duration,
      });

      await this.failTask(job, errorMessage);

      // Log failed usage for analytics
      await this.logUsage(job, undefined, duration, 'failed', errorMessage);

      return {
        success: false,
        error: errorMessage,
        duration,
      };
    }
  }
}
