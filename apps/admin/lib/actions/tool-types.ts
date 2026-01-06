'use server';

import { db, toolTypes, toolTypeTranslations, eq, and } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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

export async function deleteToolType(id: string) {
  await db.delete(toolTypes).where(eq(toolTypes.id, id));
  revalidatePath('/tool-types');
  redirect('/tool-types');
}

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
