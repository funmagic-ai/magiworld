/**
 * @fileoverview Tool Processor Registry
 * @fileoverview 工具处理器注册表
 *
 * Registry of tool processors by slug.
 * Each tool slug maps to a processor function that handles the business logic.
 * Developers add new tools here; admin configures credentials and pricing in DB.
 * 按 slug 的工具处理器注册表。
 * 每个工具 slug 映射到处理业务逻辑的处理器函数。
 * 开发者在此添加新工具；管理员在数据库中配置凭据和定价。
 *
 * @module @magiworld/worker/tools
 */

import type { ToolProcessor, ToolRegistration } from './types';

// Import tool processors
import { processBackgroundRemove } from './background-remove';
import { processImageGenerate } from './image-generate';
import { processImageUpscale } from './image-upscale';
import { processImageRerender } from './image-rerender';
import { processNanobanana } from './nanobanana';

/**
 * Tool processor registry
 * 工具处理器注册表
 *
 * Add new tools here. The slug must match the TOOL_REGISTRY in @magiworld/types.
 * 在此添加新工具。slug 必须匹配 @magiworld/types 中的 TOOL_REGISTRY。
 */
const TOOL_PROCESSORS: Record<string, ToolRegistration> = {
  'background-remove': {
    slug: 'background-remove',
    process: processBackgroundRemove,
    description: 'Remove background from images using fal.ai',
  },
  'image-generate': {
    slug: 'image-generate',
    process: processImageGenerate,
    description: 'Generate images from text prompts using fal.ai flux/schnell',
  },
  'image-upscale': {
    slug: 'image-upscale',
    process: processImageUpscale,
    description: 'Upscale images to higher resolution using fal.ai Real-ESRGAN',
  },
  'image-rerender': {
    slug: 'image-rerender',
    process: processImageRerender,
    description: 'Transform images with AI using text prompts via fal.ai flux/dev',
  },
  'nanobanana': {
    slug: 'nanobanana',
    process: processNanobanana,
    description: 'Generate images using Google Gemini 2.0 Flash with text and image inputs',
  },
};

/**
 * Get tool processor by slug
 * 按 slug 获取工具处理器
 *
 * @param toolSlug - Tool slug (e.g., 'background-remove')
 * @returns Tool processor function
 * @throws Error if tool is not registered
 */
export function getToolProcessor(toolSlug: string): ToolProcessor {
  const registration = TOOL_PROCESSORS[toolSlug];

  if (!registration) {
    throw new Error(
      `Tool not registered: ${toolSlug}. Available tools: ${Object.keys(TOOL_PROCESSORS).join(', ')}`
    );
  }

  return registration.process;
}

/**
 * Check if a tool is registered
 * 检查工具是否已注册
 *
 * @param toolSlug - Tool slug
 * @returns Whether the tool is registered
 */
export function isToolRegistered(toolSlug: string): boolean {
  return toolSlug in TOOL_PROCESSORS;
}

/**
 * Get list of registered tools
 * 获取已注册工具列表
 *
 * @returns Array of tool slugs
 */
export function getRegisteredTools(): string[] {
  return Object.keys(TOOL_PROCESSORS);
}

/**
 * Get tool registration info
 * 获取工具注册信息
 *
 * @param toolSlug - Tool slug
 * @returns Tool registration or undefined
 */
export function getToolRegistration(toolSlug: string): ToolRegistration | undefined {
  return TOOL_PROCESSORS[toolSlug];
}

// Re-export types and utilities
export * from './types';
export * from './provider-client';
export * from './wrapper';
