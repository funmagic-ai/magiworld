/**
 * @fileoverview Brand Color Palettes
 *
 * Predefined color palettes for OEM software brands that map to
 * the existing CSS theme classes in apps/web/globals.css.
 *
 * Each palette key corresponds to a CSS theme class (e.g., 'blue' -> '.blue').
 * The theme class is applied to <html> element to change the color scheme.
 *
 * @module lib/brand-palettes
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
 * Keys match the CSS theme classes defined in apps/web/globals.css.
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
