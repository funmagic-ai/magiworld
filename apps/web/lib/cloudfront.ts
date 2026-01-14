/**
 * @fileoverview CloudFront Signed URL Utility for Web App
 *
 * Generates signed URLs for CloudFront distributions to provide
 * secure, time-limited access to private S3 bucket content.
 *
 * @module apps/web/lib/cloudfront
 */

import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { env } from '@/lib/env';

// Default expiry time in seconds (1 hour)
const DEFAULT_EXPIRY_SECONDS = 3600;

/**
 * Check if signed URLs are configured for web private bucket
 */
export function isSignedUrlsEnabled(): boolean {
  return !!(
    env.CLOUDFRONT_KEY_PAIR_ID &&
    env.CLOUDFRONT_PRIVATE_KEY &&
    env.CLOUDFRONT_WEB_PRIVATE_URL
  );
}

/**
 * Get the private key from environment variable
 * Handles newline escaping from env var format
 */
function getPrivateKey(): string {
  // Replace escaped newlines with actual newlines
  return env.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, '\n');
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
  const expiry = expirySeconds || DEFAULT_EXPIRY_SECONDS;
  const dateLessThan = new Date(Date.now() + expiry * 1000);

  return getSignedUrl({
    url,
    keyPairId: env.CLOUDFRONT_KEY_PAIR_ID,
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
  if (!url.startsWith(env.CLOUDFRONT_WEB_PRIVATE_URL)) {
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
 * Build URL for web private bucket (uses CloudFront)
 */
export function buildWebPrivateUrl(key: string): string {
  return `${env.CLOUDFRONT_WEB_PRIVATE_URL}/${key}`;
}

/**
 * Build URL for web shared bucket (uses CloudFront, no signing needed)
 */
export function buildWebSharedUrl(key: string): string {
  return `${env.CLOUDFRONT_WEB_SHARED_URL}/${key}`;
}

/**
 * Build URL for public assets bucket (banners, tool images - uses CloudFront)
 */
export function buildPublicUrl(key: string): string {
  return `${env.CLOUDFRONT_PUBLIC_URL}/${key}`;
}
