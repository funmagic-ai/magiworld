/**
 * @fileoverview S3 Upload Utilities
 * @fileoverview S3 上传工具
 *
 * Utilities for uploading task results to AWS S3 private bucket.
 * Results are private by default - web/admin app will sign URLs when serving to users.
 * 用于将任务结果上传到 AWS S3 私有存储桶的工具。
 * 结果默认是私有的 - Web/Admin 应用在提供给用户时会签名 URL。
 *
 * Path structure:
 * - Web users: {env}/users/{userId}/results/{toolSlug}/{taskId}.{ext}
 * - Admin users: {env}/admins/{adminId}/results/{toolSlug}/{taskId}.{ext}
 *
 * @module @magiworld/worker/s3
 */

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config, getS3EnvPrefix, isAdminWorker } from './config';
import { createLogger } from '@magiworld/utils/logger';

const logger = createLogger('s3');

/**
 * S3 client instance (lazy initialized)
 * S3 客户端实例（延迟初始化）
 */
let s3Client: S3Client | null = null;

/**
 * Get or create S3 client
 * 获取或创建 S3 客户端
 */
function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.AWS_REGION,
      credentials:
        config.AWS_ACCESS_KEY_ID && config.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: config.AWS_ACCESS_KEY_ID,
              secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
            }
          : undefined, // Use default credential provider chain
    });
  }
  return s3Client;
}

/**
 * Content type mappings
 * 内容类型映射
 */
const CONTENT_TYPE_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  mp4: 'video/mp4',
  glb: 'model/gltf-binary',
  gltf: 'model/gltf+json',
  json: 'application/json',
};

/**
 * Generate S3 key for task result
 * 生成任务结果的 S3 键
 *
 * Path structure:
 * - Web users: {env}/users/{userId}/results/{toolSlug}/{taskId}.{ext}
 * - Admin users: {env}/admins/{adminId}/results/{toolSlug}/{taskId}.{ext}
 *
 * This enables per-user file management, GDPR compliance, and storage quotas.
 * 这支持按用户文件管理、GDPR 合规和存储配额。
 *
 * @param userId - User ID (or Admin ID) / 用户 ID（或管理员 ID）
 * @param taskId - Task ID / 任务 ID
 * @param extension - File extension / 文件扩展名
 * @param toolSlug - Tool slug for organizing results / 工具标识用于组织结果
 * @returns S3 object key / S3 对象键
 */
export function generateS3Key(
  userId: string,
  taskId: string,
  extension: string,
  toolSlug?: string
): string {
  const envPrefix = getS3EnvPrefix();
  const userType = isAdminWorker ? 'admins' : 'users';
  const tool = toolSlug || 'unknown';

  return `${envPrefix}/${userType}/${userId}/results/${tool}/${taskId}.${extension}`;
}

/**
 * Upload task result to S3 private bucket
 * 将任务结果上传到 S3 私有存储桶
 *
 * Uploads to private bucket and returns unsigned CloudFront URL.
 * Web/Admin app will sign the URL when serving to users.
 * 上传到私有存储桶并返回未签名的 CloudFront URL。
 * Web/Admin 应用在提供给用户时会签名 URL。
 *
 * @param userId - User ID (or Admin ID) / 用户 ID（或管理员 ID）
 * @param taskId - Task ID / 任务 ID
 * @param data - Data to upload (Buffer or base64 string) / 要上传的数据
 * @param extension - File extension (e.g., 'png', 'jpg') / 文件扩展名
 * @param toolSlug - Tool slug for organizing results / 工具标识用于组织结果
 * @returns Unsigned CloudFront URL (app will sign when needed) / 未签名的 CloudFront URL
 */
export async function uploadTaskResult(
  userId: string,
  taskId: string,
  data: Buffer | string,
  extension: string,
  toolSlug?: string
): Promise<string> {
  // Use admin bucket if this is an admin worker, otherwise use web bucket
  const bucket = isAdminWorker && config.S3_ADMIN_ASSETS_BUCKET
    ? config.S3_ADMIN_ASSETS_BUCKET
    : config.S3_WEB_PRIVATE_BUCKET;

  // Support both CLOUDFRONT_ADMIN_URL and NEXT_PUBLIC_CLOUDFRONT_ADMIN_URL
  const adminCdnUrl = config.CLOUDFRONT_ADMIN_URL || config.NEXT_PUBLIC_CLOUDFRONT_ADMIN_URL;
  const cdnUrl = isAdminWorker && adminCdnUrl
    ? adminCdnUrl
    : config.CLOUDFRONT_WEB_PRIVATE_URL;

  const client = getS3Client();
  const key = generateS3Key(userId, taskId, extension, toolSlug);
  const contentType = CONTENT_TYPE_MAP[extension.toLowerCase()] || 'application/octet-stream';

  // Convert base64 string to Buffer if needed
  const buffer = typeof data === 'string' ? Buffer.from(data, 'base64') : data;

  logger.info(`Uploading task result to S3`, {
    taskId,
    bucket,
    key,
    size: buffer.length,
    isAdminWorker,
  });

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // Return unsigned CloudFront URL (app will sign when serving to users)
  const url = `${cdnUrl}/${key}`;

  logger.info(`Task result uploaded successfully`, { taskId, url });

  return url;
}

/**
 * Upload base64-encoded image to S3
 * 将 base64 编码的图像上传到 S3
 *
 * @param userId - User ID (or Admin ID) / 用户 ID（或管理员 ID）
 * @param taskId - Task ID / 任务 ID
 * @param base64Data - Base64-encoded image data / Base64 编码的图像数据
 * @param mimeType - MIME type (e.g., 'image/png') / MIME 类型
 * @param toolSlug - Tool slug for organizing results / 工具标识用于组织结果
 * @returns S3 object URL / S3 对象 URL
 */
export async function uploadBase64Image(
  userId: string,
  taskId: string,
  base64Data: string,
  mimeType: string = 'image/png',
  toolSlug?: string
): Promise<string> {
  // Extract extension from MIME type
  const extension = mimeType.split('/')[1] || 'png';

  // Remove data URL prefix if present
  const base64 = base64Data.includes('base64,')
    ? base64Data.split('base64,')[1]
    : base64Data;

  return uploadTaskResult(userId, taskId, base64, extension, toolSlug);
}

/**
 * Download file from URL and upload to S3
 * 从 URL 下载文件并上传到 S3
 *
 * Downloads a file from a remote URL and re-uploads it to S3.
 * Useful for persisting 3D models from providers that have expiring URLs.
 * 从远程 URL 下载文件并重新上传到 S3。
 * 用于持久化来自 URL 会过期的提供商的 3D 模型。
 *
 * @param userId - User ID (or Admin ID) / 用户 ID（或管理员 ID）
 * @param taskId - Task ID / 任务 ID
 * @param sourceUrl - URL to download from / 要下载的 URL
 * @param extension - File extension (e.g., 'glb', 'fbx') / 文件扩展名
 * @param toolSlug - Tool slug for organizing results / 工具标识用于组织结果
 * @returns S3 object URL / S3 对象 URL
 */
export async function downloadAndUpload(
  userId: string,
  taskId: string,
  sourceUrl: string,
  extension: string,
  toolSlug?: string
): Promise<string> {
  logger.info(`Downloading file from provider`, {
    taskId,
    sourceUrl: sourceUrl.substring(0, 100) + '...',
    extension,
  });

  // Download the file
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  logger.info(`Downloaded file, uploading to S3`, {
    taskId,
    size: buffer.length,
  });

  // Upload to S3
  return uploadTaskResult(userId, taskId, buffer, extension, toolSlug);
}
