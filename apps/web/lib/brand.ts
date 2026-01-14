/**
 * @fileoverview Brand Context Utilities
 * @fileoverview 品牌上下文工具
 *
 * Provides functions to detect, store, and retrieve OEM brand context.
 * Brand detection is based on the software_id query parameter sent by
 * desktop software when embedding the web app.
 * 提供检测、存储和获取OEM品牌上下文的函数。
 * 品牌检测基于桌面软件嵌入Web应用时发送的software_id查询参数。
 *
 * @module apps/web/lib/brand
 */

import { cookies } from 'next/headers';
import { db, oemSoftwareBrands, eq } from '@magiworld/db';
import { getBrandPalette, getThemeClass, type BrandPalette } from './brand-palettes';

/**
 * Brand context stored in cookie.
 */
export type BrandContext = {
  id: string;
  slug: string;
  softwareId: string;
  themeConfig: {
    palette?: string;
    logo?: string;
    brandName?: string;
  };
  allowedToolTypeIds: string[];
};

const BRAND_COOKIE_NAME = 'oem_brand';
const BRAND_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

/**
 * Get a brand by its software ID from the database.
 * Used by middleware for initial brand detection.
 */
export async function getBrandBySoftwareId(softwareId: string): Promise<BrandContext | null> {
  const [brand] = await db
    .select()
    .from(oemSoftwareBrands)
    .where(eq(oemSoftwareBrands.softwareId, softwareId))
    .limit(1);

  if (!brand || !brand.isActive) {
    return null;
  }

  return {
    id: brand.id,
    slug: brand.slug,
    softwareId: brand.softwareId,
    themeConfig: (brand.themeConfig as BrandContext['themeConfig']) || {},
    allowedToolTypeIds: (brand.allowedToolTypeIds as string[]) || [],
  };
}

/**
 * Get the current brand context from cookies.
 * Returns null if no brand is set or cookie is invalid.
 *
 * @example
 * ```tsx
 * // In a Server Component
 * const brand = await getCurrentBrand();
 * if (brand) {
 *   // User is visiting from OEM software
 *   console.log('Brand:', brand.themeConfig.brandName);
 * }
 * ```
 */
export async function getCurrentBrand(): Promise<BrandContext | null> {
  const cookieStore = await cookies();
  const brandCookie = cookieStore.get(BRAND_COOKIE_NAME);

  if (!brandCookie?.value) {
    return null;
  }

  try {
    return JSON.parse(brandCookie.value) as BrandContext;
  } catch {
    return null;
  }
}

/**
 * Set the brand context in cookies.
 * Called by middleware when software_id is detected.
 */
export async function setBrandCookie(brand: BrandContext): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(BRAND_COOKIE_NAME, JSON.stringify(brand), {
    maxAge: BRAND_COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

/**
 * Clear the brand context cookie.
 * Used when user explicitly wants to reset brand context.
 */
export async function clearBrandCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(BRAND_COOKIE_NAME);
}

/**
 * Get the brand palette for the current brand.
 * Returns the default blue palette if no brand is set.
 */
export async function getCurrentBrandPalette(): Promise<BrandPalette> {
  const brand = await getCurrentBrand();
  return getBrandPalette(brand?.themeConfig?.palette);
}

/**
 * Get the theme class for the current brand.
 * Used to apply brand-specific theming to the HTML element.
 *
 * @param isDark - Whether dark mode is enabled
 * @returns Theme class name (e.g., 'blue', 'blue-dark')
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * const themeClass = await getCurrentBrandThemeClass(isDarkMode);
 * // Apply to <html className={themeClass}>
 * ```
 */
export async function getCurrentBrandThemeClass(isDark: boolean = false): Promise<string> {
  const brand = await getCurrentBrand();
  return getThemeClass(brand?.themeConfig?.palette, isDark);
}

/**
 * Check if a tool type is allowed for the current brand.
 * Returns true if no brand is set or brand allows all tool types.
 */
export async function isToolTypeAllowed(toolTypeId: string): Promise<boolean> {
  const brand = await getCurrentBrand();

  // No brand restriction
  if (!brand) return true;

  // Empty array means all tool types are allowed
  if (brand.allowedToolTypeIds.length === 0) return true;

  return brand.allowedToolTypeIds.includes(toolTypeId);
}
