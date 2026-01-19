export type BrandPalette = {
  name: string;
  themeClass: string;
  previewColor: string;
};

export const brandPalettes: Record<string, BrandPalette> = {
  neutral: {
    name: 'Neutral',
    themeClass: 'neutral',
    previewColor: '#1a1a1a',
  },
  green: {
    name: 'Green',
    themeClass: 'green',
    previewColor: '#22c55e',
  },
  blue: {
    name: 'Blue',
    themeClass: 'blue',
    previewColor: '#3b82f6',
  },
  purple: {
    name: 'Purple',
    themeClass: 'purple',
    previewColor: '#a855f7',
  },
  orange: {
    name: 'Orange',
    themeClass: 'orange',
    previewColor: '#f97316',
  },
};

export function getBrandPalette(paletteKey: string | undefined): BrandPalette {
  return brandPalettes[paletteKey || 'neutral'] || brandPalettes.neutral;
}

export function getThemeClass(paletteKey: string | undefined, isDark: boolean = false): string {
  const palette = getBrandPalette(paletteKey);
  return isDark ? `${palette.themeClass}-dark` : palette.themeClass;
}
