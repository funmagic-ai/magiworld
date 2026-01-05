/**
 * @fileoverview Asset Library Management Page
 *
 * Admin page for managing uploaded media files on the Magiworld platform.
 * Supports folder organization, file uploads, and selection for Magi processing.
 *
 * Features:
 * - Hierarchical folder navigation with breadcrumbs
 * - Drag-and-drop file uploads to S3
 * - Multi-select files for batch operations
 * - Send selected files to Magi AI assistant
 * - Move files between folders
 *
 * @module apps/admin/app/assets/page
 */

import { getFolderContents, getAllFolders } from '@/lib/actions/library';
import { LibraryClient } from '@/components/library/library-client';

// Disable caching to ensure fresh data on every request
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams: Promise<{ folder?: string }>;
};

export default async function LibraryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const folderId = params.folder || null;

  const [contents, allFolders] = await Promise.all([
    getFolderContents(folderId),
    getAllFolders(),
  ]);

  return (
    <LibraryClient
      folders={contents.folders}
      media={contents.media}
      currentFolder={contents.currentFolder}
      breadcrumbs={contents.breadcrumbs}
      allFolders={allFolders}
      stats={contents.stats}
    />
  );
}
