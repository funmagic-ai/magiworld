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
  homeBanners,
  homeBannerTranslations,
} from '@magiworld/db';
import { eq, and, asc, desc, isNull } from 'drizzle-orm';
import type { ToolListItem } from '@magiworld/types';

// ============================================
// Type Definitions
// ============================================

/**
 * Supported locale codes for the platform.
 * Maps to the locale enum in the database schema.
 */
export type Locale = 'en' | 'ja' | 'pt' | 'zh';

/** Maximum number of main carousel banners to display */
const MAX_MAIN_BANNERS = 3;
/** Maximum number of side banners to display */
const MAX_SIDE_BANNERS = 2;

/**
 * Homepage banner configuration result.
 * Contains both main carousel banners and sidebar banners.
 */
interface HomeBannerResult {
  /** Main carousel banners (max 3) */
  mainBanners: Array<{
    /** Unique banner identifier */
    id: string;
    /** Localized banner title */
    title: string;
    /** Localized banner subtitle (optional) */
    subtitle?: string;
    /** Banner image URL */
    image?: string;
    /** Click-through URL (can be absolute or relative path) */
    link?: string;
  }>;
  /** Sidebar banners (max 2) */
  sideBanners: Array<{
    /** Unique banner identifier */
    id: string;
    /** Localized banner title */
    title: string;
    /** Banner image URL */
    image?: string;
    /** Click-through URL (can be absolute or relative path) */
    link?: string;
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

/**
 * Fetch a single tool type by its URL slug.
 *
 * Returns tool type information with localized content.
 * Used for tool type listing pages.
 *
 * @param slug - The URL-friendly tool type identifier
 * @param locale - The locale code for content translation (default: 'en')
 * @returns Promise resolving to the tool type object, or null if not found
 */
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

/**
 * Fetch tools by tool type slug.
 *
 * Returns all active tools belonging to a specific tool type.
 * Used for tool type listing pages.
 *
 * @param toolTypeSlug - The URL-friendly tool type identifier
 * @param locale - The locale code for content translation (default: 'en')
 * @returns Promise resolving to an array of ToolListItem objects
 */
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
    .where(and(eq(tools.slug, slug), isNull(tools.deletedAt)))
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
 * Limited to MAX_MAIN_BANNERS (3) main banners and MAX_SIDE_BANNERS (2) side banners.
 *
 * @param locale - The locale code for content translation (default: 'en')
 * @returns Promise resolving to HomeBannerResult with main and side banners
 *
 * @example
 * ```typescript
 * const { mainBanners, sideBanners } = await getHomeConfig('ja');
 * // mainBanners: Array of up to 3 carousel banners
 * // sideBanners: Array of up to 2 sidebar banners
 * ```
 */
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

// ============================================
// Tool Type Functions
// ============================================

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
 * // [{ id: '...', slug: 'stylize', name: 'スタイライズ' }, ...]
 * ```
 */
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
