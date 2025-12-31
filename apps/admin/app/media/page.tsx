/**
 * @fileoverview Media Library Management Page
 *
 * Admin page for managing uploaded media files on the Magiworld platform.
 * Displays a grid of uploaded images and files with metadata and actions.
 *
 * Features:
 * - Grid display of media thumbnails
 * - Image preview for supported formats
 * - File metadata (type, size)
 * - Copy URL and delete actions on hover
 * - Upload new media button
 *
 * @module apps/admin/app/media/page
 */

import { db, media } from '@magiworld/db';
import { desc } from 'drizzle-orm';
import Link from 'next/link';

/**
 * Fetch all media files ordered by creation date.
 *
 * @returns Promise resolving to an array of media records
 */
async function getMediaList() {
  const result = await db
    .select()
    .from(media)
    .orderBy(desc(media.createdAt));

  return result;
}

/**
 * Format file size in bytes to human-readable format.
 *
 * Converts bytes to appropriate unit (B, KB, MB, GB).
 *
 * @param bytes - File size in bytes, or null
 * @returns Formatted file size string
 *
 * @example
 * ```typescript
 * formatBytes(1024);      // '1.0 KB'
 * formatBytes(1048576);   // '1.0 MB'
 * formatBytes(null);      // 'Unknown'
 * ```
 */
function formatBytes(bytes: number | null): string {
  if (!bytes) return 'Unknown';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Media library management page component.
 *
 * Renders a responsive grid of media items with:
 * - Square thumbnail preview for images
 * - File icon placeholder for non-image files
 * - Hover overlay with copy and delete actions
 * - Filename, file type, and size metadata
 *
 * @returns The rendered media management page
 */
export default async function MediaPage() {
  const mediaList = await getMediaList();

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Media</h1>
          <p className="text-muted-foreground">Manage uploaded media files.</p>
        </div>
        <Link
          href="/media/upload"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
            <line x1="16" y1="5" x2="22" y2="5" />
            <line x1="19" y1="2" x2="19" y2="8" />
          </svg>
          Upload Media
        </Link>
      </div>

      {/* Media Grid */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {mediaList.map((item) => (
          <div
            key={item.id}
            className="group rounded-lg border bg-card overflow-hidden shadow-sm"
          >
            {/* Thumbnail Area */}
            <div className="aspect-square bg-muted relative">
              {/* Image Preview */}
              {item.mimeType?.startsWith('image/') ? (
                <img
                  src={item.url}
                  alt={item.alt || item.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                /* File Icon Placeholder */
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                </div>
              )}

              {/* Hover Action Overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {/* Copy URL Button */}
                <button
                  className="rounded-full bg-white p-2 text-black hover:bg-gray-100"
                  title="Copy URL"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>

                {/* Delete Button */}
                <button
                  className="rounded-full bg-white p-2 text-red-600 hover:bg-gray-100"
                  title="Delete"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>

            {/* File Metadata */}
            <div className="p-3">
              <p className="font-medium text-sm truncate" title={item.filename}>
                {item.filename}
              </p>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.mimeType?.split('/')[1]?.toUpperCase() || 'Unknown'}</span>
                <span>{formatBytes(item.size)}</span>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {mediaList.length === 0 && (
          <div className="col-span-full rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No media files found. Upload your first file to get started.
          </div>
        )}
      </div>
    </div>
  );
}
