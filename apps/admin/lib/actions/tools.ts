'use server';

import { db, tools, toolTranslations, toolTypes } from '@magiworld/db';
import { eq, asc, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ToolFormData = {
  slug: string;
  toolTypeId: string;
  thumbnailUrl?: string;
  promptTemplate?: string;
  configJson?: Record<string, unknown>;
  aiEndpoint?: string;
  isActive: boolean;
  isFeatured: boolean;
  order: number;
  translations: {
    en: { title: string; description?: string; promptTemplate?: string };
    zh: { title: string; description?: string; promptTemplate?: string };
    ja: { title: string; description?: string; promptTemplate?: string };
    pt: { title: string; description?: string; promptTemplate?: string };
  };
};

export async function createTool(data: ToolFormData) {
  const [tool] = await db
    .insert(tools)
    .values({
      slug: data.slug,
      toolTypeId: data.toolTypeId,
      thumbnailUrl: data.thumbnailUrl || null,
      promptTemplate: data.promptTemplate || null,
      configJson: data.configJson || null,
      aiEndpoint: data.aiEndpoint || null,
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
      promptTemplate: translation.promptTemplate || null,
    });
  }

  revalidatePath('/tools');
  redirect('/tools');
}

export async function updateTool(id: string, data: ToolFormData) {
  await db
    .update(tools)
    .set({
      slug: data.slug,
      toolTypeId: data.toolTypeId,
      thumbnailUrl: data.thumbnailUrl || null,
      promptTemplate: data.promptTemplate || null,
      configJson: data.configJson || null,
      aiEndpoint: data.aiEndpoint || null,
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
          promptTemplate: translation.promptTemplate || null,
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
        promptTemplate: translation.promptTemplate || null,
      });
    }
  }

  revalidatePath('/tools');
  redirect('/tools');
}

/**
 * Soft delete a tool by setting isActive to false
 * The tool record and associated CDN images are preserved.
 */
export async function deleteTool(id: string) {
  await db
    .update(tools)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(tools.id, id));
  revalidatePath('/tools');
  redirect('/tools');
}

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

  const translationsMap: Record<string, { title: string; description?: string; promptTemplate?: string }> = {};
  for (const t of translations) {
    translationsMap[t.locale] = {
      title: t.title,
      description: t.description || undefined,
      promptTemplate: t.promptTemplate || undefined,
    };
  }

  return {
    ...tool,
    translations: translationsMap,
  };
}

export async function getToolTypesForSelect() {
  const { toolTypeTranslations } = await import('@magiworld/db');
  const { and } = await import('drizzle-orm');

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

export async function getMediaForSelect() {
  const { media } = await import('@magiworld/db');
  const { isNull } = await import('drizzle-orm');
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
