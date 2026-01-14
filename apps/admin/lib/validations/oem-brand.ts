/**
 * @fileoverview OEM Brand Form Validation Schema
 * @fileoverview OEM品牌表单验证模式
 *
 * Zod validation schemas for OEM (white-label) brand create/update forms.
 * Includes theme configuration with predefined color palettes.
 * 用于OEM（白标）品牌创建/更新表单的Zod验证模式。
 * 包含使用预定义颜色调色板的主题配置。
 *
 * @module lib/validations/oem-brand
 */

import { z } from 'zod';
import { brandPalettes } from '@/lib/brand-palettes';

/**
 * Theme configuration schema for OEM brands / OEM品牌主题配置模式
 *
 * Uses predefined palettes for consistency and accessibility.
 * 使用预定义调色板保持一致性和可访问性。
 *
 * @property palette - Palette key from brandPalettes / 品牌调色板键
 * @property logo - CDN URL to brand logo / 品牌Logo的CDN URL
 * @property brandName - Display name in UI / UI中显示的名称
 */
const themeConfigSchema = z.object({
  palette: z.enum(Object.keys(brandPalettes) as [string, ...string[]]).default('neutral'),
  logo: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  brandName: z.string().optional(),
});

/**
 * OEM brand form validation schema / OEM品牌表单验证模式
 *
 * Complete schema for OEM brand form data.
 * OEM品牌表单数据的完整模式。
 *
 * @property slug - URL-friendly identifier / URL友好的标识符
 * @property name - Internal brand name / 内部品牌名称
 * @property softwareId - Unique software identifier (uppercase) / 唯一软件标识符（大写）
 * @property themeConfig - Theme and branding settings / 主题和品牌设置
 * @property allowedToolTypeIds - Permitted tool type UUIDs / 允许的工具类型UUID列表
 * @property isActive - Whether brand is enabled / 是否启用
 */
export const oemBrandSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  name: z.string().min(1, 'Name is required'),
  softwareId: z
    .string()
    .min(1, 'Software ID is required')
    .regex(/^[A-Z0-9_]+$/, 'Software ID must be uppercase letters, numbers, and underscores only'),
  themeConfig: themeConfigSchema,
  allowedToolTypeIds: z.array(z.string().uuid()).default([]),
  isActive: z.boolean(),
});

/**
 * TypeScript type inferred from OEM brand schema / 从OEM品牌模式推断的TypeScript类型
 */
export type OemBrandFormValues = z.infer<typeof oemBrandSchema>;

/**
 * Human-readable field error messages / 人类可读的字段错误消息
 *
 * Used for custom error display in form components.
 * 用于表单组件中的自定义错误显示。
 */
export const oemBrandFieldErrors = {
  slug: {
    required: 'Slug is required',
    pattern: 'Use lowercase letters, numbers, and hyphens only (e.g., "partner-a")',
  },
  name: {
    required: 'Name is required',
  },
  softwareId: {
    required: 'Software ID is required',
    pattern: 'Use uppercase letters, numbers, and underscores only (e.g., "PARTNER_A_2024")',
  },
};
