/**
 * @fileoverview Worker Configuration
 * @fileoverview Worker 配置
 *
 * Environment configuration for the worker process.
 * Worker 进程的环境配置。
 *
 * @module @magiworld/worker/config
 */

import { z } from 'zod';

/**
 * Environment schema / 环境变量模式
 */
const envSchema = z.object({
  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  REDIS_TLS: z.string().optional().default('false'),

  // Worker settings
  WORKER_CONCURRENCY: z.coerce.number().min(1).max(50).default(5),
  WORKER_SHUTDOWN_TIMEOUT_MS: z.coerce.number().default(30000),

  // Queue prefix for worker isolation (e.g., "web", "admin")
  QUEUE_PREFIX: z.string().optional().default(''),

  // Comma-separated list of queues to listen to (e.g., "default,fal_ai,openai,3d_tripo,3d_hunyuan")
  // If empty, listens to all queues in QueueNames enum (default, fal_ai, google, openai)
  WORKER_QUEUES: z.string().optional().default(''),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // AWS S3 (for result uploads)
  // Uses private bucket - results are private by default
  // Web app will sign URLs when serving to users
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional().default('us-east-2'),

  // Web private bucket (for web user task results)
  S3_WEB_PRIVATE_BUCKET: z.string().min(1, 'S3_WEB_PRIVATE_BUCKET is required'),
  CLOUDFRONT_WEB_PRIVATE_URL: z.string().min(1, 'CLOUDFRONT_WEB_PRIVATE_URL is required'),

  // CloudFront URL signing credentials (for signing URLs before sending to external APIs)
  CLOUDFRONT_KEY_PAIR_ID: z.string().optional(),
  CLOUDFRONT_PRIVATE_KEY: z.string().optional(),

  // Admin assets bucket (for admin task results)
  S3_ADMIN_ASSETS_BUCKET: z.string().optional(),
  // Support both CLOUDFRONT_ADMIN_URL and NEXT_PUBLIC_CLOUDFRONT_ADMIN_URL for convenience
  CLOUDFRONT_ADMIN_URL: z.string().optional(),
  NEXT_PUBLIC_CLOUDFRONT_ADMIN_URL: z.string().optional(),

  // S3 environment prefix (dev, staging, prod) - defaults to NODE_ENV-based
  S3_ENV_PREFIX: z.string().optional(),

  // Notifications
  SLACK_WEBHOOK_URL: z.string().optional(),

  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.string().default('info'),
});

/**
 * Validate and parse environment variables
 * 验证和解析环境变量
 */
function validateEnv() {
  // Skip validation during build time if env vars aren't set
  // 如果环境变量未设置，在构建时跳过验证
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    console.warn('Warning: Skipping environment validation');
    return process.env as unknown as z.infer<typeof envSchema>;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
}

/**
 * Validated environment configuration
 * 验证后的环境配置
 */
export const config = validateEnv();

/**
 * Check if running in production
 * 检查是否在生产环境运行
 */
export const isProduction = config.NODE_ENV === 'production';

/**
 * Check if Redis TLS is enabled
 * 检查是否启用 Redis TLS
 */
export const isRedisTlsEnabled = config.REDIS_TLS === 'true';

/**
 * Get the S3 environment prefix for path isolation
 * 获取S3环境前缀用于路径隔离
 *
 * @returns Environment prefix (e.g., 'dev', 'staging', 'prod')
 */
export function getS3EnvPrefix(): string {
  // Explicit S3_ENV_PREFIX takes priority
  if (config.S3_ENV_PREFIX) {
    return config.S3_ENV_PREFIX;
  }
  // Auto-detect from NODE_ENV
  if (config.NODE_ENV === 'production') return 'prod';
  if (config.NODE_ENV === 'test') return 'test';
  return 'dev';
}

/**
 * Check if this worker is configured for admin tasks
 * 检查此worker是否配置为处理管理员任务
 */
export const isAdminWorker = config.QUEUE_PREFIX === 'admin';
