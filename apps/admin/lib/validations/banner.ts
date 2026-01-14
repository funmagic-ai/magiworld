/**
 * @fileoverview Banner Form Validation Schema
 * @fileoverview 横幅表单验证模式
 *
 * Zod validation schemas for banner create/update forms.
 * 用于横幅创建/更新表单的Zod验证模式。
 *
 * @module lib/validations/banner
 */

import { z } from 'zod';

/**
 * Translation schema for banner content / 横幅内容翻译模式
 *
 * Validates title (required) and subtitle (optional) for each locale.
 * 验证每个语言的标题（必填）和副标题（可选）。
 */
const translationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
});

/**
 * Banner form validation schema / 横幅表单验证模式
 *
 * Complete schema for banner form data including translations.
 * 横幅表单数据的完整模式，包含翻译。
 *
 * @property type - Banner type: 'main' or 'side' / 横幅类型
 * @property imageUrl - CDN URL to banner image / 横幅图片URL
 * @property link - Click destination URL / 点击跳转URL
 * @property order - Display order (0+) / 显示顺序
 * @property isActive - Whether banner is enabled / 是否启用
 * @property translations - Multi-locale content / 多语言内容
 */
export const bannerSchema = z.object({
  type: z.enum(['main', 'side'], { message: 'Banner type is required' }),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
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
 * TypeScript type inferred from banner schema / 从横幅模式推断的TypeScript类型
 */
export type BannerFormValues = z.infer<typeof bannerSchema>;

/**
 * Human-readable field error messages / 人类可读的字段错误消息
 *
 * Used for custom error display in form components.
 * 用于表单组件中的自定义错误显示。
 */
export const bannerFieldErrors = {
  type: {
    required: 'Please select a banner type',
  },
  link: {
    pattern: 'Must be a valid URL (e.g., https://example.com or /studio/edit)',
  },
  translations: {
    required: 'All locale titles (en, zh, ja, pt) are required',
  },
};
