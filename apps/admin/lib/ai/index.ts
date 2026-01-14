/**
 * @fileoverview AI Service Layer
 * @fileoverview AI服务层
 *
 * Configures and exports AI providers for the admin application.
 * Uses Vercel AI SDK with Fal.ai provider for image processing.
 * 配置并导出管理后台应用的AI提供商。
 * 使用Vercel AI SDK和Fal.ai提供商进行图像处理。
 *
 * @module lib/ai
 */

import { createFal } from '@ai-sdk/fal';

/**
 * Fal.ai provider instance / Fal.ai提供商实例
 *
 * Configured with API key from FAL_API_KEY environment variable.
 * Used for image generation and processing tasks.
 * 使用FAL_API_KEY环境变量中的API密钥配置。
 * 用于图像生成和处理任务。
 */
export const fal = createFal({
  // API key is read from FAL_API_KEY environment variable by default
});

// Re-export all tools / 重新导出所有工具
export * from './tools';
