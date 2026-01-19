/**
 * @fileoverview Magi Internal Tools Configuration
 * @fileoverview Magi 内部工具配置
 *
 * Defines internal admin Magi tools that don't require database entries.
 * These tools are processed by the worker using their slug as identifier.
 * 定义不需要数据库条目的内部管理员 Magi 工具。
 * 这些工具由 worker 使用其 slug 作为标识符进行处理。
 *
 * @module lib/magi-tools
 */

/**
 * Magi tool configuration interface
 * Magi 工具配置接口
 */
export interface MagiToolConfig {
  /** Tool slug - used as identifier / 工具 slug - 用作标识符 */
  slug: string;
  /** Display name / 显示名称 */
  name: string;
  /** Tool description / 工具描述 */
  description: string;
  /** Is tool active / 工具是否激活 */
  isActive: boolean;
  /** Tool configuration passed to worker / 传递给 worker 的工具配置 */
  configJson?: Record<string, unknown>;
  /** Price configuration (optional for internal tools) / 价格配置（内部工具可选） */
  priceConfig?: {
    basePrice: number;
    currency: string;
  };
}

/**
 * Internal Magi tools configuration
 * 内部 Magi 工具配置
 *
 * These tools are available in the admin Magi interface and
 * are processed by the worker without requiring database entries.
 * 这些工具在管理员 Magi 界面中可用，
 * 由 worker 处理，无需数据库条目。
 */
export const MAGI_TOOLS: Record<string, MagiToolConfig> = {
  'background-remove': {
    slug: 'background-remove',
    name: 'Remove Background',
    description: 'Remove backgrounds from images using AI',
    isActive: true,
    configJson: {
      provider: 'fal_ai',
      model: 'fal-ai/bria/background/remove',
    },
  },
  'image-generate': {
    slug: 'image-generate',
    name: 'Generate Image',
    description: 'Create images from text prompts',
    isActive: true,
    configJson: {
      provider: 'fal_ai',
      model: 'fal-ai/flux/dev',
    },
  },
  'image-upscale': {
    slug: 'image-upscale',
    name: 'Upscale Image',
    description: 'Enhance image resolution with AI',
    isActive: true,
    configJson: {
      provider: 'fal_ai',
      model: 'fal-ai/clarity-upscaler',
    },
  },
  'image-rerender': {
    slug: 'image-rerender',
    name: 'Rerender Image',
    description: 'Transform images with AI styles',
    isActive: true,
    configJson: {
      provider: 'fal_ai',
      model: 'fal-ai/creative-upscaler',
    },
  },
  'nanobanana': {
    slug: 'nanobanana',
    name: 'Nanobanana Pro',
    description: 'Generate images with Gemini',
    isActive: true,
    configJson: {
      provider: 'google',
      model: 'gemini-2.0-flash-exp',
    },
  },
};

/**
 * Check if a slug is a Magi internal tool
 * 检查 slug 是否是 Magi 内部工具
 *
 * @param slug - Tool slug to check / 要检查的工具 slug
 * @returns true if it's a Magi tool / 如果是 Magi 工具则返回 true
 */
export function isMagiTool(slug: string): boolean {
  return slug in MAGI_TOOLS;
}

/**
 * Get Magi tool configuration by slug
 * 通过 slug 获取 Magi 工具配置
 *
 * @param slug - Tool slug / 工具 slug
 * @returns Tool configuration or null / 工具配置或 null
 */
export function getMagiTool(slug: string): MagiToolConfig | null {
  return MAGI_TOOLS[slug] || null;
}

/**
 * Get all active Magi tools
 * 获取所有激活的 Magi 工具
 *
 * @returns Array of active Magi tools / 激活的 Magi 工具数组
 */
export function getActiveMagiTools(): MagiToolConfig[] {
  return Object.values(MAGI_TOOLS).filter((tool) => tool.isActive);
}
