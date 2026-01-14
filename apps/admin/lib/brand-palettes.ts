/**
 * @fileoverview Brand Color Palettes
 * @fileoverview 品牌颜色调色板
 *
 * Predefined color palettes for OEM software brands that map to
 * the existing CSS theme classes in apps/web/globals.css.
 * 为OEM软件品牌预定义的颜色调色板，映射到apps/web/globals.css中的CSS主题类。
 *
 * Each palette key corresponds to a CSS theme class (e.g., 'blue' -> '.blue').
 * The theme class is applied to <html> element to change the color scheme.
 * 每个调色板键对应一个CSS主题类（例如'blue' -> '.blue'）。
 * 主题类应用于<html>元素以更改配色方案。
 *
 * @module lib/brand-palettes
 */

/**
 * Brand palette configuration type / 品牌调色板配置类型
 *
 * @property name - Palette display name / 调色板显示名称
 * @property themeClass - CSS theme class to apply / 要应用的CSS主题类
 * @property previewColor - Preview color for admin UI / 管理后台UI的预览颜色
 */
export type BrandPalette = {
  name: string;
  themeClass: string;
  previewColor: string;
};

/**
 * Available brand color palettes / 可用的品牌颜色调色板
 *
 * Keys match the CSS theme classes defined in apps/web/globals.css.
 * 键匹配apps/web/globals.css中定义的CSS主题类。
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
 * Get a brand palette by key / 按键获取品牌调色板
 *
 * Falls back to 'neutral' if not found.
 * 未找到则回退到'neutral'。
 *
 * @param paletteKey - The palette key to look up / 要查找的调色板键
 * @returns The brand palette configuration / 品牌调色板配置
 */
export function getBrandPalette(paletteKey: string | undefined): BrandPalette {
  return brandPalettes[paletteKey || 'neutral'] || brandPalettes.neutral;
}
