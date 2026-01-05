/**
 * @fileoverview CloudFront Signed URL Utility
 *
 * Generates signed URLs for CloudFront distributions to provide
 * secure, time-limited access to private S3 bucket content.
 *
 * @module apps/admin/lib/cloudfront
 */

import { getSignedUrl } from '@aws-sdk/cloudfront-signer';

// Default expiry time in seconds (1 hour)
const DEFAULT_EXPIRY_SECONDS = 3600;

/**
 * Check if signed URLs are configured
 */
export function isSignedUrlsEnabled(): boolean {
  return !!(
    process.env.CLOUDFRONT_KEY_PAIR_ID &&
    process.env.CLOUDFRONT_PRIVATE_KEY &&
    process.env.CLOUDFRONT_ADMIN_URL
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
  // Only sign URLs from the admin CloudFront distribution
  const adminUrl = process.env.CLOUDFRONT_ADMIN_URL;
  if (!adminUrl || !url.startsWith(adminUrl)) {
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
