/**
 * @fileoverview Web App Upload API Route Handler
 * @fileoverview Web应用文件上传路由处理器
 *
 * Handles file uploads to AWS S3 using pre-signed URLs.
 * 使用预签名URL处理文件上传到AWS S3。
 *
 * Path structure: {env}/users/{userId}/uploads/{filename}-{ts}.{ext}
 * 路径结构: {env}/users/{userId}/uploads/{filename}-{ts}.{ext}
 *
 * @module apps/web/app/api/upload/route
 */

import { route, type Router } from '@better-upload/server';
import { toRouteHandler } from '@better-upload/server/adapters/next';
import { aws } from '@better-upload/server/clients';
import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/logto';
import { env, prefixS3Key } from '@/lib/env';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Get current user ID from session
 * 从会话获取当前用户ID
 */
async function getUserId(): Promise<string> {
  try {
    const context = await getLogtoContext(logtoConfig);
    if (context.isAuthenticated && context.claims?.sub) {
      return context.claims.sub;
    }
  } catch {
    // Fall through to anonymous
  }
  return 'anonymous';
}

/**
 * Lazy initialization of S3 client
 * 延迟初始化S3客户端
 */
function getS3Client() {
  return aws({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
  });
}

/**
 * Build CloudFront URL for private assets
 * 构建私有资产的CloudFront URL
 */
function buildPrivateUrl(key: string): string {
  return `${env.CLOUDFRONT_WEB_PRIVATE_URL}/${key}`;
}

const router: Router = {
  get client() {
    return getS3Client();
  },
  bucketName: env.S3_WEB_PRIVATE_BUCKET,
  routes: {
    /**
     * Tool input uploads / 工具输入上传
     * Used by: Tool pages for uploading images before processing
     * 使用者：工具页面在处理前上传图片
     *
     * Path: {env}/users/{userId}/uploads/{filename}-{ts}.{ext}
     */
    tools: route({
      fileTypes: ['image/*'],
      maxFileSize: MAX_FILE_SIZE,
      onBeforeUpload: async ({ file }) => {
        const userId = await getUserId();
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'jpg';
        const name = file.name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');

        return {
          objectInfo: {
            key: prefixS3Key(`users/${userId}/uploads/${name}-${timestamp}.${ext}`),
          },
        };
      },
    }),
  },
};

export function getPrivateUrl(key: string): string {
  return buildPrivateUrl(key);
}

export const { POST } = toRouteHandler(router);
