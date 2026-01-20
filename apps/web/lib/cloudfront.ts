import { getSignedUrl } from '@aws-sdk/cloudfront-signer';
import { env } from '@/lib/env';

const DEFAULT_EXPIRY_SECONDS = 3600;

export function isSignedUrlsEnabled(): boolean {
  return !!(
    env.CLOUDFRONT_KEY_PAIR_ID &&
    env.CLOUDFRONT_PRIVATE_KEY &&
    env.CLOUDFRONT_WEB_PRIVATE_URL
  );
}

function getPrivateKey(): string {
  return env.CLOUDFRONT_PRIVATE_KEY.replace(/\\n/g, '\n');
}

export function signCloudFrontUrl(url: string, expirySeconds?: number): string {
  const expiry = expirySeconds || DEFAULT_EXPIRY_SECONDS;
  const dateLessThan = new Date(Date.now() + expiry * 1000);

  return getSignedUrl({
    url,
    keyPairId: env.CLOUDFRONT_KEY_PAIR_ID,
    dateLessThan,
    privateKey: getPrivateKey(),
  });
}

export function maybeSignUrl(url: string, expirySeconds?: number): string {
  if (!url.startsWith(env.CLOUDFRONT_WEB_PRIVATE_URL)) {
    return url;
  }

  if (!isSignedUrlsEnabled()) {
    return url;
  }

  return signCloudFrontUrl(url, expirySeconds);
}

export function signUrls(urls: string[], expirySeconds?: number): string[] {
  return urls.map((url) => maybeSignUrl(url, expirySeconds));
}

export function buildWebPrivateUrl(key: string): string {
  return `${env.CLOUDFRONT_WEB_PRIVATE_URL}/${key}`;
}

/**
 * Build and sign a CloudFront URL from S3 key
 * 从S3键构建并签名CloudFront URL
 *
 * @param key - The S3 object key / S3对象键
 * @param expirySeconds - How long the URL should be valid / URL有效时长
 * @returns Signed CloudFront URL / 签名的CloudFront URL
 */
export function getSignedWebPrivateUrl(key: string, expirySeconds?: number): string {
  const url = buildWebPrivateUrl(key);
  return maybeSignUrl(url, expirySeconds);
}

export function buildWebSharedUrl(key: string): string {
  return `${env.CLOUDFRONT_WEB_SHARED_URL}/${key}`;
}

export function buildPublicUrl(key: string): string {
  return `${env.CLOUDFRONT_PUBLIC_URL}/${key}`;
}
