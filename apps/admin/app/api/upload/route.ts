/**
 * @fileoverview Better-Upload API Route Handler
 *
 * Handles file uploads to AWS S3 using pre-signed URLs.
 * Supports two destinations:
 * - Library uploads → admin-assets bucket (private)
 * - Public uploads (banners, tools, brands) → public-assets bucket (public)
 *
 * @module apps/admin/app/api/upload/route
 */

import { route, type Router } from '@better-upload/server';
import { toRouteHandler } from '@better-upload/server/adapters/next';
import { aws } from '@better-upload/server/clients';
import { db, media } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { generateUniqueFilename, findOrCreateMagiFolder } from '@/lib/actions/library';
import { env, getAdminAssetUrl, getPublicCdnUrl } from '@/lib/env';

// File size constants (in bytes)
const MB = 1024 * 1024;

// Helper to build URL for admin assets bucket (uses CloudFront)
const buildAdminS3Url = (key: string) => getAdminAssetUrl(key);

// Helper to build public CDN URL (uses CloudFront)
const buildPublicUrl = (key: string) => getPublicCdnUrl(key);

// Lazy initialization of S3 client to avoid build-time errors
const getS3Client = () => {
  return aws({
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION,
  });
};

// Define upload router (will be evaluated at runtime)
const router: Router = {
  get client() {
    return getS3Client();
  },
  bucketName: env.S3_ADMIN_ASSETS_BUCKET,
  routes: {
    // ============================================
    // Library Uploads → Admin Assets Bucket (Private)
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
        revalidatePath('/library');
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
        revalidatePath('/library');
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
        revalidatePath('/library');
      },
    }),

    // Magi AI results → saved to library under magi/{yyyymmdd}/ folder
    magi: route({
      fileTypes: ['image/png', 'image/jpeg', 'image/webp'],
      maxFileSize: 20 * MB,
      onAfterSignedUrl: async ({ file }) => {
        // Get or create magi/{yyyymmdd}/ folder structure
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

    // Chat image uploads → stored under chat/{conversationId}/ folder
    // Used for image input to AI models (editing, vision)
    chatImages: route<true>({
      fileTypes: ['image/*'],
      maxFileSize: 10 * MB,
      multipleFiles: true,
      maxFiles: 16,
      onBeforeUpload: ({ clientMetadata }) => {
        const metadata = clientMetadata as { conversationId?: string } | undefined;
        const conversationId = metadata?.conversationId || 'temp';
        return {
          generateObjectInfo: ({ file }) => {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'jpg';
            const name = file.name.replace(`.${ext}`, '').replace(/[^a-zA-Z0-9-_]/g, '-');
            return {
              key: `chat/${conversationId}/${name}-${timestamp}.${ext}`,
            };
          },
        };
      },
      onAfterSignedUrl: async ({ files }) => {
        // No DB insert here - chat component handles message storage
        console.log(`[Chat Upload] ${files.length} image(s) uploaded for chat`);
      },
    }),
  },
};

// ============================================
// Public Assets Router → Public Assets Bucket (Public CDN)
// Used by: Banners, Tool images, Brand logos (public content)
// ============================================

const cdnRouter: Router = {
  get client() {
    return getS3Client();
  },
  bucketName: env.S3_PUBLIC_ASSETS_BUCKET,
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

    // OEM brand logos → CDN
    brands: route<true>({
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
              key: `brands/${name}-${timestamp}.${ext}`,
              cacheControl: 'public, max-age=31536000, immutable',
            };
          },
        };
      },
      onAfterSignedUrl: async ({ files }) => {
        // Note: Brand records are created by the brand form, not here
        // This callback just logs for debugging
        console.log(`[CDN Upload] ${files.length} brand image(s) uploaded`);
      },
    }),
  },
};

// Helper to get public CDN URL for uploaded files
export function getPublicUrl(key: string): string {
  return buildPublicUrl(key);
}

// Alias for backwards compatibility
export const getCdnUrl = getPublicUrl;

// Export Next.js route handlers
// Main router handles library uploads to admin-assets bucket
export const { POST } = toRouteHandler(router);

// Export CDN router for public uploads
// Usage: Import cdnRouter in a separate route if needed, or use clientMetadata to distinguish
export { cdnRouter };
