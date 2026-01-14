/**
 * @fileoverview Environment Variable Validation
 * @fileoverview 环境变量验证
 *
 * Centralized environment configuration with Zod validation.
 * This module validates all required environment variables at import time,
 * failing fast if any required variables are missing.
 * 使用Zod验证的集中式环境配置。
 * 此模块在导入时验证所有必需的环境变量，如果缺少任何必需变量则快速失败。
 *
 * @module lib/env
 */

import { z } from 'zod';

/**
 * Server-side environment variables schema / 服务端环境变量模式
 *
 * These are only available on the server.
 * 这些仅在服务端可用。
 */
const serverEnvSchema = z.object({
  // AWS Core / AWS核心配置
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),

  // S3 Buckets / S3存储桶
  S3_ADMIN_ASSETS_BUCKET: z.string().min(1, 'S3_ADMIN_ASSETS_BUCKET is required'),
  S3_PUBLIC_ASSETS_BUCKET: z.string().min(1, 'S3_PUBLIC_ASSETS_BUCKET is required'),

  // CloudFront URLs / CloudFront URL
  CLOUDFRONT_ADMIN_PRIVATE_URL: z.string().url('CLOUDFRONT_ADMIN_PRIVATE_URL must be a valid URL'),
  CLOUDFRONT_PUBLIC_URL: z.string().url('CLOUDFRONT_PUBLIC_URL must be a valid URL'),

  // CloudFront Signing (for private assets) / CloudFront签名（用于私有资产）
  CLOUDFRONT_KEY_PAIR_ID: z.string().min(1, 'CLOUDFRONT_KEY_PAIR_ID is required'),
  CLOUDFRONT_PRIVATE_KEY: z.string().min(1, 'CLOUDFRONT_PRIVATE_KEY is required'),

  // Database / 数据库
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Upload Configuration / 上传配置
  UPLOAD_MAX_SIZE_MB: z.coerce.number().min(1).max(100).default(20),
});

/**
 * Client-side environment variables schema / 客户端环境变量模式
 *
 * These are exposed to the browser via NEXT_PUBLIC_ prefix.
 * 这些通过NEXT_PUBLIC_前缀暴露给浏览器。
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_AWS_REGION: z.string().optional(),
  NEXT_PUBLIC_S3_PUBLIC_BUCKET: z.string().optional(),
  NEXT_PUBLIC_CLOUDFRONT_URL: z.string().optional(),
  // Upload limit for client-side validation (mirrors UPLOAD_MAX_SIZE_MB)
  // 客户端验证的上传限制（与UPLOAD_MAX_SIZE_MB一致）
  NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB: z.coerce.number().min(1).max(100).default(20),
});

/**
 * Combined environment schema / 合并的环境模式
 */
const envSchema = serverEnvSchema.merge(clientEnvSchema);

/**
 * TypeScript type for validated environment / 验证后环境的TypeScript类型
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns typed config / 验证环境变量并返回类型化配置
 *
 * Exits the process with error if validation fails.
 * 如果验证失败则退出进程并报错。
 */
function validateEnv(): Env {
  // Skip validation during build time if env vars aren't set
  // 如果环境变量未设置，在构建时跳过验证
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    console.warn('Warning: Skipping environment validation');
    return process.env as unknown as Env;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('');
    console.error('Invalid environment variables:');
    console.error('');
    result.error.issues.forEach((issue) => {
      console.error(`   - ${issue.path.join('.')}: ${issue.message}`);
    });
    console.error('');
    console.error('Please check your .env.local file or environment configuration.');
    console.error('   See .env.example for required variables.');
    console.error('');

    // In development, throw error. In production, exit.
    // 开发环境抛出错误，生产环境退出。
    if (process.env.NODE_ENV === 'development') {
      throw new Error('Missing required environment variables');
    }
    process.exit(1);
  }

  return result.data;
}

/**
 * Validated environment variables / 验证后的环境变量
 *
 * Import this to access type-safe environment configuration.
 * 导入此对象以访问类型安全的环境配置。
 *
 * @example
 * ```ts
 * import { env } from '@/lib/env';
 * const bucket = env.S3_ADMIN_ASSETS_BUCKET;
 * ```
 */
export const env = validateEnv();

/**
 * Helper to get AWS S3 URL for a given bucket and key / 获取给定存储桶和键的AWS S3 URL辅助函数
 *
 * @param bucket - S3 bucket name / S3存储桶名称
 * @param key - Object key / 对象键
 * @returns Full S3 URL / 完整的S3 URL
 */
export function getS3Url(bucket: string, key: string): string {
  return `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Helper to get CloudFront URL for admin private assets / 获取管理员私有资产的CloudFront URL辅助函数
 *
 * @param key - Object key / 对象键
 * @returns Full CloudFront URL / 完整的CloudFront URL
 */
export function getAdminAssetUrl(key: string): string {
  return `${env.CLOUDFRONT_ADMIN_PRIVATE_URL}/${key}`;
}

/**
 * Helper to get CloudFront URL for public CDN assets / 获取公共CDN资产的CloudFront URL辅助函数
 *
 * @param key - Object key / 对象键
 * @returns Full CloudFront URL / 完整的CloudFront URL
 */
export function getPublicCdnUrl(key: string): string {
  return `${env.CLOUDFRONT_PUBLIC_URL}/${key}`;
}

// ============================================
// Upload Configuration / 上传配置
// ============================================

/** Default max file size in MB / 默认最大文件大小（MB） */
const DEFAULT_UPLOAD_MAX_SIZE_MB = 20;

/**
 * Get maximum upload file size in bytes / 获取最大上传文件大小（字节）
 *
 * Reads from UPLOAD_MAX_SIZE_MB env var, defaults to 20MB.
 * 从UPLOAD_MAX_SIZE_MB环境变量读取，默认20MB。
 *
 * @returns Max file size in bytes / 最大文件大小（字节）
 */
export function getUploadMaxSize(): number {
  const mb = env.UPLOAD_MAX_SIZE_MB ?? DEFAULT_UPLOAD_MAX_SIZE_MB;
  return mb * 1024 * 1024;
}

/**
 * Get maximum upload file size in MB / 获取最大上传文件大小（MB）
 *
 * @returns Max file size in MB / 最大文件大小（MB）
 */
export function getUploadMaxSizeMB(): number {
  return env.UPLOAD_MAX_SIZE_MB ?? DEFAULT_UPLOAD_MAX_SIZE_MB;
}
