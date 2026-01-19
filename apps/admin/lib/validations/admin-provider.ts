/**
 * @fileoverview Admin Provider Validation Schema
 * @fileoverview 管理员提供商验证模式
 *
 * Zod validation schemas for admin provider forms.
 * Simpler than web provider forms - no rate limiting or circuit breaker.
 * 管理员提供商表单的Zod验证模式。
 * 比Web提供商表单更简单 - 没有速率限制或断路器。
 *
 * @module lib/validations/admin-provider
 */

import { z } from 'zod';

/**
 * Status options for admin providers
 */
export const adminProviderStatusOptions = ['active', 'inactive'] as const;

/**
 * Base schema for admin provider fields
 */
const baseSchema = {
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50, 'Slug must be at most 50 characters')
    .regex(/^[a-z][a-z0-9_]*$/, 'Slug must start with lowercase letter and contain only lowercase letters, numbers, and underscores'),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters'),
  baseUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  status: z.enum(adminProviderStatusOptions),
  isActive: z.boolean(),
};

/**
 * Create schema - API key required
 */
export const adminProviderCreateSchema = z.object({
  ...baseSchema,
  apiKey: z
    .string()
    .min(1, 'API key is required'),
});

/**
 * Edit schema - API key optional (keep existing if not provided)
 */
export const adminProviderEditSchema = z.object({
  ...baseSchema,
  apiKey: z.string().optional(),
});

export type AdminProviderCreateInput = z.infer<typeof adminProviderCreateSchema>;
export type AdminProviderEditInput = z.infer<typeof adminProviderEditSchema>;
