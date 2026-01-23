/**
 * @fileoverview Signed URL Utilities
 *
 * Client-side utilities for working with CloudFront signed URLs:
 * - Check if a signed URL is expired
 * - Request fresh signed URL when needed
 *
 * @module lib/signed-url
 */

/** Buffer time before actual expiry to trigger refresh (5 minutes) */
const EXPIRY_BUFFER_SECONDS = 300;

/**
 * Check if a CloudFront signed URL is expired or about to expire
 *
 * CloudFront signed URLs have an `Expires` query parameter with Unix timestamp.
 * We add a buffer to refresh before actual expiry.
 *
 * @param signedUrl - The signed URL to check
 * @returns true if expired or will expire within buffer time
 */
export function isSignedUrlExpired(signedUrl: string): boolean {
  try {
    const url = new URL(signedUrl);
    const expiresParam = url.searchParams.get('Expires');

    // If no Expires param, assume it's not a signed URL (public URL)
    if (!expiresParam) {
      return false;
    }

    const expiresTimestamp = parseInt(expiresParam, 10);
    if (isNaN(expiresTimestamp)) {
      return false;
    }

    // Current time in seconds + buffer
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const expiryWithBuffer = expiresTimestamp - EXPIRY_BUFFER_SECONDS;

    return currentTimestamp >= expiryWithBuffer;
  } catch {
    // If URL parsing fails, assume not expired
    return false;
  }
}

/**
 * Get a valid signed URL, refreshing if expired
 *
 * If the signed URL is still valid, returns it directly.
 * If expired, requests a fresh signed URL from the API.
 *
 * @param signedUrl - The current signed URL (may be expired)
 * @param unsignedUrl - The unsigned URL to sign if refresh needed
 * @returns Promise resolving to a valid signed URL
 */
export async function getValidSignedUrl(
  signedUrl: string,
  unsignedUrl: string
): Promise<string> {
  // If not expired, return the current signed URL
  if (!isSignedUrlExpired(signedUrl)) {
    return signedUrl;
  }

  // Request fresh signed URL
  try {
    const response = await fetch('/api/sign-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: unsignedUrl }),
    });

    if (!response.ok) {
      console.error('[SignedUrl] Failed to refresh signed URL:', response.status);
      // Fall back to original signed URL (may still work briefly)
      return signedUrl;
    }

    const data = await response.json();
    return data.signedUrl;
  } catch (error) {
    console.error('[SignedUrl] Error refreshing signed URL:', error);
    // Fall back to original signed URL
    return signedUrl;
  }
}
