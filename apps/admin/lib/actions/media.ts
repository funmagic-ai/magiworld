/**
 * @fileoverview Media Management Server Actions
 * @fileoverview 媒体管理服务端操作
 *
 * Server actions for CRUD operations on media files.
 * Used for direct media manipulation outside the library folder structure.
 * 用于媒体文件CRUD操作的服务端函数。在媒体库文件夹结构外直接操作媒体。
 *
 * @module lib/actions/media
 */

'use server';

import { db, media, eq } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Media form data structure / 媒体表单数据结构
 *
 * Contains media file metadata for create/update operations.
 * 包含创建/更新操作所需的媒体文件元数据。
 *
 * @property filename - Display filename / 显示文件名
 * @property url - S3/CDN URL to file / 文件的S3/CDN URL
 * @property alt - Alt text for images / 图片的替代文本
 * @property mimeType - MIME type (e.g., 'image/png') / MIME类型
 * @property width - Image width in pixels / 图片宽度（像素）
 * @property height - Image height in pixels / 图片高度（像素）
 * @property size - File size in bytes / 文件大小（字节）
 */
export type MediaFormData = {
  filename: string;
  url: string;
  alt?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  size?: number;
};

/**
 * Create a new media record / 创建新媒体记录
 *
 * Inserts media metadata into database. File should already be uploaded to S3.
 * 将媒体元数据插入数据库。文件应已上传到S3。
 *
 * @param data - Media form data / 媒体表单数据
 */
export async function createMedia(data: MediaFormData) {
  await db
    .insert(media)
    .values({
      filename: data.filename,
      url: data.url,
      alt: data.alt || null,
      mimeType: data.mimeType || null,
      width: data.width || null,
      height: data.height || null,
      size: data.size || null,
    });

  revalidatePath('/media');
  redirect('/media');
}

/**
 * Update media metadata / 更新媒体元数据
 *
 * Updates existing media record properties.
 * 更新现有媒体记录属性。
 *
 * @param id - Media UUID / 媒体UUID
 * @param data - Partial media form data / 部分媒体表单数据
 */
export async function updateMedia(id: string, data: Partial<MediaFormData>) {
  await db
    .update(media)
    .set({
      filename: data.filename,
      url: data.url,
      alt: data.alt || null,
      mimeType: data.mimeType || null,
      width: data.width || null,
      height: data.height || null,
      size: data.size || null,
    })
    .where(eq(media.id, id));

  revalidatePath('/media');
}

/**
 * Delete media record / 删除媒体记录
 *
 * Hard deletes media record from database.
 * Note: S3 file cleanup should be handled separately.
 * 从数据库硬删除媒体记录。注意：S3文件清理应单独处理。
 *
 * @param id - Media UUID / 媒体UUID
 */
export async function deleteMedia(id: string) {
  await db.delete(media).where(eq(media.id, id));
  revalidatePath('/media');
}

/**
 * Get media by ID / 按ID获取媒体
 *
 * Fetches single media record by UUID.
 * 按UUID获取单个媒体记录。
 *
 * @param id - Media UUID / 媒体UUID
 * @returns Media record or null if not found / 媒体记录，未找到返回null
 */
export async function getMediaById(id: string) {
  const [item] = await db
    .select()
    .from(media)
    .where(eq(media.id, id))
    .limit(1);

  return item || null;
}
