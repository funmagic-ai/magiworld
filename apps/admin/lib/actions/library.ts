/**
 * @fileoverview Library Server Actions
 * @fileoverview 媒体库服务端操作
 *
 * Server actions for managing folders and media assets in the library.
 * Supports CRUD operations for folders and media, with support for
 * hierarchical folder structure and drag-and-drop file organization.
 * 用于管理媒体库中文件夹和媒体资产的服务端函数。
 * 支持文件夹和媒体的CRUD操作，包含层级文件夹结构和拖放文件组织功能。
 *
 * @module lib/actions/library
 */

'use server';

import { db, folders, media, eq, isNull, asc, desc, and, count, sum, sql } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { maybeSignUrl } from '@/lib/cloudfront';

// ============================================
// Duplicate Check Helpers / 重复检查辅助函数
// ============================================

/**
 * Check if a folder with the same name exists in the same parent
 * 检查同一父目录下是否存在同名文件夹
 */
async function folderNameExists(
  name: string,
  parentId: string | null,
  excludeId?: string
): Promise<boolean> {
  const condition = parentId
    ? and(eq(folders.name, name.trim()), eq(folders.parentId, parentId))
    : and(eq(folders.name, name.trim()), isNull(folders.parentId));

  const existing = await db
    .select({ id: folders.id })
    .from(folders)
    .where(condition)
    .limit(1);

  if (existing.length === 0) return false;
  if (excludeId && existing[0].id === excludeId) return false;
  return true;
}

/**
 * Check if a file with the same name exists in the same folder
 * 检查同一文件夹下是否存在同名文件
 */
async function fileNameExists(
  filename: string,
  folderId: string | null,
  excludeId?: string
): Promise<boolean> {
  const condition = folderId
    ? and(eq(media.filename, filename.trim()), eq(media.folderId, folderId))
    : and(eq(media.filename, filename.trim()), isNull(media.folderId));

  const existing = await db
    .select({ id: media.id })
    .from(media)
    .where(condition)
    .limit(1);

  if (existing.length === 0) return false;
  if (excludeId && existing[0].id === excludeId) return false;
  return true;
}

/**
 * Generate a unique filename by appending a number suffix
 * 通过添加数字后缀生成唯一文件名
 *
 * @param filename - Original filename / 原始文件名
 * @param folderId - Target folder ID / 目标文件夹ID
 * @returns Unique filename / 唯一文件名
 */
export async function generateUniqueFilename(
  filename: string,
  folderId: string | null
): Promise<string> {
  const exists = await fileNameExists(filename, folderId);
  if (!exists) return filename;

  // Split filename into name and extension
  const lastDotIndex = filename.lastIndexOf('.');
  const name = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename;
  const ext = lastDotIndex > 0 ? filename.slice(lastDotIndex) : '';

  let counter = 1;
  let newFilename = `${name} (${counter})${ext}`;

  while (await fileNameExists(newFilename, folderId)) {
    counter++;
    newFilename = `${name} (${counter})${ext}`;
  }

  return newFilename;
}

/**
 * Find or create the Magi folder structure / 查找或创建Magi文件夹结构
 *
 * Creates folder structure: magi/{yyyymmdd}/ for AI-generated images.
 * 创建文件夹结构：magi/{yyyymmdd}/，用于AI生成的图片。
 *
 * @returns Folder ID for the date folder / 日期文件夹的ID
 */
export async function findOrCreateMagiFolder(): Promise<string> {
  // Get current date in yyyymmdd format
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');

  // Find or create "magi" parent folder
  let [magiFolder] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.name, 'magi'), isNull(folders.parentId)))
    .limit(1);

  if (!magiFolder) {
    [magiFolder] = await db
      .insert(folders)
      .values({ name: 'magi', parentId: null })
      .returning();
  }

  // Find or create date subfolder
  let [dateFolder] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.name, dateStr), eq(folders.parentId, magiFolder.id)))
    .limit(1);

  if (!dateFolder) {
    [dateFolder] = await db
      .insert(folders)
      .values({ name: dateStr, parentId: magiFolder.id })
      .returning();
  }

  return dateFolder.id;
}

/**
 * Get statistics for a folder / 获取文件夹统计信息
 *
 * Returns subfolder count, file count, and total size.
 * 返回子文件夹数、文件数和总大小。
 *
 * @param folderId - Folder ID to get stats for / 要获取统计的文件夹ID
 * @returns Folder statistics / 文件夹统计信息
 */
async function getFolderStats(folderId: string): Promise<{
  subfolderCount: number;
  fileCount: number;
  totalSize: number;
}> {
  // Count subfolders
  const [subfolderResult] = await db
    .select({ count: count() })
    .from(folders)
    .where(eq(folders.parentId, folderId));

  // Count files and sum sizes (exclude soft-deleted)
  const [mediaResult] = await db
    .select({
      count: count(),
      totalSize: sum(media.size),
    })
    .from(media)
    .where(and(eq(media.folderId, folderId), isNull(media.deletedAt)));

  return {
    subfolderCount: subfolderResult?.count || 0,
    fileCount: mediaResult?.count || 0,
    totalSize: Number(mediaResult?.totalSize) || 0,
  };
}

// ============================================
// Types / 类型定义
// ============================================

export type Folder = {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type FolderWithStats = Folder & {
  subfolderCount: number;
  fileCount: number;
  totalSize: number;
};

export type MediaItem = {
  id: string;
  folderId: string | null;
  filename: string;
  url: string;
  alt: string | null;
  mimeType: string | null;
  width: number | null;
  height: number | null;
  size: number | null;
  createdAt: Date;
};

export type LibraryContents = {
  folders: FolderWithStats[];
  media: MediaItem[];
  currentFolder: Folder | null;
  breadcrumbs: Folder[];
  stats: {
    totalFolders: number;
    totalFiles: number;
    totalSize: number;
  };
};

// ============================================
// Folder Actions / 文件夹操作
// ============================================

/**
 * Get the contents of a folder / 获取文件夹内容
 *
 * Returns subfolders, media items, breadcrumbs, and statistics.
 * 返回子文件夹、媒体项、面包屑和统计信息。
 *
 * @param folderId - Folder ID (null for root) / 文件夹ID（null表示根目录）
 * @returns Library contents with folders, media, and stats / 包含文件夹、媒体和统计的库内容
 */
export async function getFolderContents(folderId?: string | null): Promise<LibraryContents> {
  // Get current folder info
  let currentFolder: Folder | null = null;
  if (folderId) {
    const [folder] = await db
      .select()
      .from(folders)
      .where(eq(folders.id, folderId))
      .limit(1);
    currentFolder = folder || null;
  }

  // Get breadcrumbs (path from root to current folder)
  const breadcrumbs: Folder[] = [];
  if (currentFolder) {
    let parent = currentFolder;
    while (parent) {
      breadcrumbs.unshift(parent);
      if (parent.parentId) {
        const [parentFolder] = await db
          .select()
          .from(folders)
          .where(eq(folders.id, parent.parentId))
          .limit(1);
        parent = parentFolder || null;
      } else {
        break;
      }
    }
  }

  // Get subfolders
  const subfolders = await db
    .select()
    .from(folders)
    .where(folderId ? eq(folders.parentId, folderId) : isNull(folders.parentId))
    .orderBy(asc(folders.name));

  // Get stats for each subfolder
  const foldersWithStats: FolderWithStats[] = await Promise.all(
    subfolders.map(async (folder) => {
      const stats = await getFolderStats(folder.id);
      return {
        ...folder,
        ...stats,
      };
    })
  );

  // Get media in folder (exclude soft-deleted)
  const mediaItems = await db
    .select()
    .from(media)
    .where(
      and(
        folderId ? eq(media.folderId, folderId) : isNull(media.folderId),
        isNull(media.deletedAt)
      )
    )
    .orderBy(desc(media.createdAt));

  // Sign URLs for secure access
  const signedMediaItems = mediaItems.map((item) => ({
    ...item,
    url: maybeSignUrl(item.url),
  }));

  // Calculate current folder stats
  const totalSize = mediaItems.reduce((acc, item) => acc + (item.size || 0), 0);

  return {
    folders: foldersWithStats,
    media: signedMediaItems,
    currentFolder,
    breadcrumbs,
    stats: {
      totalFolders: subfolders.length,
      totalFiles: mediaItems.length,
      totalSize,
    },
  };
}

/**
 * Create a new folder / 创建新文件夹
 *
 * Creates folder in specified parent or root if no parent specified.
 * 在指定父目录创建文件夹，未指定父目录则创建在根目录。
 *
 * @param name - Folder name / 文件夹名称
 * @param parentId - Parent folder ID (null for root) / 父文件夹ID（null表示根目录）
 * @returns Created folder / 创建的文件夹
 * @throws Error if folder name already exists in the same parent / 同名文件夹已存在时抛出错误
 */
export async function createFolder(name: string, parentId?: string | null): Promise<Folder> {
  const trimmedName = name.trim();
  const normalizedParentId = parentId || null;

  // Check for duplicate folder name
  if (await folderNameExists(trimmedName, normalizedParentId)) {
    throw new Error(`A folder named "${trimmedName}" already exists in this location`);
  }

  const [newFolder] = await db
    .insert(folders)
    .values({
      name: trimmedName,
      parentId: normalizedParentId,
    })
    .returning();

  revalidatePath('/library');
  return newFolder;
}

/**
 * Rename a folder / 重命名文件夹
 *
 * Updates folder name in the same parent directory.
 * 在同一父目录中更新文件夹名称。
 *
 * @param folderId - Folder ID to rename / 要重命名的文件夹ID
 * @param name - New folder name / 新文件夹名称
 * @returns Updated folder / 更新后的文件夹
 * @throws Error if folder name already exists in the same parent / 同名文件夹已存在时抛出错误
 */
export async function renameFolder(folderId: string, name: string): Promise<Folder> {
  const trimmedName = name.trim();

  // Get current folder to find its parent
  const [currentFolder] = await db
    .select()
    .from(folders)
    .where(eq(folders.id, folderId))
    .limit(1);

  if (!currentFolder) {
    throw new Error('Folder not found');
  }

  // Check for duplicate folder name (excluding current folder)
  if (await folderNameExists(trimmedName, currentFolder.parentId, folderId)) {
    throw new Error(`A folder named "${trimmedName}" already exists in this location`);
  }

  const [updatedFolder] = await db
    .update(folders)
    .set({
      name: trimmedName,
      updatedAt: new Date(),
    })
    .where(eq(folders.id, folderId))
    .returning();

  revalidatePath('/library');
  return updatedFolder;
}

/**
 * Recursively delete a folder and all its contents / 递归删除文件夹及其所有内容
 *
 * Deletes folder, all subfolders, and soft-deletes all media files.
 * 删除文件夹、所有子文件夹，并软删除所有媒体文件。
 *
 * @param folderId - Folder ID to delete / 要删除的文件夹ID
 * @returns Count of deleted folders and files / 删除的文件夹和文件数量
 */
export async function deleteFolder(folderId: string): Promise<{ deletedFolders: number; deletedFiles: number }> {
  let deletedFolders = 0;
  let deletedFiles = 0;
  const now = new Date();

  // Helper function to recursively delete
  async function deleteFolderRecursive(id: string): Promise<void> {
    // Get all subfolders
    const subfolders = await db
      .select({ id: folders.id })
      .from(folders)
      .where(eq(folders.parentId, id));

    // Recursively delete subfolders first
    for (const subfolder of subfolders) {
      await deleteFolderRecursive(subfolder.id);
    }

    // Soft delete all media in this folder (exclude already deleted)
    const mediaToDelete = await db
      .select({ id: media.id })
      .from(media)
      .where(and(eq(media.folderId, id), isNull(media.deletedAt)));

    if (mediaToDelete.length > 0) {
      await db
        .update(media)
        .set({ deletedAt: now })
        .where(and(eq(media.folderId, id), isNull(media.deletedAt)));
      deletedFiles += mediaToDelete.length;
    }

    // Delete the folder itself
    await db.delete(folders).where(eq(folders.id, id));
    deletedFolders++;
  }

  // Check if folder exists
  const [folder] = await db
    .select()
    .from(folders)
    .where(eq(folders.id, folderId))
    .limit(1);

  if (folder) {
    await deleteFolderRecursive(folderId);
  }

  revalidatePath('/library');
  return { deletedFolders, deletedFiles };
}

/**
 * Move a folder to a different parent / 将文件夹移动到不同的父目录
 *
 * Relocates folder to new parent. Prevents moving into self or descendants.
 * 将文件夹重定位到新的父目录。防止移动到自身或其子目录。
 *
 * @param folderId - Folder ID to move / 要移动的文件夹ID
 * @param newParentId - Target parent folder ID (null for root) / 目标父文件夹ID（null表示根目录）
 * @returns Updated folder / 更新后的文件夹
 * @throws Error if folder name already exists in target / 目标位置已存在同名文件夹时抛出错误
 */
export async function moveFolder(folderId: string, newParentId: string | null): Promise<Folder> {
  // Get current folder
  const [currentFolder] = await db
    .select()
    .from(folders)
    .where(eq(folders.id, folderId))
    .limit(1);

  if (!currentFolder) {
    throw new Error('Folder not found');
  }

  // Prevent moving folder into itself or its descendants
  if (newParentId) {
    let checkId: string | null = newParentId;
    while (checkId) {
      if (checkId === folderId) {
        throw new Error('Cannot move folder into itself or its descendants');
      }
      const [parent] = await db
        .select()
        .from(folders)
        .where(eq(folders.id, checkId))
        .limit(1);
      checkId = parent?.parentId || null;
    }
  }

  // Check for duplicate folder name in target location
  if (await folderNameExists(currentFolder.name, newParentId, folderId)) {
    throw new Error(`A folder named "${currentFolder.name}" already exists in the target location`);
  }

  const [updatedFolder] = await db
    .update(folders)
    .set({
      parentId: newParentId,
      updatedAt: new Date(),
    })
    .where(eq(folders.id, folderId))
    .returning();

  revalidatePath('/library');
  return updatedFolder;
}

// ============================================
// Media Actions / 媒体操作
// ============================================

/**
 * Get a single media item by ID / 按ID获取单个媒体项
 *
 * Returns media item with signed URL for secure access.
 * 返回带签名URL的媒体项以实现安全访问。
 *
 * @param mediaId - Media UUID / 媒体UUID
 * @returns Media item or null if not found / 媒体项，未找到返回null
 */
export async function getMediaItem(mediaId: string): Promise<MediaItem | null> {
  const [item] = await db
    .select()
    .from(media)
    .where(and(eq(media.id, mediaId), isNull(media.deletedAt)))
    .limit(1);

  if (!item) return null;

  // Sign URL for secure access
  return {
    ...item,
    url: maybeSignUrl(item.url),
  };
}

/**
 * Update media metadata / 更新媒体元数据
 *
 * Updates filename and/or alt text for a media item.
 * 更新媒体项的文件名和/或替代文本。
 *
 * @param mediaId - Media UUID / 媒体UUID
 * @param data - Fields to update / 要更新的字段
 * @returns Updated media item / 更新后的媒体项
 */
export async function updateMedia(
  mediaId: string,
  data: { filename?: string; alt?: string }
): Promise<MediaItem> {
  const [updatedMedia] = await db
    .update(media)
    .set({
      ...(data.filename && { filename: data.filename.trim() }),
      ...(data.alt !== undefined && { alt: data.alt.trim() || null }),
    })
    .where(eq(media.id, mediaId))
    .returning();

  revalidatePath('/library');
  return updatedMedia;
}

/**
 * Move media to a different folder / 将媒体移动到不同文件夹
 *
 * Relocates a single media item to target folder.
 * 将单个媒体项重定位到目标文件夹。
 *
 * @param mediaId - Media UUID / 媒体UUID
 * @param folderId - Target folder ID (null for root) / 目标文件夹ID（null表示根目录）
 * @returns Updated media item / 更新后的媒体项
 * @throws Error if filename already exists in target folder / 目标文件夹已存在同名文件时抛出错误
 */
export async function moveMedia(mediaId: string, folderId: string | null): Promise<MediaItem> {
  // Get current media item
  const [currentMedia] = await db
    .select()
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(1);

  if (!currentMedia) {
    throw new Error('Media not found');
  }

  // Check for duplicate filename in target folder
  if (await fileNameExists(currentMedia.filename, folderId, mediaId)) {
    throw new Error(`A file named "${currentMedia.filename}" already exists in the target folder`);
  }

  const [updatedMedia] = await db
    .update(media)
    .set({ folderId })
    .where(eq(media.id, mediaId))
    .returning();

  revalidatePath('/library');
  return updatedMedia;
}

/**
 * Move multiple media items to a folder / 批量移动媒体到文件夹
 *
 * Relocates multiple media items, renaming duplicates with a suffix.
 * 批量重定位媒体项，重复的文件会添加后缀重命名。
 *
 * @param mediaIds - Array of media UUIDs / 媒体UUID数组
 * @param folderId - Target folder ID (null for root) / 目标文件夹ID（null表示根目录）
 * @returns Count of moved items and list of renamed files / 移动的项目数和重命名文件列表
 */
export async function moveMediaBatch(
  mediaIds: string[],
  folderId: string | null
): Promise<{ moved: number; renamed: string[] }> {
  const renamed: string[] = [];

  for (const id of mediaIds) {
    const [currentMedia] = await db
      .select()
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    if (!currentMedia) continue;

    // Check for duplicate and generate unique name if needed
    let newFilename = currentMedia.filename;
    if (await fileNameExists(currentMedia.filename, folderId, id)) {
      newFilename = await generateUniqueFilename(currentMedia.filename, folderId);
      renamed.push(`${currentMedia.filename} → ${newFilename}`);
    }

    await db
      .update(media)
      .set({
        folderId,
        filename: newFilename,
      })
      .where(eq(media.id, id));
  }

  revalidatePath('/library');
  return { moved: mediaIds.length, renamed };
}

/**
 * Soft delete a media item / 软删除媒体项
 *
 * Sets deletedAt timestamp instead of actually deleting.
 * S3 file cleanup should be handled by a background job later.
 * 设置deletedAt时间戳而不是真正删除。S3文件清理应由后台任务处理。
 *
 * @param mediaId - Media UUID / 媒体UUID
 */
export async function deleteMedia(mediaId: string): Promise<void> {
  // Soft delete: set deletedAt timestamp instead of hard delete
  await db
    .update(media)
    .set({ deletedAt: new Date() })
    .where(eq(media.id, mediaId));
  revalidatePath('/library');
}

/**
 * Soft delete multiple media items / 批量软删除媒体项
 *
 * Sets deletedAt timestamp for multiple media items.
 * 为多个媒体项设置deletedAt时间戳。
 *
 * @param mediaIds - Array of media UUIDs / 媒体UUID数组
 */
export async function deleteMediaBatch(mediaIds: string[]): Promise<void> {
  const now = new Date();
  for (const id of mediaIds) {
    await db.update(media).set({ deletedAt: now }).where(eq(media.id, id));
  }
  revalidatePath('/library');
}

/**
 * Get all folders for folder picker / 获取所有文件夹用于文件夹选择器
 *
 * Returns flat list of all folders ordered by name.
 * 返回按名称排序的所有文件夹平面列表。
 *
 * @returns Array of all folders / 所有文件夹的数组
 */
export async function getAllFolders(): Promise<Folder[]> {
  const allFolders = await db
    .select()
    .from(folders)
    .orderBy(asc(folders.name));

  return allFolders;
}
