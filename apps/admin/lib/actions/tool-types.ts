/**
 * @fileoverview Tool Type Management Server Actions
 * @fileoverview 工具类型管理服务端操作
 *
 * Server actions for CRUD operations on tool types (categories) with multi-locale support.
 * Tool types are categories that group related AI tools together.
 * 用于工具类型（分类）CRUD操作的服务端函数，支持多语言翻译。
 * 工具类型是将相关AI工具分组在一起的分类。
 *
 * @module lib/actions/tool-types
 */

'use server';

import { db, toolTypes, toolTypeTranslations, eq, and } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Tool type form data structure / 工具类型表单数据结构
 *
 * Contains tool type configuration and multi-locale translations.
 * 包含工具类型配置和多语言翻译。
 *
 * @property slug - URL-friendly identifier / URL友好的标识符
 * @property badgeColor - Badge color variant / 徽章颜色变体
 * @property order - Display order / 显示顺序
 * @property isActive - Whether type is enabled / 类型是否启用
 * @property translations - Multi-locale content / 多语言内容
 */
export type ToolTypeFormData = {
  slug: string;
  badgeColor: 'default' | 'secondary' | 'outline';
  order: number;
  isActive: boolean;
  translations: {
    en: { name: string; description?: string };
    zh: { name: string; description?: string };
    ja: { name: string; description?: string };
    pt: { name: string; description?: string };
  };
};

/**
 * Create a new tool type with translations / 创建新工具类型及其翻译
 *
 * Inserts tool type record and all locale translations (en/zh/ja/pt).
 * 插入工具类型记录和所有语言翻译（英文/中文/日文/葡萄牙文）。
 *
 * @param data - Tool type form data / 工具类型表单数据
 * @throws Database error on constraint violation / 约束冲突时抛出数据库错误
 */
export async function createToolType(data: ToolTypeFormData) {
  const [toolType] = await db
    .insert(toolTypes)
    .values({
      slug: data.slug,
      badgeColor: data.badgeColor,
      order: data.order,
      isActive: data.isActive,
    })
    .returning();

  // Insert translations
  const locales = ['en', 'zh', 'ja', 'pt'] as const;
  for (const locale of locales) {
    const translation = data.translations[locale];
    await db.insert(toolTypeTranslations).values({
      toolTypeId: toolType.id,
      locale,
      name: translation.name,
      description: translation.description || null,
    });
  }

  revalidatePath('/tool-types');
  redirect('/tool-types');
}

/**
 * Update an existing tool type / 更新现有工具类型
 *
 * Updates tool type properties and upserts translations for all locales.
 * 更新工具类型属性并为所有语言更新或插入翻译。
 *
 * @param id - Tool type UUID / 工具类型UUID
 * @param data - Updated tool type form data / 更新后的工具类型表单数据
 */
export async function updateToolType(id: string, data: ToolTypeFormData) {
  await db
    .update(toolTypes)
    .set({
      slug: data.slug,
      badgeColor: data.badgeColor,
      order: data.order,
      isActive: data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(toolTypes.id, id));

  // Update translations
  const locales = ['en', 'zh', 'ja', 'pt'] as const;
  for (const locale of locales) {
    const translation = data.translations[locale];

    // Check if translation exists for this specific locale
    const existing = await db
      .select()
      .from(toolTypeTranslations)
      .where(and(
        eq(toolTypeTranslations.toolTypeId, id),
        eq(toolTypeTranslations.locale, locale)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(toolTypeTranslations)
        .set({
          name: translation.name,
          description: translation.description || null,
        })
        .where(and(
          eq(toolTypeTranslations.toolTypeId, id),
          eq(toolTypeTranslations.locale, locale)
        ));
    } else {
      await db.insert(toolTypeTranslations).values({
        toolTypeId: id,
        locale,
        name: translation.name,
        description: translation.description || null,
      });
    }
  }

  revalidatePath('/tool-types');
  redirect('/tool-types');
}

/**
 * Delete a tool type / 删除工具类型
 *
 * Hard deletes tool type and associated translations.
 * Warning: May fail if tools reference this type.
 * 硬删除工具类型及其关联翻译。警告：如果有工具引用此类型可能失败。
 *
 * @param id - Tool type UUID / 工具类型UUID
 */
export async function deleteToolType(id: string) {
  await db.delete(toolTypes).where(eq(toolTypes.id, id));
  revalidatePath('/tool-types');
  redirect('/tool-types');
}

/**
 * Get tool type by ID with translations / 按ID获取工具类型及翻译
 *
 * Fetches tool type record and all associated translations.
 * 获取工具类型记录和所有关联的翻译。
 *
 * @param id - Tool type UUID / 工具类型UUID
 * @returns Tool type with translations map, or null if not found / 带翻译的工具类型，未找到返回null
 */
export async function getToolTypeById(id: string) {
  const [toolType] = await db
    .select()
    .from(toolTypes)
    .where(eq(toolTypes.id, id))
    .limit(1);

  if (!toolType) return null;

  const translations = await db
    .select()
    .from(toolTypeTranslations)
    .where(eq(toolTypeTranslations.toolTypeId, id));

  const translationsMap: Record<string, { name: string; description?: string }> = {};
  for (const t of translations) {
    translationsMap[t.locale] = {
      name: t.name,
      description: t.description || undefined,
    };
  }

  return {
    ...toolType,
    translations: translationsMap,
  };
}
