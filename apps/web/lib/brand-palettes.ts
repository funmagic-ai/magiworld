/**
 * @fileoverview Brand Color Palettes
 * @fileoverview 品牌颜色调色板
 *
 * Predefined color palettes for OEM software brands that map to
 * the existing CSS theme classes in globals.css.
 * OEM软件品牌的预定义颜色调色板，
 * 映射到globals.css中现有的CSS主题类。
 *
 * Each palette key corresponds to a CSS theme class (e.g., 'blue' -> '.blue').
 * The theme class is applied to <html> element to change the color scheme.
 * 每个调色板键对应一个CSS主题类（例如'blue' -> '.blue'）。
 * 主题类应用于<html>元素以改变配色方案。
 *
 * @module apps/web/lib/brand-palettes
 */

export type BrandPalette = {
  /** Palette display name */
  name: string;
  /** CSS theme class to apply (matches globals.css themes) */
  themeClass: string;
  /** Preview color for admin UI (matches the --primary in CSS) */
  previewColor: string;
};

/**
 * Available brand color palettes.
 * Keys match the CSS theme classes defined in globals.css.
 */
export const brandPalettes: Record<string, BrandPalette> = {
  neutral: {
    name: 'Neutral',
    themeClass: 'neutral',
    previewColor: '#1a1a1a', // oklch(0.205 0 0) approximated
  },
  green: {
    name: 'Green',
    themeClass: 'green',
    previewColor: '#22c55e', // oklch(0.7 0.2 145) approximated
  },
  blue: {
    name: 'Blue',
    themeClass: 'blue',
    previewColor: '#3b82f6', // oklch(0.6 0.19 250) approximated
  },
  purple: {
    name: 'Purple',
    themeClass: 'purple',
    previewColor: '#a855f7', // oklch(0.65 0.25 300) approximated
  },
  orange: {
    name: 'Orange',
    themeClass: 'orange',
    previewColor: '#f97316', // oklch(0.7 0.18 45) approximated
  },
};

/**
 * Get a brand palette by key.
 * Falls back to 'blue' if not found.
 */
export function getBrandPalette(paletteKey: string | undefined): BrandPalette {
  return brandPalettes[paletteKey || 'neutral'] || brandPalettes.neutral;
}

/**
 * Get the theme class name for a brand.
 * Used to set the theme on the HTML element.
 *
 * @example
 * ```tsx
 * // In layout or root component
 * const brand = await getCurrentBrand();
 * const themeClass = getThemeClass(brand?.themeConfig?.palette, isDark);
 * // Returns 'blue' or 'blue-dark'
 * ```
 */
export function getThemeClass(paletteKey: string | undefined, isDark: boolean = false): string {
  const palette = getBrandPalette(paletteKey);
  return isDark ? `${palette.themeClass}-dark` : palette.themeClass;
}
