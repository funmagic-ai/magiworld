/**
 * @fileoverview Banner Management Server Actions
 * @fileoverview 横幅管理服务端操作
 *
 * Server actions for CRUD operations on homepage banners with multi-locale support.
 * 用于首页横幅CRUD操作的服务端函数，支持多语言翻译（英文/中文/日文/葡萄牙文）。
 *
 * @module lib/actions/banners
 */

'use server';

import { db, homeBanners, homeBannerTranslations, eq, and } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Banner form data structure / 横幅表单数据结构
 *
 * Contains banner configuration and multi-locale translations.
 * 包含横幅配置和多语言翻译。
 *
 * @property type - Banner type: 'main' or 'side' / 横幅类型：主横幅或侧边横幅
 * @property imageUrl - CDN URL to banner image / 横幅图片CDN URL
 * @property link - Click destination URL / 点击跳转URL
 * @property order - Display order / 显示顺序
 * @property isActive - Whether banner is enabled / 横幅是否启用
 * @property translations - Multi-locale content / 多语言内容
 */
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

/**
 * Create a new banner with translations / 创建新横幅及其翻译
 *
 * Inserts banner record and all locale translations (en/zh/ja/pt).
 * 插入横幅记录和所有语言翻译（英文/中文/日文/葡萄牙文）。
 *
 * @param data - Banner form data / 横幅表单数据
 * @throws Database error on constraint violation / 约束冲突时抛出数据库错误
 */
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

/**
 * Update an existing banner / 更新现有横幅
 *
 * Updates banner properties and upserts translations for all locales.
 * 更新横幅属性并为所有语言更新或插入翻译。
 *
 * @param id - Banner UUID / 横幅UUID
 * @param data - Updated banner form data / 更新后的横幅表单数据
 */
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
 * Soft delete a banner / 软删除横幅
 *
 * Sets deletedAt timestamp without removing the record.
 * Banner data and associated S3 media are preserved for potential recovery.
 * 设置deletedAt时间戳，不删除记录。横幅数据和关联的S3媒体保留以便恢复。
 *
 * @param id - Banner UUID / 横幅UUID
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
 * Restore a soft-deleted banner / 恢复软删除的横幅
 *
 * Clears deletedAt timestamp to make banner active again.
 * 清除deletedAt时间戳使横幅重新激活。
 *
 * @param id - Banner UUID / 横幅UUID
 */
export async function restoreBanner(id: string) {
  await db
    .update(homeBanners)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(homeBanners.id, id));
  revalidatePath('/banners');
}

/**
 * Toggle banner active status / 切换横幅激活状态
 *
 * Enables or disables a banner without deletion.
 * 启用或禁用横幅，不删除。
 *
 * @param id - Banner UUID / 横幅UUID
 * @param isActive - New active status / 新的激活状态
 */
export async function toggleBannerActive(id: string, isActive: boolean) {
  await db
    .update(homeBanners)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(homeBanners.id, id));
  revalidatePath('/banners');
}

/**
 * Get banner by ID with translations / 按ID获取横幅及翻译
 *
 * Fetches banner record and all associated translations.
 * 获取横幅记录和所有关联的翻译。
 *
 * @param id - Banner UUID / 横幅UUID
 * @returns Banner with translations map, or null if not found / 带翻译的横幅，未找到返回null
 */
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
