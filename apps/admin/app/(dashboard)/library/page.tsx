/**
 * @fileoverview Asset Library Management Page
 * @fileoverview 资源库管理页面
 *
 * Admin page for managing uploaded media files on the Magiworld platform.
 * Supports folder organization, file uploads, and batch operations.
 * Magiworld平台上传媒体文件管理的管理页面。
 * 支持文件夹组织、文件上传和批量操作。
 *
 * Features / 功能:
 * - Hierarchical folder navigation with breadcrumbs / 层级文件夹导航与面包屑
 * - Drag-and-drop file uploads to S3 / 拖拽上传文件到S3
 * - Multi-select files for batch operations / 多选文件进行批量操作
 * - Move files between folders / 在文件夹之间移动文件
 *
 * @module apps/admin/app/library/page
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
