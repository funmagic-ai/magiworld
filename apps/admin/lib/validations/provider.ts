/**
 * @fileoverview Provider Form Validation Schema
 * @fileoverview 提供商表单验证模式
 *
 * Zod validation schemas for AI provider create/update forms.
 * Includes rate limiting, timeout, and circuit breaker configuration.
 * 用于AI提供商创建/更新表单的Zod验证模式。
 * 包含速率限制、超时和熔断器配置。
 *
 * @module lib/validations/provider
 */

import { z } from 'zod';

/**
 * Provider status options / 提供商状态选项
 */
export const providerStatusOptions = ['active', 'inactive', 'degraded'] as const;
export type ProviderStatus = (typeof providerStatusOptions)[number];

/**
 * Circuit state options / 熔断状态选项
 */
export const circuitStateOptions = ['closed', 'open', 'half_open'] as const;
export type CircuitState = (typeof circuitStateOptions)[number];

/**
 * Provider form validation schema / 提供商表单验证模式
 *
 * Complete schema for provider form data.
 * 提供商表单数据的完整模式。
 *
 * @property slug - URL-friendly identifier (fal_ai, google, openai) / URL友好的标识符
 * @property name - Display name / 显示名称
 * @property rateLimitMax - Max requests per window / 每窗口最大请求数
 * @property rateLimitWindow - Rate limit window in ms / 速率限制窗口（毫秒）
 * @property defaultTimeout - Request timeout in ms / 请求超时（毫秒）
 * @property status - Provider operational status / 提供商运行状态
 * @property isActive - Whether provider is enabled / 是否启用
 */
/**
 * Base provider schema fields (shared between create and edit)
 */
const providerBaseSchema = {
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9_]+$/, 'Slug must be lowercase letters, numbers, and underscores only'),
  name: z.string().min(1, 'Name is required'),
  baseUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  rateLimitMax: z.coerce
    .number()
    .int()
    .min(1, 'Must be at least 1')
    .max(10000, 'Must be at most 10000')
    .default(100),
  rateLimitWindow: z.coerce
    .number()
    .int()
    .min(1000, 'Must be at least 1000ms')
    .max(3600000, 'Must be at most 1 hour')
    .default(60000),
  defaultTimeout: z.coerce
    .number()
    .int()
    .min(1000, 'Must be at least 1000ms')
    .max(600000, 'Must be at most 10 minutes')
    .default(120000),
  status: z.enum(providerStatusOptions).default('active'),
  isActive: z.boolean(),
  // IAM-style credentials (optional, for AWS/Tencent/etc.)
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  region: z.string().optional(),
};

/**
 * Provider create schema - at least API key OR IAM credentials required
 */
export const providerCreateSchema = z
  .object({
    ...providerBaseSchema,
    apiKey: z.string().optional(),
  })
  .refine(
    (data) => {
      // Either apiKey OR both accessKeyId and secretAccessKey must be provided
      const hasApiKey = !!data.apiKey && data.apiKey.length > 0;
      const hasIamCredentials = !!data.accessKeyId && data.accessKeyId.length > 0 && !!data.secretAccessKey && data.secretAccessKey.length > 0;
      return hasApiKey || hasIamCredentials;
    },
    {
      message: 'Either API Key or IAM credentials (Access Key ID + Secret Access Key) are required',
      path: ['apiKey'],
    }
  );

/**
 * Provider edit schema - credentials optional (leave empty to keep existing)
 */
export const providerEditSchema = z.object({
  ...providerBaseSchema,
  apiKey: z.string().optional(),
});

/**
 * Legacy alias for backward compatibility (uses create schema)
 */
export const providerSchema = providerCreateSchema;

/**
 * TypeScript type inferred from provider schema / 从提供商模式推断的TypeScript类型
 */
export type ProviderFormValues = z.infer<typeof providerSchema>;

/**
 * Human-readable field error messages / 人类可读的字段错误消息
 */
export const providerFieldErrors = {
  slug: {
    required: 'Slug is required',
    pattern: 'Use lowercase letters, numbers, and underscores only (e.g., "fal_ai")',
  },
  name: {
    required: 'Name is required',
  },
  rateLimitMax: {
    min: 'Must be at least 1 request',
    max: 'Must be at most 10,000 requests',
  },
  rateLimitWindow: {
    min: 'Must be at least 1 second',
    max: 'Must be at most 1 hour',
  },
  defaultTimeout: {
    min: 'Must be at least 1 second',
    max: 'Must be at most 10 minutes',
  },
};
