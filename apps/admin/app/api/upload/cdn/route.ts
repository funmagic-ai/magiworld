/**
 * @fileoverview CDN Upload API Route Handler
 * @fileoverview CDN上传API路由处理器
 *
 * Handles file uploads to the public CDN bucket (funmagic-web-public-assets).
 * Used for banners, tool images, and other public content.
 * 处理上传到公共CDN桶(funmagic-web-public-assets)的文件。
 * 用于横幅、工具图片和其他公共内容。
 *
 * Upload Routes / 上传路由:
 * - banners: Banner images for homepage / 首页横幅图片
 * - tools: Tool thumbnails and sample images / 工具缩略图和示例图片
 * - brands: OEM brand logos / OEM品牌Logo
 *
 * @module apps/admin/app/api/upload/cdn/route
 */

import { toRouteHandler } from '@better-upload/server/adapters/next';
import { cdnRouter } from '../route';

// Export Next.js route handlers for CDN uploads
export const { POST } = toRouteHandler(cdnRouter);
