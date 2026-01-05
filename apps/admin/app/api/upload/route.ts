/**
 * @fileoverview Better-Upload API Route Handler
 *
 * Handles file uploads to AWS S3 using pre-signed URLs.
 * Supports two destinations:
 * - Library uploads → magiworld-admin-assets (private)
 * - Public uploads (banners, tools) → magiworld-cdn (public)
 *
 * @module apps/admin/app/api/upload/route
 */

import { route, type Router } from '@better-upload/server';
import { toRouteHandler } from '@better-upload/server/adapters/next';
import { aws } from '@better-upload/server/clients';
import { db, media } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { generateUniqueFilename } from '@/lib/actions/library';

// File size constants (in bytes)
const MB = 1024 * 1024;

// Bucket names
const ADMIN_ASSETS_BUCKET = process.env.S3_BUCKET_NAME || 'magiworld-admin-assets';
const CDN_BUCKET = process.env.S3_CDN_BUCKET || 'magiworld-cdn';

// Helper to build URL for admin assets bucket
// Uses CloudFront if configured, otherwise falls back to direct S3
const buildAdminS3Url = (key: string) => {
  // Prefer CloudFront URL for admin assets (serves from private bucket via OAC)
  if (process.env.CLOUDFRONT_ADMIN_URL) {
    return `${process.env.CLOUDFRONT_ADMIN_URL}/${key}`;
  }
  // Fallback to direct S3 URL (only works if bucket is public)
  const region = process.env.AWS_REGION || 'us-east-2';
  return `https://${ADMIN_ASSETS_BUCKET}.s3.${region}.amazonaws.com/${key}`;
};

// Helper to build CDN URL (CloudFront or direct S3)
const buildCdnUrl = (key: string) => {
  // Prefer CloudFront URL if configured
  if (process.env.CLOUDFRONT_URL) {
    return `${process.env.CLOUDFRONT_URL}/${key}`;
  }
  // Fallback to direct S3 URL
  const region = process.env.AWS_REGION || 'us-east-2';
  return `https://${CDN_BUCKET}.s3.${region}.amazonaws.com/${key}`;
};

// Lazy initialization of S3 client to avoid build-time errors
const getS3Client = () => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS credentials not configured');
  }
  return aws({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-2',
  });
};

// Define upload router (will be evaluated at runtime)
const router: Router = {
  get client() {
    return getS3Client();
  },
  bucketName: ADMIN_ASSETS_BUCKET,
  routes: {
    // ============================================
    // Library Uploads → magiworld-admin-assets (Private)
    // Used by: Assets > Library page
    // ============================================

    // Image uploads for library
    images: route<true>({
      fileTypes: ['image/*'],
      maxFileSize: 10 * MB,
      multipleFiles: true,
      maxFiles: 20,
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
        revalidatePath('/assets');
      },
    }),

    // Video uploads for library (with multipart support)
    videos: route<true, true>({
      fileTypes: ['video/*'],
      maxFileSize: 100 * MB,
      multipleFiles: true,
      maxFiles: 5,
      multipart: true,
      partSize: 10 * MB,
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
        revalidatePath('/assets');
      },
    }),

    // General assets for library (images + videos)
    assets: route<true>({
      fileTypes: ['image/*', 'video/*'],
      maxFileSize: 50 * MB,
      multipleFiles: true,
      maxFiles: 10,
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
        revalidatePath('/assets');
      },
    }),
  },
};

// ============================================
// CDN Uploads Router → magiworld-cdn (Public)
// Used by: Banners, Tool images (public content)
// ============================================

const cdnRouter: Router = {
  get client() {
    return getS3Client();
  },
  bucketName: CDN_BUCKET,
  routes: {
    // Banner images → CDN
    banners: route<true>({
      fileTypes: ['image/*'],
      maxFileSize: 10 * MB,
      multipleFiles: true,
      maxFiles: 5,
      onBeforeUpload: () => {
        // Generate unique keys with timestamp for cache busting
        return {
          generateObjectInfo: ({ file }) => {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'jpg';
            const name = file.name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');
            return {
              key: `banners/${name}-${timestamp}.${ext}`,
              cacheControl: 'public, max-age=31536000, immutable',
            };
          },
        };
      },
      onAfterSignedUrl: async ({ files }) => {
        // Note: Banner records are created by the banner form, not here
        // This callback just logs for debugging
        console.log(`[CDN Upload] ${files.length} banner image(s) uploaded`);
      },
    }),

    // Tool images (thumbnails, samples) → CDN
    tools: route<true>({
      fileTypes: ['image/*'],
      maxFileSize: 10 * MB,
      multipleFiles: true,
      maxFiles: 10,
      onBeforeUpload: ({ clientMetadata }) => {
        const metadata = clientMetadata as { toolId?: string; type?: string } | undefined;
        const toolId = metadata?.toolId || 'unknown';
        const type = metadata?.type || 'images';
        return {
          generateObjectInfo: ({ file }) => {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'jpg';
            const name = file.name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');
            return {
              key: `tools/${toolId}/${type}/${name}-${timestamp}.${ext}`,
              cacheControl: 'public, max-age=31536000, immutable',
            };
          },
        };
      },
      onAfterSignedUrl: async ({ files }) => {
        console.log(`[CDN Upload] ${files.length} tool image(s) uploaded`);
      },
    }),
  },
};

// Helper to get CDN URL for uploaded files
export function getCdnUrl(key: string): string {
  return buildCdnUrl(key);
}

// Export Next.js route handlers
// Main router handles library uploads to admin-assets bucket
export const { POST } = toRouteHandler(router);

// Export CDN router for public uploads
// Usage: Import cdnRouter in a separate route if needed, or use clientMetadata to distinguish
export { cdnRouter };
