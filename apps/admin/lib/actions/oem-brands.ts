/**
 * @fileoverview OEM Brand Management Server Actions
 * @fileoverview OEM品牌管理服务端操作
 *
 * Server actions for CRUD operations on OEM (white-label) software brands.
 * OEM brands allow customizing the software appearance for different partners.
 * 用于OEM（白标）软件品牌CRUD操作的服务端函数。
 * OEM品牌允许为不同合作伙伴自定义软件外观。
 *
 * @module lib/actions/oem-brands
 */

'use server';

import { db, oemSoftwareBrands, eq } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Theme configuration for OEM brands / OEM品牌主题配置
 *
 * Uses predefined color palettes for consistent branding.
 * 使用预定义的颜色调色板保持品牌一致性。
 *
 * @property palette - Palette key from brandPalettes / 品牌调色板中的调色板键
 * @property logo - CDN URL to brand logo / 品牌Logo的CDN URL
 * @property brandName - Display name shown in software UI / 软件UI中显示的品牌名称
 */
export type ThemeConfig = {
  palette?: string;
  logo?: string;
  brandName?: string;
};

/**
 * OEM brand form data structure / OEM品牌表单数据结构
 *
 * Contains brand configuration for create/update operations.
 * 包含创建/更新操作所需的品牌配置。
 *
 * @property slug - URL-friendly identifier / URL友好的标识符
 * @property name - Internal brand name / 内部品牌名称
 * @property softwareId - Parent software product ID / 父软件产品ID
 * @property themeConfig - Theme and branding settings / 主题和品牌设置
 * @property allowedToolTypeIds - Permitted tool type IDs / 允许的工具类型ID列表
 * @property isActive - Whether brand is enabled / 品牌是否启用
 */
export type OemBrandFormData = {
  slug: string;
  name: string;
  softwareId: string;
  themeConfig: ThemeConfig;
  allowedToolTypeIds: string[];
  isActive: boolean;
};

/**
 * Create a new OEM brand / 创建新OEM品牌
 *
 * Inserts OEM software brand record with theme configuration.
 * 插入带主题配置的OEM软件品牌记录。
 *
 * @param data - OEM brand form data / OEM品牌表单数据
 * @throws Database error on constraint violation / 约束冲突时抛出数据库错误
 */
export async function createOemBrand(data: OemBrandFormData) {
  const [brand] = await db
    .insert(oemSoftwareBrands)
    .values({
      slug: data.slug,
      name: data.name,
      softwareId: data.softwareId,
      themeConfig: data.themeConfig,
      allowedToolTypeIds: data.allowedToolTypeIds,
      isActive: data.isActive,
    })
    .returning();

  revalidatePath('/oem-brands');
  redirect('/oem-brands');
}

/**
 * Update an existing OEM brand / 更新现有OEM品牌
 *
 * Updates OEM brand properties. Note: softwareId cannot be changed after creation.
 * 更新OEM品牌属性。注意：softwareId创建后不可更改。
 *
 * @param id - OEM brand UUID / OEM品牌UUID
 * @param data - Updated OEM brand form data / 更新后的OEM品牌表单数据
 */
export async function updateOemBrand(id: string, data: OemBrandFormData) {
  await db
    .update(oemSoftwareBrands)
    .set({
      slug: data.slug,
      name: data.name,
      // Note: softwareId is intentionally not updated after creation
      themeConfig: data.themeConfig,
      allowedToolTypeIds: data.allowedToolTypeIds,
      isActive: data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(oemSoftwareBrands.id, id));

  revalidatePath('/oem-brands');
  redirect('/oem-brands');
}

/**
 * Delete an OEM brand / 删除OEM品牌
 *
 * Hard deletes OEM software brand record.
 * 硬删除OEM软件品牌记录。
 *
 * @param id - OEM brand UUID / OEM品牌UUID
 */
export async function deleteOemBrand(id: string) {
  await db.delete(oemSoftwareBrands).where(eq(oemSoftwareBrands.id, id));
  revalidatePath('/oem-brands');
  redirect('/oem-brands');
}

/**
 * Get OEM brand by ID / 按ID获取OEM品牌
 *
 * Fetches single OEM brand record with parsed JSON fields.
 * 获取单个OEM品牌记录，解析JSON字段。
 *
 * @param id - OEM brand UUID / OEM品牌UUID
 * @returns OEM brand with parsed config, or null if not found / 带解析配置的OEM品牌，未找到返回null
 */
export async function getOemBrandById(id: string) {
  const [brand] = await db
    .select()
    .from(oemSoftwareBrands)
    .where(eq(oemSoftwareBrands.id, id))
    .limit(1);

  if (!brand) return null;

  return {
    id: brand.id,
    slug: brand.slug,
    name: brand.name,
    softwareId: brand.softwareId,
    themeConfig: (brand.themeConfig as ThemeConfig) || {},
    allowedToolTypeIds: (brand.allowedToolTypeIds as string[]) || [],
    isActive: brand.isActive,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  };
}

/**
 * Get all OEM brands for list view / 获取所有OEM品牌列表
 *
 * Fetches all OEM brands ordered by name for admin list page.
 * 获取按名称排序的所有OEM品牌，用于管理员列表页。
 *
 * @returns Array of OEM brands with parsed config / 带解析配置的OEM品牌数组
 */
export async function getOemBrandsList() {
  const brands = await db
    .select()
    .from(oemSoftwareBrands)
    .orderBy(oemSoftwareBrands.name);

  return brands.map((brand) => ({
    id: brand.id,
    slug: brand.slug,
    name: brand.name,
    softwareId: brand.softwareId,
    themeConfig: (brand.themeConfig as ThemeConfig) || {},
    allowedToolTypeIds: (brand.allowedToolTypeIds as string[]) || [],
    isActive: brand.isActive,
  }));
}
