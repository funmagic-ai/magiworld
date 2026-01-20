import { z } from 'zod';

const serverEnvSchema = z.object({
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),

  S3_WEB_PRIVATE_BUCKET: z.string().min(1, 'S3_WEB_PRIVATE_BUCKET is required'),
  S3_WEB_SHARED_BUCKET: z.string().min(1, 'S3_WEB_SHARED_BUCKET is required'),

  CLOUDFRONT_WEB_PRIVATE_URL: z.string().url('CLOUDFRONT_WEB_PRIVATE_URL must be a valid URL'),
  CLOUDFRONT_WEB_SHARED_URL: z.string().url('CLOUDFRONT_WEB_SHARED_URL must be a valid URL'),
  CLOUDFRONT_PUBLIC_URL: z.string().url('CLOUDFRONT_PUBLIC_URL must be a valid URL'),

  CLOUDFRONT_KEY_PAIR_ID: z.string().min(1, 'CLOUDFRONT_KEY_PAIR_ID is required'),
  CLOUDFRONT_PRIVATE_KEY: z.string().min(1, 'CLOUDFRONT_PRIVATE_KEY is required'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  REDIS_URL: z.string().min(1, 'REDIS_URL is required'),
  REDIS_TLS: z.string().optional().default('false'),

  // Queue prefix for task isolation (e.g., "web", "admin")
  QUEUE_PREFIX: z.string().optional().default(''),

  // S3 environment prefix (dev, staging, prod) - defaults to NODE_ENV-based
  S3_ENV_PREFIX: z.string().optional(),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_CLOUDFRONT_WEB_PRIVATE_URL: z.string().optional(),
});

const envSchema = serverEnvSchema.merge(clientEnvSchema);

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  if (process.env.SKIP_ENV_VALIDATION === 'true') {
    console.warn('⚠️  Skipping environment validation');
    return process.env as unknown as Env;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('');
    console.error('❌ Invalid environment variables:');
    console.error('');
    result.error.issues.forEach((issue) => {
      console.error(`   • ${issue.path.join('.')}: ${issue.message}`);
    });
    console.error('');
    console.error('💡 Please check your .env.local file or environment configuration.');
    console.error('   See .env.example for required variables.');
    console.error('');

    if (process.env.NODE_ENV === 'development') {
      throw new Error('Missing required environment variables');
    }
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

export function getS3Url(bucket: string, key: string): string {
  return `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Get the S3 environment prefix for path isolation
 * 获取S3环境前缀用于路径隔离
 *
 * Uses hybrid approach: explicit S3_ENV_PREFIX takes priority,
 * otherwise auto-detects from NODE_ENV.
 *
 * @returns Environment prefix (e.g., 'dev', 'staging', 'prod')
 */
export function getS3EnvPrefix(): string {
  // Explicit S3_ENV_PREFIX takes priority
  if (env.S3_ENV_PREFIX) {
    return env.S3_ENV_PREFIX;
  }
  // Auto-detect from NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production') return 'prod';
  if (nodeEnv === 'test') return 'test';
  return 'dev';
}

/**
 * Prefix S3 key with environment prefix
 * 为S3键添加环境前缀
 *
 * @param key - Object key without prefix
 * @returns Prefixed key (e.g., 'dev/users/123/uploads/image.jpg')
 */
export function prefixS3Key(key: string): string {
  const prefix = getS3EnvPrefix();
  return `${prefix}/${key}`;
}
