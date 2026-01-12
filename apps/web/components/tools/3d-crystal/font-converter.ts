'use client';

import opentype from 'opentype.js';

/**
 * Convert TTF/OTF font file to Three.js JSON format
 * Supports Chinese characters and other Unicode glyphs
 */

interface ThreeJSFontGlyph {
  ha: number; // horizontal advance
  x_min: number;
  x_max: number;
  o: string; // path commands as string
}

interface ThreeJSFont {
  glyphs: Record<string, ThreeJSFontGlyph>;
  familyName: string;
  ascender: number;
  descender: number;
  underlinePosition: number;
  underlineThickness: number;
  boundingBox: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  };
  resolution: number;
  original_font_information: {
    format: number;
    copyright: string;
    fontFamily: string;
    fontSubfamily: string;
    uniqueID: string;
    fullName: string;
    version: string;
    postScriptName: string;
    trademark: string;
    manufacturer: string;
  };
}

/**
 * Convert a path command from opentype.js format to Three.js format
 */
function convertPathCommands(path: opentype.Path): string {
  const commands: string[] = [];

  for (const cmd of path.commands) {
    switch (cmd.type) {
      case 'M':
        commands.push(`m ${cmd.x} ${cmd.y}`);
        break;
      case 'L':
        commands.push(`l ${cmd.x} ${cmd.y}`);
        break;
      case 'C':
        commands.push(`b ${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`);
        break;
      case 'Q':
        commands.push(`q ${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`);
        break;
      case 'Z':
        commands.push('z');
        break;
    }
  }

  return commands.join(' ');
}

/**
 * Convert TTF/OTF font to Three.js JSON format
 * @param fontBuffer - ArrayBuffer containing the font file data
 * @param charactersToInclude - Optional string of characters to include (for CJK fonts, specify needed characters to reduce size)
 * @returns Three.js compatible font JSON
 */
export async function convertTTFToThreeJS(
  fontBuffer: ArrayBuffer,
  charactersToInclude?: string
): Promise<ThreeJSFont> {
  const font = opentype.parse(fontBuffer);

  if (!font) {
    throw new Error('Failed to parse font file');
  }

  const scale = 1000 / font.unitsPerEm;
  const glyphs: Record<string, ThreeJSFontGlyph> = {};

  // Default characters to include (ASCII + common punctuation)
  const defaultChars = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~';

  // Combine default chars with user-specified characters
  const allChars = charactersToInclude
    ? defaultChars + charactersToInclude
    : defaultChars;

  // Remove duplicates
  const uniqueChars = [...new Set(allChars)].join('');

  for (const char of uniqueChars) {
    const glyph = font.charToGlyph(char);
    if (!glyph || glyph.index === 0) continue; // Skip undefined glyphs

    const path = glyph.getPath(0, 0, font.unitsPerEm);
    const bbox = glyph.getBoundingBox();

    glyphs[char] = {
      ha: Math.round((glyph.advanceWidth || 0) * scale),
      x_min: Math.round(bbox.x1 * scale),
      x_max: Math.round(bbox.x2 * scale),
      o: convertPathCommands(path),
    };
  }

  const fontInfo: ThreeJSFont = {
    glyphs,
    familyName: font.names.fontFamily?.en || 'Unknown',
    ascender: Math.round(font.ascender * scale),
    descender: Math.round(font.descender * scale),
    underlinePosition: Math.round((font.tables.post?.underlinePosition || -100) * scale),
    underlineThickness: Math.round((font.tables.post?.underlineThickness || 50) * scale),
    boundingBox: {
      xMin: Math.round(font.tables.head.xMin * scale),
      xMax: Math.round(font.tables.head.xMax * scale),
      yMin: Math.round(font.tables.head.yMin * scale),
      yMax: Math.round(font.tables.head.yMax * scale),
    },
    resolution: 1000,
    original_font_information: {
      format: 0,
      copyright: font.names.copyright?.en || '',
      fontFamily: font.names.fontFamily?.en || '',
      fontSubfamily: font.names.fontSubfamily?.en || '',
      uniqueID: '',
      fullName: font.names.fullName?.en || '',
      version: font.names.version?.en || '',
      postScriptName: font.names.postScriptName?.en || '',
      trademark: font.names.trademark?.en || '',
      manufacturer: font.names.manufacturer?.en || '',
    },
  };

  return fontInfo;
}

/**
 * Load a TTF/OTF font file and convert to Three.js format
 * @param fontUrl - URL to the font file
 * @param charactersToInclude - Optional string of characters to include
 * @returns Three.js compatible font JSON
 */
export async function loadAndConvertFont(
  fontUrl: string,
  charactersToInclude?: string
): Promise<ThreeJSFont> {
  const response = await fetch(fontUrl);
  if (!response.ok) {
    throw new Error(`Failed to load font: ${response.statusText}`);
  }

  const fontBuffer = await response.arrayBuffer();
  return convertTTFToThreeJS(fontBuffer, charactersToInclude);
}

/**
 * Convert a File object (from file input) to Three.js font format
 * @param file - Font file (TTF/OTF)
 * @param charactersToInclude - Optional string of characters to include
 * @returns Three.js compatible font JSON
 */
export async function convertFontFile(
  file: File,
  charactersToInclude?: string
): Promise<ThreeJSFont> {
  const fontBuffer = await file.arrayBuffer();
  return convertTTFToThreeJS(fontBuffer, charactersToInclude);
}
