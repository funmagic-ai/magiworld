/**
 * @fileoverview Data Access Layer
 *
 * This module provides data fetching functions for the Magiworld web application.
 * All functions support internationalization (i18n) by accepting a locale parameter
 * and returning localized content from the database.
 *
 * The data layer handles:
 * - Joining base tables with their translation tables
 * - Filtering by locale and active status
 * - Transforming database results to application types
 *
 * @module apps/web/lib/data
 */

import {
  db,
  tools,
  toolTypes,
  toolTypeTranslations,
  toolTranslations,
  categories,
  categoryTranslations,
  homeBanners,
  homeBannerTranslations,
  media,
} from '@magiworld/db';
import { eq, and, asc } from 'drizzle-orm';
import type { ToolListItem } from '@magiworld/types';

// ============================================
// Type Definitions
// ============================================

/**
 * Supported locale codes for the platform.
 * Maps to the locale enum in the database schema.
 */
export type Locale = 'en' | 'ja' | 'pt' | 'zh';

/**
 * Homepage banner configuration result.
 * Contains both main carousel banners and sidebar banners.
 */
interface HomeBannerResult {
  /** Main carousel banners (typically up to 3) */
  mainBanners: Array<{
    /** Unique banner identifier */
    id: string;
    /** Localized banner title */
    title: string;
    /** Localized banner subtitle (optional) */
    subtitle?: string;
    /** Banner image with ID and URL */
    image?: { id: string; url: string };
    /** Linked tool for click-through navigation */
    link?: { slug: string; toolTypeSlug: string };
  }>;
  /** Sidebar banners (typically exactly 2) */
  sideBanners: Array<{
    /** Unique banner identifier */
    id: string;
    /** Localized banner title */
    title: string;
    /** Banner image with ID and URL */
    image?: { id: string; url: string };
    /** Linked tool for click-through navigation */
    link?: { slug: string; toolTypeSlug: string };
  }>;
}

// ============================================
// Tool Data Functions
// ============================================

/**
 * Fetch all active tools with localized content.
 *
 * Returns a list of tools suitable for displaying in tool listing pages.
 * Tools are ordered by their display order and filtered to show only active tools.
 *
 * @param locale - The locale code for content translation (default: 'en')
 * @param limit - Maximum number of tools to return (default: 100)
 * @returns Promise resolving to an array of ToolListItem objects
 *
 * @example
 * ```typescript
 * // Get first 10 tools in Japanese
 * const tools = await getTools('ja', 10);
 *
 * // Get all tools in English (default)
 * const allTools = await getTools();
 * ```
 */
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
    .where(eq(tools.isActive, true))
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

/**
 * Fetch featured tools for homepage display.
 *
 * Returns tools that are marked as both active and featured.
 * Featured tools appear in the homepage hero section.
 *
 * @param locale - The locale code for content translation (default: 'en')
 * @returns Promise resolving to an array of featured ToolListItem objects
 *
 * @example
 * ```typescript
 * // Get featured tools for Portuguese locale
 * const featured = await getFeaturedTools('pt');
 * ```
 */
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
    .where(and(eq(tools.isActive, true), eq(tools.isFeatured, true)))
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

/**
 * Fetch a single tool by its URL slug.
 *
 * Returns detailed tool information including configuration and prompt template.
 * Used for tool detail pages and the tool execution interface.
 *
 * @param slug - The URL-friendly tool identifier
 * @param locale - The locale code for content translation (default: 'en')
 * @returns Promise resolving to the tool object, or null if not found
 *
 * @example
 * ```typescript
 * // Get anime style tool in Chinese
 * const tool = await getToolBySlug('anime-style', 'zh');
 * if (tool) {
 *   console.log(tool.title, tool.description);
 * }
 * ```
 */
export async function getToolBySlug(slug: string, locale: Locale = 'en') {
  const result = await db
    .select({
      id: tools.id,
      slug: tools.slug,
      thumbnailUrl: tools.thumbnailUrl,
      configJson: tools.configJson,
      aiEndpoint: tools.aiEndpoint,
      updatedAt: tools.updatedAt,
      toolTypeSlug: toolTypes.slug,
      toolTypeBadgeColor: toolTypes.badgeColor,
      toolTypeComponentKey: toolTypes.componentKey,
      toolTypeName: toolTypeTranslations.name,
      title: toolTranslations.title,
      description: toolTranslations.description,
      promptTemplate: toolTranslations.promptTemplate,
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
    .where(eq(tools.slug, slug))
    .limit(1);

  if (result.length === 0) return null;

  const row = result[0];
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    promptTemplate: row.promptTemplate,
    configJson: row.configJson,
    aiEndpoint: row.aiEndpoint,
    thumbnail: row.thumbnailUrl ? { id: '', url: row.thumbnailUrl } : undefined,
    toolType: {
      slug: row.toolTypeSlug,
      name: row.toolTypeName,
      badgeColor: row.toolTypeBadgeColor,
      componentKey: row.toolTypeComponentKey,
    },
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ============================================
// Homepage Configuration Functions
// ============================================

/**
 * Fetch homepage banner configuration.
 *
 * Returns both main carousel banners and sidebar banners with localized content.
 * Banners are filtered by active status and ordered by display order.
 *
 * @param locale - The locale code for content translation (default: 'en')
 * @returns Promise resolving to HomeBannerResult with main and side banners
 *
 * @example
 * ```typescript
 * const { mainBanners, sideBanners } = await getHomeConfig('ja');
 * // mainBanners: Array of up to 3 carousel banners
 * // sideBanners: Array of exactly 2 sidebar banners
 * ```
 */
export async function getHomeConfig(locale: Locale = 'en'): Promise<HomeBannerResult> {
  const result = await db
    .select({
      id: homeBanners.id,
      type: homeBanners.type,
      mediaUrl: media.url,
      mediaId: media.id,
      toolSlug: tools.slug,
      toolTypeSlug: toolTypes.slug,
      title: homeBannerTranslations.title,
      subtitle: homeBannerTranslations.subtitle,
    })
    .from(homeBanners)
    .leftJoin(media, eq(homeBanners.mediaId, media.id))
    .leftJoin(tools, eq(homeBanners.toolId, tools.id))
    .leftJoin(toolTypes, eq(tools.toolTypeId, toolTypes.id))
    .innerJoin(
      homeBannerTranslations,
      and(eq(homeBannerTranslations.bannerId, homeBanners.id), eq(homeBannerTranslations.locale, locale))
    )
    .where(eq(homeBanners.isActive, true))
    .orderBy(asc(homeBanners.order));

  const mainBanners = result
    .filter((row) => row.type === 'main')
    .map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: row.subtitle ?? undefined,
      image: row.mediaUrl ? { id: row.mediaId!, url: row.mediaUrl } : undefined,
      link: row.toolSlug && row.toolTypeSlug ? { slug: row.toolSlug, toolTypeSlug: row.toolTypeSlug } : undefined,
    }));

  const sideBanners = result
    .filter((row) => row.type === 'side')
    .map((row) => ({
      id: row.id,
      title: row.title,
      image: row.mediaUrl ? { id: row.mediaId!, url: row.mediaUrl } : undefined,
      link: row.toolSlug && row.toolTypeSlug ? { slug: row.toolSlug, toolTypeSlug: row.toolTypeSlug } : undefined,
    }));

  return { mainBanners, sideBanners };
}

// ============================================
// Category and Tool Type Functions
// ============================================

/**
 * Fetch all categories with localized names.
 *
 * Categories are used for organizing tools into logical groups.
 * Returns categories ordered by display order.
 *
 * @param locale - The locale code for content translation (default: 'en')
 * @returns Promise resolving to an array of category objects
 *
 * @example
 * ```typescript
 * const categories = await getCategories('en');
 * // [{ id: '...', slug: 'creative', icon: 'palette', name: 'Creative' }, ...]
 * ```
 */
export async function getCategories(locale: Locale = 'en') {
  const result = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      icon: categories.icon,
      name: categoryTranslations.name,
    })
    .from(categories)
    .innerJoin(
      categoryTranslations,
      and(eq(categoryTranslations.categoryId, categories.id), eq(categoryTranslations.locale, locale))
    )
    .orderBy(asc(categories.order));

  return result;
}

/**
 * Fetch all active tool types with localized content.
 *
 * Tool types define the classification of tools (e.g., stylize, edit, 3d_gen).
 * Each tool type maps to a specific React component for the tool interface.
 *
 * @param locale - The locale code for content translation (default: 'en')
 * @returns Promise resolving to an array of tool type objects
 *
 * @example
 * ```typescript
 * const toolTypes = await getToolTypes('ja');
 * // [{ id: '...', slug: 'stylize', name: 'スタイライズ', componentKey: 'StylizeInterface' }, ...]
 * ```
 */
export async function getToolTypes(locale: Locale = 'en') {
  const result = await db
    .select({
      id: toolTypes.id,
      slug: toolTypes.slug,
      badgeColor: toolTypes.badgeColor,
      componentKey: toolTypes.componentKey,
      icon: toolTypes.icon,
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
