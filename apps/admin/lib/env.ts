/**
 * @fileoverview Environment Variable Validation
 *
 * Centralized environment configuration with Zod validation.
 * This module validates all required environment variables at import time,
 * failing fast if any required variables are missing.
 *
 * @module lib/env
 */

import { z } from 'zod';

/**
 * Server-side environment variables schema.
 * These are only available on the server.
 */
const serverEnvSchema = z.object({
  // AWS Core
  AWS_ACCESS_KEY_ID: z.string().min(1, 'AWS_ACCESS_KEY_ID is required'),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, 'AWS_SECRET_ACCESS_KEY is required'),
  AWS_REGION: z.string().min(1, 'AWS_REGION is required'),

  // S3 Buckets
  S3_ADMIN_ASSETS_BUCKET: z.string().min(1, 'S3_ADMIN_ASSETS_BUCKET is required'),
  S3_PUBLIC_ASSETS_BUCKET: z.string().min(1, 'S3_PUBLIC_ASSETS_BUCKET is required'),

  // CloudFront URLs
  CLOUDFRONT_ADMIN_PRIVATE_URL: z.string().url('CLOUDFRONT_ADMIN_PRIVATE_URL must be a valid URL'),
  CLOUDFRONT_PUBLIC_URL: z.string().url('CLOUDFRONT_PUBLIC_URL must be a valid URL'),

  // CloudFront Signing (for private assets)
  CLOUDFRONT_KEY_PAIR_ID: z.string().min(1, 'CLOUDFRONT_KEY_PAIR_ID is required'),
  CLOUDFRONT_PRIVATE_KEY: z.string().min(1, 'CLOUDFRONT_PRIVATE_KEY is required'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
});

/**
 * Client-side environment variables schema.
 * These are exposed to the browser via NEXT_PUBLIC_ prefix.
 */
const clientEnvSchema = z.object({
  NEXT_PUBLIC_AWS_REGION: z.string().optional(),
  NEXT_PUBLIC_S3_PUBLIC_BUCKET: z.string().optional(),
  NEXT_PUBLIC_CLOUDFRONT_URL: z.string().optional(),
});

/**
 * Combined environment schema.
 */
const envSchema = serverEnvSchema.merge(clientEnvSchema);

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables and returns typed config.
 * Exits the process with error if validation fails.
 */
function validateEnv(): Env {
  // Skip validation during build time if env vars aren't set
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

    // In development, throw error. In production, exit.
    if (process.env.NODE_ENV === 'development') {
      throw new Error('Missing required environment variables');
    }
    process.exit(1);
  }

  return result.data;
}

/**
 * Validated environment variables.
 * Import this to access type-safe environment configuration.
 *
 * @example
 * ```ts
 * import { env } from '@/lib/env';
 * const bucket = env.S3_ADMIN_ASSETS_BUCKET;
 * ```
 */
export const env = validateEnv();

/**
 * Helper to get AWS S3 URL for a given bucket and key.
 */
export function getS3Url(bucket: string, key: string): string {
  return `https://${bucket}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
}

/**
 * Helper to get CloudFront URL for admin private assets.
 */
export function getAdminAssetUrl(key: string): string {
  return `${env.CLOUDFRONT_ADMIN_PRIVATE_URL}/${key}`;
}

/**
 * Helper to get CloudFront URL for public CDN assets.
 */
export function getPublicCdnUrl(key: string): string {
  return `${env.CLOUDFRONT_PUBLIC_URL}/${key}`;
}
