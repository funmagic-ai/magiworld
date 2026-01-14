/**
 * @fileoverview Tool Type Form Validation Schema
 * @fileoverview 工具类型表单验证模式
 *
 * Zod validation schemas for tool type (category) create/update forms.
 * 用于工具类型（分类）创建/更新表单的Zod验证模式。
 *
 * @module lib/validations/tool-type
 */

import { z } from 'zod';

/**
 * Translation schema for tool type content / 工具类型内容翻译模式
 *
 * Validates name (required) and description (optional) for each locale.
 * 验证每个语言的名称（必填）和描述（可选）。
 */
const translationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

/**
 * Tool type form validation schema / 工具类型表单验证模式
 *
 * Complete schema for tool type form data including translations.
 * 工具类型表单数据的完整模式，包含翻译。
 *
 * @property slug - URL-friendly identifier / URL友好的标识符
 * @property badgeColor - Badge color variant / 徽章颜色变体
 * @property order - Display order (0+) / 显示顺序
 * @property isActive - Whether type is enabled / 是否启用
 * @property translations - Multi-locale content / 多语言内容
 */
export const toolTypeSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  badgeColor: z.enum(['default', 'secondary', 'outline']),
  order: z.number().int().min(0, 'Order must be 0 or greater'),
  isActive: z.boolean(),
  translations: z.object({
    en: translationSchema,
    zh: translationSchema,
    ja: translationSchema,
    pt: translationSchema,
  }),
});

/**
 * TypeScript type inferred from tool type schema / 从工具类型模式推断的TypeScript类型
 */
export type ToolTypeFormValues = z.infer<typeof toolTypeSchema>;

/**
 * Human-readable field error messages / 人类可读的字段错误消息
 *
 * Used for custom error display in form components.
 * 用于表单组件中的自定义错误显示。
 */
export const toolTypeFieldErrors = {
  slug: {
    required: 'Slug is required',
    pattern: 'Use lowercase letters, numbers, and hyphens only (e.g., "edit-tools")',
  },
  translations: {
    required: 'All locale names (en, zh, ja, pt) are required',
  },
};
