import {
  db,
  tools,
  toolTypes,
  toolTypeTranslations,
  toolTranslations,
  homeBanners,
  homeBannerTranslations,
} from '@magiworld/db';
import { eq, and, asc, desc, isNull } from 'drizzle-orm';
import type { ToolListItem } from '@magiworld/types';

export type Locale = 'en' | 'ja' | 'pt' | 'zh';

const MAX_MAIN_BANNERS = 3;
const MAX_SIDE_BANNERS = 2;

interface HomeBannerResult {
  mainBanners: Array<{
    id: string;
    title: string;
    subtitle?: string;
    image?: string;
    link?: string;
  }>;
  sideBanners: Array<{
    id: string;
    title: string;
    image?: string;
    link?: string;
  }>;
}

export async function getTools(locale: Locale = 'en', limit?: number): Promise<ToolListItem[]> {
  const result = await db
    .select({
      id: tools.id,
      slug: tools.slug,
      thumbnailUrl: tools.thumbnailUrl,
      updatedAt: tools.updatedAt,
      toolTypeSlug: toolTypes.slug,
      toolTypeBadgeColor: toolTypes.badgeColor,
      toolTypeName: toolTypeTranslations.name,
      title: toolTranslations.title,
    })
    .from(tools)
    .innerJoin(toolTypes, eq(tools.toolTypeId, toolTypes.id))
    .innerJoin(
      toolTypeTranslations,
      and(eq(toolTypeTranslations.toolTypeId, toolTypes.id), eq(toolTypeTranslations.locale, locale))
    )
    .innerJoin(
      toolTranslations,
      and(eq(toolTranslations.toolId, tools.id), eq(toolTranslations.locale, locale))
    )
    .where(and(eq(tools.isActive, true), isNull(tools.deletedAt)))
    .orderBy(asc(tools.order))
    .limit(limit ?? 100);

  return result.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    thumbnail: row.thumbnailUrl ? { id: '', url: row.thumbnailUrl } : undefined,
    toolType: {
      slug: row.toolTypeSlug,
      name: row.toolTypeName,
      badgeColor: row.toolTypeBadgeColor,
    },
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getFeaturedTools(locale: Locale = 'en'): Promise<ToolListItem[]> {
  const result = await db
    .select({
      id: tools.id,
      slug: tools.slug,
      thumbnailUrl: tools.thumbnailUrl,
      updatedAt: tools.updatedAt,
      toolTypeSlug: toolTypes.slug,
      toolTypeBadgeColor: toolTypes.badgeColor,
      toolTypeName: toolTypeTranslations.name,
      title: toolTranslations.title,
    })
    .from(tools)
    .innerJoin(toolTypes, eq(tools.toolTypeId, toolTypes.id))
    .innerJoin(
      toolTypeTranslations,
      and(eq(toolTypeTranslations.toolTypeId, toolTypes.id), eq(toolTypeTranslations.locale, locale))
    )
    .innerJoin(
      toolTranslations,
      and(eq(toolTranslations.toolId, tools.id), eq(toolTranslations.locale, locale))
    )
    .where(and(eq(tools.isActive, true), eq(tools.isFeatured, true), isNull(tools.deletedAt)))
    .orderBy(asc(tools.order));

  return result.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    thumbnail: row.thumbnailUrl ? { id: '', url: row.thumbnailUrl } : undefined,
    toolType: {
      slug: row.toolTypeSlug,
      name: row.toolTypeName,
      badgeColor: row.toolTypeBadgeColor,
    },
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getToolTypeBySlug(slug: string, locale: Locale = 'en') {
  const result = await db
    .select({
      id: toolTypes.id,
      slug: toolTypes.slug,
      badgeColor: toolTypes.badgeColor,
      name: toolTypeTranslations.name,
      description: toolTypeTranslations.description,
    })
    .from(toolTypes)
    .innerJoin(
      toolTypeTranslations,
      and(eq(toolTypeTranslations.toolTypeId, toolTypes.id), eq(toolTypeTranslations.locale, locale))
    )
    .where(and(eq(toolTypes.slug, slug), eq(toolTypes.isActive, true)))
    .limit(1);

  if (result.length === 0) return null;

  return result[0];
}

export async function getToolsByTypeSlug(toolTypeSlug: string, locale: Locale = 'en'): Promise<ToolListItem[]> {
  const result = await db
    .select({
      id: tools.id,
      slug: tools.slug,
      thumbnailUrl: tools.thumbnailUrl,
      updatedAt: tools.updatedAt,
      toolTypeSlug: toolTypes.slug,
      toolTypeBadgeColor: toolTypes.badgeColor,
      toolTypeName: toolTypeTranslations.name,
      title: toolTranslations.title,
    })
    .from(tools)
    .innerJoin(toolTypes, eq(tools.toolTypeId, toolTypes.id))
    .innerJoin(
      toolTypeTranslations,
      and(eq(toolTypeTranslations.toolTypeId, toolTypes.id), eq(toolTypeTranslations.locale, locale))
    )
    .innerJoin(
      toolTranslations,
      and(eq(toolTranslations.toolId, tools.id), eq(toolTranslations.locale, locale))
    )
    .where(and(eq(tools.isActive, true), eq(toolTypes.slug, toolTypeSlug), isNull(tools.deletedAt)))
    .orderBy(asc(tools.order));

  return result.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    thumbnail: row.thumbnailUrl ? { id: '', url: row.thumbnailUrl } : undefined,
    toolType: {
      slug: row.toolTypeSlug,
      name: row.toolTypeName,
      badgeColor: row.toolTypeBadgeColor,
    },
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function getToolBySlug(slug: string, locale: Locale = 'en') {
  const result = await db
    .select({
      id: tools.id,
      slug: tools.slug,
      thumbnailUrl: tools.thumbnailUrl,
      configJson: tools.configJson,
      updatedAt: tools.updatedAt,
      toolTypeSlug: toolTypes.slug,
      toolTypeBadgeColor: toolTypes.badgeColor,
      toolTypeName: toolTypeTranslations.name,
      title: toolTranslations.title,
      description: toolTranslations.description,
    })
    .from(tools)
    .innerJoin(toolTypes, eq(tools.toolTypeId, toolTypes.id))
    .innerJoin(
      toolTypeTranslations,
      and(eq(toolTypeTranslations.toolTypeId, toolTypes.id), eq(toolTypeTranslations.locale, locale))
    )
    .innerJoin(
      toolTranslations,
      and(eq(toolTranslations.toolId, tools.id), eq(toolTranslations.locale, locale))
    )
    .where(and(eq(tools.slug, slug), isNull(tools.deletedAt)))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    configJson: row.configJson,
    thumbnail: row.thumbnailUrl ? { id: '', url: row.thumbnailUrl } : undefined,
    toolType: {
      slug: row.toolTypeSlug,
      name: row.toolTypeName,
      badgeColor: row.toolTypeBadgeColor,
    },
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getHomeConfig(locale: Locale = 'en'): Promise<HomeBannerResult> {
  const result = await db
    .select({
      id: homeBanners.id,
      type: homeBanners.type,
      link: homeBanners.link,
      imageUrl: homeBanners.imageUrl,
      title: homeBannerTranslations.title,
      subtitle: homeBannerTranslations.subtitle,
    })
    .from(homeBanners)
    .innerJoin(
      homeBannerTranslations,
      and(eq(homeBannerTranslations.bannerId, homeBanners.id), eq(homeBannerTranslations.locale, locale))
    )
    .where(and(eq(homeBanners.isActive, true), isNull(homeBanners.deletedAt)))
    .orderBy(asc(homeBanners.order), desc(homeBanners.updatedAt));

  const mainBanners = result
    .filter((row) => row.type === 'main')
    .slice(0, MAX_MAIN_BANNERS)
    .map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      image: row.imageUrl ?? undefined,
      link: row.link ?? undefined,
    }));

  const sideBanners = result
    .filter((row) => row.type === 'side')
    .slice(0, MAX_SIDE_BANNERS)
    .map((row) => ({
      id: row.id,
      title: row.title,
      image: row.imageUrl ?? undefined,
      link: row.link ?? undefined,
    }));

  return { mainBanners, sideBanners };
}

export async function getToolTypes(locale: Locale = 'en') {
  const result = await db
    .select({
      id: toolTypes.id,
      slug: toolTypes.slug,
      badgeColor: toolTypes.badgeColor,
      name: toolTypeTranslations.name,
      description: toolTypeTranslations.description,
    })
    .from(toolTypes)
    .innerJoin(
      toolTypeTranslations,
      and(eq(toolTypeTranslations.toolTypeId, toolTypes.id), eq(toolTypeTranslations.locale, locale))
    )
    .where(eq(toolTypes.isActive, true))
    .orderBy(asc(toolTypes.order));

  return result;
}
