/**
 * @fileoverview Better-Upload API Route Handler
 * @fileoverview Better-Upload 文件上传路由处理器
 *
 * Handles file uploads to AWS S3 using pre-signed URLs.
 * 使用预签名URL处理文件上传到AWS S3。
 *
 * Supports two destinations / 支持两个目标存储桶:
 * - Library uploads → admin-assets bucket (private) / 媒体库上传 → 管理员资产桶（私有）
 * - Public uploads (banners, tools, brands) → public-assets bucket (public) / 公共上传 → 公共资产桶（公开）
 *
 * @module apps/admin/app/api/upload/route
 */

import { route, type Router } from '@better-upload/server';
import { toRouteHandler } from '@better-upload/server/adapters/next';
import { aws } from '@better-upload/server/clients';
import { db, media } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { getLogtoContext } from '@logto/next/server-actions';
import { generateUniqueFilename, findOrCreateMagiFolder } from '@/lib/actions/library';
import { getAdminUserByLogtoId } from '@/lib/admin-user';
import { logtoConfig } from '@/lib/logto';
import { env, getAdminAssetUrl, getPublicCdnUrl, getUploadMaxSize, prefixS3Key } from '@/lib/env';

/**
 * Get current admin user ID from session / 从会话获取当前管理员用户ID
 * Returns 'anonymous' if not authenticated (should not happen in admin app).
 * 如果未认证返回'anonymous'（在管理后台不应发生）。
 */
async function getAdminUserId(): Promise<string> {
  try {
    const context = await getLogtoContext(logtoConfig);
    if (context.isAuthenticated && context.claims?.sub) {
      const adminUser = await getAdminUserByLogtoId(context.claims.sub);
      if (adminUser) {
        return adminUser.id;
      }
    }
  } catch {
    // Fall through to anonymous
  }
  return 'anonymous';
}

/**
 * Get max file size from environment / 从环境变量获取最大文件大小
 * Uses UPLOAD_MAX_SIZE_MB env var, defaults to 20MB.
 * 使用UPLOAD_MAX_SIZE_MB环境变量，默认20MB。
 */
const MAX_FILE_SIZE = getUploadMaxSize();

/**
 * Build CloudFront URL for admin assets / 构建管理员资产的CloudFront URL
 * @param key - S3 object key / S3对象键
 * @returns CloudFront URL / CloudFront URL
 */
const buildAdminS3Url = (key: string) => getAdminAssetUrl(key);

/**
 * Build CloudFront URL for public CDN assets / 构建公共CDN资产的CloudFront URL
 * @param key - S3 object key / S3对象键
 * @returns CloudFront URL / CloudFront URL
 */
const buildPublicUrl = (key: string) => getPublicCdnUrl(key);

/**
 * Lazy initialization of S3 client / 延迟初始化S3客户端
 * Avoids build-time errors when env vars are not available.
 * 避免环境变量不可用时的构建错误。
 * @returns AWS S3 client instance / AWS S3客户端实例
 */
const getS3Client = () => {
  return aws({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
  });
};

/**
 * Library Upload Router / 媒体库上传路由
 *
 * Handles uploads to admin-assets bucket (private).
 * 处理上传到管理员资产桶（私有）。
 *
 * Routes / 路由:
 * - assets: General image/video uploads / 通用图片/视频上传
 * - magi: AI-generated results / AI生成的结果
 */
const router: Router = {
  get client() {
    return getS3Client();
  },
  bucketName: env.S3_ADMIN_ASSETS_BUCKET,
  routes: {
    /**
     * General assets upload / 通用资产上传
     * Used by: UploadDropzone component in Library page
     * 使用者：媒体库页面的UploadDropzone组件
     *
     * Path: {env}/admins/{adminId}/library/uploads/{filename}-{ts}.{ext}
     */
    assets: route<true>({
      fileTypes: ['image/*', 'video/*'],
      maxFileSize: MAX_FILE_SIZE,
      multipleFiles: true,
      maxFiles: 10,
      onBeforeUpload: async () => {
        const adminId = await getAdminUserId();
        return {
          generateObjectInfo: ({ file }) => {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'jpg';
            const name = file.name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');
            return {
              key: prefixS3Key(`admins/${adminId}/library/uploads/${name}-${timestamp}.${ext}`),
            };
          },
        };
      },
      onAfterSignedUrl: async ({ files, clientMetadata }) => {
        const metadata = clientMetadata as { folderId?: string } | undefined;
        const folderId = metadata?.folderId || null;
        for (const file of files) {
          const uniqueFilename = await generateUniqueFilename(file.name, folderId);
          await db.insert(media).values({
            filename: uniqueFilename,
            url: buildAdminS3Url(file.objectInfo.key),
            mimeType: file.type,
            size: file.size,
            folderId,
          });
        }
        revalidatePath('/library');
      },
    }),

    /**
     * Magi AI results upload / Magi AI结果上传
     * Saves AI-generated images to library under magi folder.
     * 将AI生成的图片保存到媒体库的magi文件夹下。
     * Used by: ResultActions component (Save to Library)
     * 使用者：ResultActions组件（保存到媒体库）
     *
     * Path: {env}/admins/{adminId}/library/magi/{filename}-{ts}.{ext}
     */
    magi: route({
      fileTypes: ['image/png', 'image/jpeg', 'image/webp'],
      maxFileSize: MAX_FILE_SIZE,
      onBeforeUpload: async ({ file }) => {
        const adminId = await getAdminUserId();
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'png';
        const name = file.name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');
        return {
          objectInfo: {
            key: prefixS3Key(`admins/${adminId}/library/magi/${name}-${timestamp}.${ext}`),
          },
        };
      },
      onAfterSignedUrl: async ({ file }) => {
        const folderId = await findOrCreateMagiFolder();
        const uniqueFilename = await generateUniqueFilename(file.name, folderId);
        await db.insert(media).values({
          filename: uniqueFilename,
          url: buildAdminS3Url(file.objectInfo.key),
          mimeType: file.type,
          size: file.size,
          folderId,
        });
        revalidatePath('/library');
      },
    }),
  },
};

/**
 * Public CDN Upload Router / 公共CDN上传路由
 *
 * Handles uploads to public-assets bucket (served via CloudFront CDN).
 * 处理上传到公共资产桶（通过CloudFront CDN提供服务）。
 *
 * Routes / 路由:
 * - banners: Homepage banner images / 首页横幅图片
 * - tools: Tool thumbnails and samples / 工具缩略图和示例
 * - brands: OEM brand logos / OEM品牌Logo
 */
const cdnRouter: Router = {
  get client() {
    return getS3Client();
  },
  bucketName: env.S3_PUBLIC_ASSETS_BUCKET,
  routes: {
    /**
     * Banner images upload / 横幅图片上传
     * Used by: BannerForm component
     * 使用者：BannerForm组件
     *
     * Path: {env}/public/banners/{adminId}/{filename}-{ts}.{ext}
     */
    banners: route<true>({
      fileTypes: ['image/*'],
      maxFileSize: MAX_FILE_SIZE,
      multipleFiles: true,
      maxFiles: 5,
      onBeforeUpload: async () => {
        const adminId = await getAdminUserId();
        return {
          generateObjectInfo: ({ file }) => {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'jpg';
            const name = file.name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');
            return {
              key: prefixS3Key(`public/banners/${adminId}/${name}-${timestamp}.${ext}`),
              cacheControl: 'public, max-age=31536000, immutable',
            };
          },
        };
      },
      onAfterSignedUrl: async ({ files }) => {
        console.log(`[CDN Upload] ${files.length} banner image(s) uploaded`);
      },
    }),

    /**
     * Tool images upload / 工具图片上传
     * Thumbnails and sample images for tools.
     * 工具的缩略图和示例图片。
     * Used by: ToolForm component
     * 使用者：ToolForm组件
     *
     * Path: {env}/public/tools/{toolId}/{type}/{filename}-{ts}.{ext}
     */
    tools: route<true>({
      fileTypes: ['image/*'],
      maxFileSize: MAX_FILE_SIZE,
      multipleFiles: true,
      maxFiles: 10,
      onBeforeUpload: async ({ clientMetadata }) => {
        const metadata = clientMetadata as { toolId?: string; type?: string } | undefined;
        const toolId = metadata?.toolId || 'unknown';
        const type = metadata?.type || 'images';
        return {
          generateObjectInfo: ({ file }) => {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'jpg';
            const name = file.name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');
            return {
              key: prefixS3Key(`public/tools/${toolId}/${type}/${name}-${timestamp}.${ext}`),
              cacheControl: 'public, max-age=31536000, immutable',
            };
          },
        };
      },
      onAfterSignedUrl: async ({ files }) => {
        console.log(`[CDN Upload] ${files.length} tool image(s) uploaded`);
      },
    }),

    /**
     * OEM brand logos upload / OEM品牌Logo上传
     * Logo images for white-label software brands.
     * 白标软件品牌的Logo图片。
     * Used by: OemBrandForm component
     * 使用者：OemBrandForm组件
     *
     * Path: {env}/public/brands/{brandSlug}/{filename}-{ts}.{ext}
     */
    brands: route<true>({
      fileTypes: ['image/*'],
      maxFileSize: MAX_FILE_SIZE,
      multipleFiles: true,
      maxFiles: 5,
      onBeforeUpload: async ({ clientMetadata }) => {
        const metadata = clientMetadata as { brandSlug?: string } | undefined;
        const brandSlug = metadata?.brandSlug || 'unknown';
        return {
          generateObjectInfo: ({ file }) => {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'jpg';
            const name = file.name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');
            return {
              key: prefixS3Key(`public/brands/${brandSlug}/${name}-${timestamp}.${ext}`),
              cacheControl: 'public, max-age=31536000, immutable',
            };
          },
        };
      },
      onAfterSignedUrl: async ({ files }) => {
        console.log(`[CDN Upload] ${files.length} brand image(s) uploaded`);
      },
    }),
  },
};

/**
 * Get public CDN URL for uploaded files / 获取已上传文件的公共CDN URL
 * @param key - S3 object key / S3对象键
 * @returns Full CloudFront URL / 完整的CloudFront URL
 */
export function getPublicUrl(key: string): string {
  return buildPublicUrl(key);
}

/** Alias for backwards compatibility / 向后兼容的别名 */
export const getCdnUrl = getPublicUrl;

/**
 * Next.js POST handler for library uploads / 媒体库上传的Next.js POST处理器
 * Endpoint: /api/upload
 * 端点：/api/upload
 */
export const { POST } = toRouteHandler(router);

/**
 * CDN router for public uploads / 公共上传的CDN路由
 * Used by: /api/upload/cdn route
 * 使用者：/api/upload/cdn路由
 */
export { cdnRouter };
