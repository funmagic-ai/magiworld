'use server';

/**
 * @fileoverview Library Server Actions
 *
 * Server actions for managing folders and media assets in the library.
 * Supports CRUD operations for folders and media, with support for
 * hierarchical folder structure and drag-and-drop file organization.
 *
 * @module apps/admin/lib/actions/library
 */

import { db, folders, media, eq, isNull, asc, desc, and, count, sum, sql } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { maybeSignUrl } from '@/lib/cloudfront';

// ============================================
// Duplicate Check Helpers
// ============================================

/**
 * Check if a folder with the same name exists in the same parent
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
 * Find or create the Magi folder structure: magi/{yyyymmdd}/
 * Returns the folder ID for the date folder
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
 * Get statistics for a folder (subfolder count, file count, total size)
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
// Types
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
// Folder Actions
// ============================================

/**
 * Get the contents of a folder (subfolders and media)
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
 * Create a new folder
 * @throws Error if folder name already exists in the same parent
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
 * Rename a folder
 * @throws Error if folder name already exists in the same parent
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
 * Recursively delete a folder and all its contents (subfolders and files)
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
 * Move a folder to a different parent
 * @throws Error if folder name already exists in target location
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
// Media Actions
// ============================================

/**
 * Get a single media item by ID
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
 * Update media metadata
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
 * Move media to a different folder
 * @throws Error if filename already exists in target folder
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
 * Move multiple media items to a folder
 * Files with duplicate names will be renamed with a suffix
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
 * Soft delete a media item
 * Sets deletedAt timestamp instead of actually deleting.
 * S3 file cleanup should be handled by a background job later.
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
 * Soft delete multiple media items
 */
export async function deleteMediaBatch(mediaIds: string[]): Promise<void> {
  const now = new Date();
  for (const id of mediaIds) {
    await db.update(media).set({ deletedAt: now }).where(eq(media.id, id));
  }
  revalidatePath('/library');
}

/**
 * Get all folders for folder picker
 */
export async function getAllFolders(): Promise<Folder[]> {
  const allFolders = await db
    .select()
    .from(folders)
    .orderBy(asc(folders.name));

  return allFolders;
}
