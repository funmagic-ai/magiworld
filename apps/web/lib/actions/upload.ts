/**
 * @fileoverview Upload Server Actions
 * @fileoverview 上传服务端操作
 *
 * Server actions for signing CloudFront URLs after client-side uploads.
 * 客户端上传后签名CloudFront URL的服务端操作。
 *
 * @module lib/actions/upload
 */

'use server';

import { maybeSignUrl } from '@/lib/cloudfront';

/**
 * Sign a CloudFront URL for private asset access
 * 为私有资产访问签名CloudFront URL
 *
 * Use this to sign URLs for uploaded files that need to be displayed
 * or sent to external APIs. Only signs URLs from the web CloudFront distribution.
 * 用于签名需要在浏览器中显示或发送到外部API的已上传文件的URL。
 * 仅签名来自Web CloudFront分发的URL。
 *
 * @param url - The CloudFront URL to sign / 要签名的CloudFront URL
 * @returns Signed URL if applicable, original URL otherwise / 签名后的URL（如适用），否则返回原URL
 */
export async function signUrl(url: string): Promise<string> {
  return maybeSignUrl(url);
}
