'use server';

import { db, homeBanners, homeBannerTranslations } from '@magiworld/db';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type BannerFormData = {
  type: 'main' | 'side';
  imageUrl?: string;
  link?: string;
  order: number;
  isActive: boolean;
  translations: {
    en: { title: string; subtitle?: string };
    zh: { title: string; subtitle?: string };
    ja: { title: string; subtitle?: string };
    pt: { title: string; subtitle?: string };
  };
};

export async function createBanner(data: BannerFormData) {
  const [banner] = await db
    .insert(homeBanners)
    .values({
      type: data.type,
      imageUrl: data.imageUrl || null,
      link: data.link || null,
      order: data.order,
      isActive: data.isActive,
    })
    .returning();

  // Insert translations
  const locales = ['en', 'zh', 'ja', 'pt'] as const;
  for (const locale of locales) {
    const translation = data.translations[locale];
    await db.insert(homeBannerTranslations).values({
      bannerId: banner.id,
      locale,
      title: translation.title,
      subtitle: translation.subtitle || null,
    });
  }

  revalidatePath('/banners');
  redirect('/banners');
}

export async function updateBanner(id: string, data: BannerFormData) {
  await db
    .update(homeBanners)
    .set({
      type: data.type,
      imageUrl: data.imageUrl || null,
      link: data.link || null,
      order: data.order,
      isActive: data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(homeBanners.id, id));

  // Update translations
  const locales = ['en', 'zh', 'ja', 'pt'] as const;
  for (const locale of locales) {
    const translation = data.translations[locale];

    // Check if translation exists for this specific locale
    const existing = await db
      .select()
      .from(homeBannerTranslations)
      .where(and(
        eq(homeBannerTranslations.bannerId, id),
        eq(homeBannerTranslations.locale, locale)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(homeBannerTranslations)
        .set({
          title: translation.title,
          subtitle: translation.subtitle || null,
        })
        .where(and(
          eq(homeBannerTranslations.bannerId, id),
          eq(homeBannerTranslations.locale, locale)
        ));
    } else {
      await db.insert(homeBannerTranslations).values({
        bannerId: id,
        locale,
        title: translation.title,
        subtitle: translation.subtitle || null,
      });
    }
  }

  revalidatePath('/banners');
  redirect('/banners');
}

/**
 * Soft delete a banner by setting deletedAt timestamp.
 * The banner record and associated media in S3 are preserved.
 */
export async function deleteBanner(id: string) {
  await db
    .update(homeBanners)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(homeBanners.id, id));
  revalidatePath('/banners');
  redirect('/banners');
}

/**
 * Restore a soft-deleted banner by clearing deletedAt.
 */
export async function restoreBanner(id: string) {
  await db
    .update(homeBanners)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(homeBanners.id, id));
  revalidatePath('/banners');
}

/**
 * Toggle banner active status.
 */
export async function toggleBannerActive(id: string, isActive: boolean) {
  await db
    .update(homeBanners)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(homeBanners.id, id));
  revalidatePath('/banners');
}

export async function getBannerById(id: string) {
  const [banner] = await db
    .select()
    .from(homeBanners)
    .where(eq(homeBanners.id, id))
    .limit(1);

  if (!banner) return null;

  const translations = await db
    .select()
    .from(homeBannerTranslations)
    .where(eq(homeBannerTranslations.bannerId, id));

  const translationsMap: Record<string, { title: string; subtitle?: string }> = {};
  for (const t of translations) {
    translationsMap[t.locale] = {
      title: t.title,
      subtitle: t.subtitle || undefined,
    };
  }

  return {
    ...banner,
    translations: translationsMap,
  };
}

