/**
 * @fileoverview CloudFront Signed URL Utility
 * @fileoverview CloudFront签名URL工具
 *
 * Generates signed URLs for CloudFront distributions to provide
 * secure, time-limited access to private S3 bucket content.
 * 为CloudFront分发生成签名URL，提供对私有S3存储桶内容的安全、限时访问。
 *
 * @module lib/cloudfront
 */

import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

/** Default expiry time in seconds (1 hour) / 默认过期时间（1小时） */
const DEFAULT_EXPIRY_SECONDS = 3600;

/**
 * Check if signed URLs are configured / 检查签名URL是否已配置
 *
 * Verifies all required environment variables are present.
 * 验证所有必需的环境变量是否存在。
 *
 * @returns True if signing is enabled / 如果启用签名返回true
 */
export function isSignedUrlsEnabled(): boolean {
  return !!(
    process.env.CLOUDFRONT_KEY_PAIR_ID &&
    process.env.CLOUDFRONT_PRIVATE_KEY &&
    process.env.CLOUDFRONT_ADMIN_PRIVATE_URL
  );
}

/**
 * Get the private key from environment variable / 从环境变量获取私钥
 *
 * Handles newline escaping from env var format.
 * 处理环境变量格式中的换行符转义。
 */
function getPrivateKey(): string {
  const key = process.env.CLOUDFRONT_PRIVATE_KEY;
  if (!key) {
    throw new Error('CLOUDFRONT_PRIVATE_KEY environment variable is not set');
  }
  // Replace escaped newlines with actual newlines / 将转义的换行符替换为实际换行符
  return key.replace(/\\n/g, '\n');
}

/**
 * Generate a signed CloudFront URL / 生成签名的CloudFront URL
 *
 * Creates a time-limited signed URL for accessing private content.
 * 创建用于访问私有内容的限时签名URL。
 *
 * @param url - The unsigned CloudFront URL to sign / 要签名的未签名CloudFront URL
 * @param expirySeconds - How long the URL should be valid (default: 1 hour) / URL有效时长
 * @returns The signed URL with expiry and signature parameters / 带过期和签名参数的签名URL
 */
export function signCloudFrontUrl(
  url: string,
  expirySeconds?: number
): string {
  const keyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID;
  if (!keyPairId) {
    throw new Error('CLOUDFRONT_KEY_PAIR_ID environment variable is not set');
  }

  const expiry =
    expirySeconds ||
    parseInt(process.env.CLOUDFRONT_SIGNED_URL_EXPIRY || '', 10) ||
    DEFAULT_EXPIRY_SECONDS;

  const dateLessThan = new Date(Date.now() + expiry * 1000);

  return getSignedUrl({
    url,
    keyPairId,
    dateLessThan,
    privateKey: getPrivateKey(),
  });
}

/**
 * Sign a CloudFront URL if signed URLs are enabled / 如果启用签名则签名CloudFront URL
 *
 * Only signs URLs from the admin CloudFront distribution.
 * 仅签名来自管理员CloudFront分发的URL。
 *
 * @param url - The URL to potentially sign / 可能需要签名的URL
 * @param expirySeconds - How long the URL should be valid / URL有效时长
 * @returns Signed URL if enabled, original URL otherwise / 启用则返回签名URL，否则返回原URL
 */
export function maybeSignUrl(url: string, expirySeconds?: number): string {
  // Only sign URLs from the admin CloudFront distribution
  // 仅签名来自管理员CloudFront分发的URL
  const adminUrl = process.env.CLOUDFRONT_ADMIN_PRIVATE_URL;
  if (!adminUrl || !url.startsWith(adminUrl)) {
    return url;
  }

  // Check if signing is enabled / 检查是否启用签名
  if (!isSignedUrlsEnabled()) {
    return url;
  }

  return signCloudFrontUrl(url, expirySeconds);
}

/**
 * Sign multiple URLs in parallel / 并行签名多个URL
 *
 * @param urls - Array of URLs to sign / 要签名的URL数组
 * @param expirySeconds - How long URLs should be valid / URL有效时长
 * @returns Array of signed URLs / 签名URL数组
 */
export function signUrls(urls: string[], expirySeconds?: number): string[] {
  return urls.map((url) => maybeSignUrl(url, expirySeconds));
}
