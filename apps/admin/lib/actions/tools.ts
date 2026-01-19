/**
 * @fileoverview Tool Management Server Actions
 * @fileoverview 工具管理服务端操作
 *
 * Server actions for CRUD operations on AI tools with multi-locale support.
 * 用于AI工具CRUD操作的服务端函数，支持多语言翻译（英文/中文/日文/葡萄牙文）。
 *
 * @module lib/actions/tools
 */

'use server';

import { db, tools, toolTranslations, toolTypes, toolTypeTranslations, media, providers, eq, asc, and, isNull } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Price configuration structure / 价格配置结构
 *
 * Flexible pricing for different billing models.
 * 灵活的价格配置，支持不同的计费模式。
 */
export type PriceConfig = {
  type: 'token' | 'request' | 'image' | 'second';
  input_per_1k?: number;      // For token billing
  output_per_1k?: number;     // For token billing
  cost_per_call?: number;     // For request billing
  cost_per_image?: number;    // For image billing
  cost_per_second?: number;   // For second billing
};

/**
 * Tool form data structure / 工具表单数据结构
 *
 * Contains tool configuration and multi-locale translations.
 * Provider/model selection is handled by tool processors in worker code.
 * 包含工具配置和多语言翻译。
 * Provider/模型选择由worker代码中的工具处理器处理。
 *
 * @property slug - URL-friendly identifier / URL友好的标识符
 * @property toolTypeId - Parent tool type ID / 父工具类型ID
 * @property priceConfig - Pricing configuration / 价格配置
 * @property thumbnailUrl - Tool thumbnail image URL / 工具缩略图URL
 * @property configJson - Tool-specific configuration (UI options, processing hints) / 工具特定配置
 * @property isActive - Whether tool is enabled / 工具是否启用
 * @property isFeatured - Whether tool is featured / 工具是否推荐
 * @property order - Display order / 显示顺序
 * @property translations - Multi-locale content / 多语言内容
 */
export type ToolFormData = {
  slug: string;
  toolTypeId: string;
  priceConfig?: PriceConfig;
  thumbnailUrl?: string;
  configJson?: Record<string, unknown>;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  translations: {
    en: { title: string; description?: string };
    zh: { title: string; description?: string };
    ja: { title: string; description?: string };
    pt: { title: string; description?: string };
  };
};

/**
 * Create a new tool with translations / 创建新工具及其翻译
 *
 * Inserts tool record and all locale translations (en/zh/ja/pt).
 * 插入工具记录和所有语言翻译（英文/中文/日文/葡萄牙文）。
 *
 * @param data - Tool form data / 工具表单数据
 * @throws Database error on constraint violation / 约束冲突时抛出数据库错误
 */
export async function createTool(data: ToolFormData) {
  const [tool] = await db
    .insert(tools)
    .values({
      slug: data.slug,
      toolTypeId: data.toolTypeId,
      priceConfig: data.priceConfig || null,
      thumbnailUrl: data.thumbnailUrl || null,
      configJson: data.configJson || null,
      isActive: data.isActive,
      isFeatured: data.isFeatured,
      order: data.order,
    })
    .returning();

  // Insert translations
  const locales = ['en', 'zh', 'ja', 'pt'] as const;
  for (const locale of locales) {
    const translation = data.translations[locale];
    await db.insert(toolTranslations).values({
      toolId: tool.id,
      locale,
      title: translation.title,
      description: translation.description || null,
    });
  }

  revalidatePath('/tools');
  redirect('/tools');
}

/**
 * Update an existing tool / 更新现有工具
 *
 * Updates tool properties and upserts translations for all locales.
 * 更新工具属性并为所有语言更新或插入翻译。
 *
 * @param id - Tool UUID / 工具UUID
 * @param data - Updated tool form data / 更新后的工具表单数据
 */
export async function updateTool(id: string, data: ToolFormData) {
  await db
    .update(tools)
    .set({
      slug: data.slug,
      toolTypeId: data.toolTypeId,
      priceConfig: data.priceConfig || null,
      thumbnailUrl: data.thumbnailUrl || null,
      configJson: data.configJson || null,
      isActive: data.isActive,
      isFeatured: data.isFeatured,
      order: data.order,
      updatedAt: new Date(),
    })
    .where(eq(tools.id, id));

  // Update translations
  const locales = ['en', 'zh', 'ja', 'pt'] as const;
  for (const locale of locales) {
    const translation = data.translations[locale];

    // Check if translation exists for this specific locale
    const existing = await db
      .select()
      .from(toolTranslations)
      .where(and(
        eq(toolTranslations.toolId, id),
        eq(toolTranslations.locale, locale)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(toolTranslations)
        .set({
          title: translation.title,
          description: translation.description || null,
        })
        .where(and(
          eq(toolTranslations.toolId, id),
          eq(toolTranslations.locale, locale)
        ));
    } else {
      await db.insert(toolTranslations).values({
        toolId: id,
        locale,
        title: translation.title,
        description: translation.description || null,
      });
    }
  }

  revalidatePath('/tools');
  redirect('/tools');
}

/**
 * Soft delete a tool / 软删除工具
 *
 * Sets deletedAt timestamp without removing the record.
 * Tool data and associated CDN images are preserved for potential recovery.
 * 设置deletedAt时间戳，不删除记录。工具数据和关联的CDN图片保留以便恢复。
 *
 * @param id - Tool UUID / 工具UUID
 */
export async function deleteTool(id: string) {
  await db
    .update(tools)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(tools.id, id));
  revalidatePath('/tools');
  redirect('/tools');
}

/**
 * Restore a soft-deleted tool / 恢复软删除的工具
 *
 * Clears deletedAt timestamp to make tool active again.
 * 清除deletedAt时间戳使工具重新激活。
 *
 * @param id - Tool UUID / 工具UUID
 */
export async function restoreTool(id: string) {
  await db
    .update(tools)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(eq(tools.id, id));
  revalidatePath('/tools');
}

/**
 * Toggle tool active status / 切换工具激活状态
 *
 * Enables or disables a tool without deletion.
 * 启用或禁用工具，不删除。
 *
 * @param id - Tool UUID / 工具UUID
 * @param isActive - New active status / 新的激活状态
 */
export async function toggleToolActive(id: string, isActive: boolean) {
  await db
    .update(tools)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(tools.id, id));
  revalidatePath('/tools');
}

/**
 * Get tool by ID with translations / 按ID获取工具及翻译
 *
 * Fetches tool record and all associated translations.
 * 获取工具记录和所有关联的翻译。
 *
 * @param id - Tool UUID / 工具UUID
 * @returns Tool with translations map, or null if not found / 带翻译的工具，未找到返回null
 */
export async function getToolById(id: string) {
  const [tool] = await db
    .select()
    .from(tools)
    .where(eq(tools.id, id))
    .limit(1);

  if (!tool) return null;

  const translations = await db
    .select()
    .from(toolTranslations)
    .where(eq(toolTranslations.toolId, id));

  const translationsMap: Record<string, { title: string; description?: string }> = {};
  for (const t of translations) {
    translationsMap[t.locale] = {
      title: t.title,
      description: t.description || undefined,
    };
  }

  return {
    ...tool,
    translations: translationsMap,
  };
}

/**
 * Get tool types for select dropdown / 获取工具类型下拉选项
 *
 * Returns tool types with English names for form select components.
 * 返回带英文名称的工具类型，用于表单选择组件。
 *
 * @returns Array of {id, slug, name} / {id, slug, name}数组
 */
export async function getToolTypesForSelect() {
  const result = await db
    .select({
      id: toolTypes.id,
      slug: toolTypes.slug,
      name: toolTypeTranslations.name,
    })
    .from(toolTypes)
    .innerJoin(
      toolTypeTranslations,
      and(
        eq(toolTypeTranslations.toolTypeId, toolTypes.id),
        eq(toolTypeTranslations.locale, 'en')
      )
    )
    .orderBy(asc(toolTypes.order));

  return result;
}

/**
 * Get media files for select dropdown / 获取媒体文件下拉选项
 *
 * Returns non-deleted media files for image picker components.
 * 返回未删除的媒体文件，用于图片选择组件。
 *
 * @returns Array of {id, filename, url, mimeType} / {id, filename, url, mimeType}数组
 */
export async function getMediaForSelect() {
  const result = await db
    .select({
      id: media.id,
      filename: media.filename,
      url: media.url,
      mimeType: media.mimeType,
    })
    .from(media)
    .where(isNull(media.deletedAt))
    .orderBy(asc(media.filename));

  return result;
}

/**
 * Get providers for select dropdown / 获取提供商下拉选项
 *
 * Returns active providers for form select components.
 * 返回活跃的提供商，用于表单选择组件。
 *
 * @returns Array of {id, slug, name} / {id, slug, name}数组
 */
export async function getProvidersForSelect() {
  const result = await db
    .select({
      id: providers.id,
      slug: providers.slug,
      name: providers.name,
    })
    .from(providers)
    .where(eq(providers.isActive, true))
    .orderBy(asc(providers.name));

  return result;
}
