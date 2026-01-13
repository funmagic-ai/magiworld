/**
 * @fileoverview CloudFront Signed URL Utility for Web App
 *
 * Generates signed URLs for CloudFront distributions to provide
 * secure, time-limited access to private S3 bucket content.
 *
 * @module apps/web/lib/cloudfront
 */

import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

// Default expiry time in seconds (1 hour)
const DEFAULT_EXPIRY_SECONDS = 3600;

/**
 * Check if signed URLs are configured for web private bucket
 */
export function isSignedUrlsEnabled(): boolean {
  return !!(
    process.env.CLOUDFRONT_KEY_PAIR_ID &&
    process.env.CLOUDFRONT_PRIVATE_KEY &&
    process.env.CLOUDFRONT_WEB_PRIVATE_URL
  );
}

/**
 * Get the private key from environment variable
 * Handles newline escaping from env var format
 */
function getPrivateKey(): string {
  const key = process.env.CLOUDFRONT_PRIVATE_KEY;
  if (!key) {
    throw new Error('CLOUDFRONT_PRIVATE_KEY environment variable is not set');
  }
  // Replace escaped newlines with actual newlines
  return key.replace(/\\n/g, '\n');
}

/**
 * Generate a signed CloudFront URL for a given resource URL
 *
 * @param url - The unsigned CloudFront URL to sign
 * @param expirySeconds - How long the URL should be valid (default: 1 hour)
 * @returns The signed URL with expiry and signature parameters
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
 * Sign a CloudFront URL if signed URLs are enabled, otherwise return original
 *
 * @param url - The URL to potentially sign
 * @param expirySeconds - How long the URL should be valid
 * @returns Signed URL if enabled, original URL otherwise
 */
export function maybeSignUrl(url: string, expirySeconds?: number): string {
  // Only sign URLs from the web private CloudFront distribution
  const privateUrl = process.env.CLOUDFRONT_WEB_PRIVATE_URL;
  if (!privateUrl || !url.startsWith(privateUrl)) {
    return url;
  }

  // Check if signing is enabled
  if (!isSignedUrlsEnabled()) {
    return url;
  }

  return signCloudFrontUrl(url, expirySeconds);
}

/**
 * Sign multiple URLs in parallel
 *
 * @param urls - Array of URLs to sign
 * @param expirySeconds - How long URLs should be valid
 * @returns Array of signed URLs
 */
export function signUrls(urls: string[], expirySeconds?: number): string[] {
  return urls.map((url) => maybeSignUrl(url, expirySeconds));
}

/**
 * Build URL for web private bucket
 * Uses CloudFront if configured, otherwise falls back to direct S3
 */
export function buildWebPrivateUrl(key: string): string {
  if (process.env.CLOUDFRONT_WEB_PRIVATE_URL) {
    return `${process.env.CLOUDFRONT_WEB_PRIVATE_URL}/${key}`;
  }
  const bucket = process.env.S3_WEB_PRIVATE_BUCKET || 'funmagic-web-users-assets-private';
  const region = process.env.AWS_REGION || 'ap-northeast-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Build URL for web shared bucket (public, no signing needed)
 * Uses CloudFront if configured, otherwise falls back to direct S3
 */
export function buildWebSharedUrl(key: string): string {
  if (process.env.CLOUDFRONT_WEB_SHARED_URL) {
    return `${process.env.CLOUDFRONT_WEB_SHARED_URL}/${key}`;
  }
  const bucket = process.env.S3_WEB_SHARED_BUCKET || 'funmagic-web-users-assets-shared';
  const region = process.env.AWS_REGION || 'ap-northeast-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

/**
 * Build URL for public assets bucket (banners, tool images)
 * Uses CloudFront if configured, otherwise falls back to direct S3
 */
export function buildPublicUrl(key: string): string {
  if (process.env.CLOUDFRONT_PUBLIC_URL) {
    return `${process.env.CLOUDFRONT_PUBLIC_URL}/${key}`;
  }
  const bucket = process.env.S3_PUBLIC_ASSETS_BUCKET || 'funmagic-web-public-assets';
  const region = process.env.AWS_REGION || 'ap-northeast-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}
