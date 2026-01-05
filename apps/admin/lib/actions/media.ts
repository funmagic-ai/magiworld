'use server';

import { db, media } from '@magiworld/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type MediaFormData = {
  filename: string;
  url: string;
  alt?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  size?: number;
};

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

export async function deleteMedia(id: string) {
  await db.delete(media).where(eq(media.id, id));
  revalidatePath('/media');
}

export async function getMediaById(id: string) {
  const [item] = await db
    .select()
    .from(media)
    .where(eq(media.id, id))
    .limit(1);

  return item || null;
}
