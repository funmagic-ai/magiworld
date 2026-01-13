/**
 * @fileoverview CDN Upload API Route Handler
 *
 * Handles file uploads to the public CDN bucket (funmagic-web-public-assets).
 * Used for banners, tool images, and other public content.
 *
 * Upload Routes:
 * - banners: Banner images for homepage
 * - tools: Tool thumbnails and sample images
 *
 * @module apps/admin/app/api/upload/cdn/route
 */

import { toRouteHandler } from '@better-upload/server/adapters/next';
import { cdnRouter } from '../route';

// Export Next.js route handlers for CDN uploads
export const { POST } = toRouteHandler(cdnRouter);
