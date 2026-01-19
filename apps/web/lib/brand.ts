import { cookies } from 'next/headers';
import { db, oemSoftwareBrands, eq } from '@magiworld/db';
import { getBrandPalette, getThemeClass, type BrandPalette } from './brand-palettes';

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
const BRAND_COOKIE_MAX_AGE = 60 * 60 * 24;

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

export async function clearBrandCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(BRAND_COOKIE_NAME);
}

export async function getCurrentBrandPalette(): Promise<BrandPalette> {
  const brand = await getCurrentBrand();
  return getBrandPalette(brand?.themeConfig?.palette);
}

export async function getCurrentBrandThemeClass(isDark: boolean = false): Promise<string> {
  const brand = await getCurrentBrand();
  return getThemeClass(brand?.themeConfig?.palette, isDark);
}

export async function isToolTypeAllowed(toolTypeId: string): Promise<boolean> {
  const brand = await getCurrentBrand();

  if (!brand) return true;
  if (brand.allowedToolTypeIds.length === 0) return true;

  return brand.allowedToolTypeIds.includes(toolTypeId);
}
