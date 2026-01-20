/**
 * @fileoverview Tool Form Validation Schema
 * @fileoverview 工具表单验证模式
 *
 * Zod validation schemas for AI tool create/update forms.
 * Includes slug validation against the TOOL_REGISTRY to ensure
 * only registered tool components can be created.
 * 用于AI工具创建/更新表单的Zod验证模式。
 * 包含针对TOOL_REGISTRY的slug验证，确保只能创建已注册的工具组件。
 *
 * @module lib/validations/tool
 */

import { z } from 'zod';
import { TOOL_REGISTRY } from '@magiworld/types';

/**
 * Translation schema for tool content / 工具内容翻译模式
 *
 * Validates title (required) and description (optional) for each locale.
 * 验证每个语言的标题（必填）和描述（可选）。
 */
const translationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
});

/**
 * Price configuration schema / 价格配置模式
 *
 * Flexible pricing for different billing models.
 * 灵活的价格配置，支持不同的计费模式。
 */
const priceConfigSchema = z.object({
  type: z.enum(['token', 'request', 'image', 'second']),
  input_per_1k: z.number().optional(),
  output_per_1k: z.number().optional(),
  cost_per_call: z.number().optional(),
  cost_per_image: z.number().optional(),
  cost_per_second: z.number().optional(),
}).optional();

/**
 * Tool form validation schema / 工具表单验证模式
 *
 * Complete schema for tool form data including translations.
 * Slug must match a registered tool component in TOOL_REGISTRY.
 * Provider/model selection is handled by tool processors in worker code.
 * 工具表单数据的完整模式，包含翻译。
 * Slug必须匹配TOOL_REGISTRY中已注册的工具组件。
 * Provider/模型选择由worker代码中的工具处理器处理。
 *
 * @property slug - Must match TOOL_REGISTRY / 必须匹配TOOL_REGISTRY
 * @property toolTypeId - Parent tool type UUID / 父工具类型UUID
 * @property priceConfig - Pricing configuration / 价格配置
 * @property thumbnailUrl - Tool thumbnail CDN URL / 工具缩略图CDN URL
 * @property configJson - Tool-specific config (UI options, processing hints) / 工具特定配置
 * @property order - Display order (0+) / 显示顺序
 * @property isActive - Whether tool is enabled / 是否启用
 * @property isFeatured - Whether tool is featured / 是否推荐
 * @property translations - Multi-locale content / 多语言内容
 */
export const toolSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .refine(
      (slug) => TOOL_REGISTRY.includes(slug as typeof TOOL_REGISTRY[number]),
      {
        message: `Slug must match a registered tool component. Valid slugs: ${TOOL_REGISTRY.join(', ')}`,
      }
    ),
  toolTypeId: z.string().uuid('Tool type is required'),
  priceConfig: priceConfigSchema,
  thumbnailUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  referenceImages: z.array(z.string().url('Must be a valid URL')).optional(),
  configJson: z.record(z.string(), z.unknown()).optional(),
  order: z.number().int().min(0, 'Order must be 0 or greater'),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  translations: z.object({
    en: translationSchema,
    zh: translationSchema,
    ja: translationSchema,
    pt: translationSchema,
  }),
});

/**
 * TypeScript type inferred from tool schema / 从工具模式推断的TypeScript类型
 */
export type ToolFormValues = z.infer<typeof toolSchema>;

/**
 * Human-readable field error messages / 人类可读的字段错误消息
 *
 * Used for custom error display in form components.
 * 用于表单组件中的自定义错误显示。
 */
export const toolFieldErrors = {
  slug: {
    required: 'Slug is required',
    pattern: 'Use lowercase letters, numbers, and hyphens only (e.g., "background-remove")',
    notRegistered: `Slug must match a registered tool component. Valid slugs: ${TOOL_REGISTRY.join(', ')}`,
  },
  toolTypeId: {
    required: 'Please select a tool type',
  },
  translations: {
    required: 'All locale titles (en, zh, ja, pt) are required',
  },
};

/**
 * List of valid tool slugs for display in UI / 在UI中显示的有效工具slug列表
 *
 * Exported for use in form dropdowns and validation messages.
 * 导出用于表单下拉列表和验证消息。
 */
export const validToolSlugs = TOOL_REGISTRY;
