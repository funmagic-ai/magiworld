'use server';

import { db, oemSoftwareBrands, eq } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Theme configuration for OEM brands.
 * Uses predefined palettes for consistent branding.
 */
export type ThemeConfig = {
  /** Palette key from brandPalettes */
  palette?: string;
  /** CDN URL to brand logo */
  logo?: string;
  /** Display name shown in software UI */
  brandName?: string;
};

/**
 * Form data structure for OEM brand create/update.
 */
export type OemBrandFormData = {
  slug: string;
  name: string;
  softwareId: string;
  themeConfig: ThemeConfig;
  allowedToolTypeIds: string[];
  isActive: boolean;
};

/**
 * Creates a new OEM software brand.
 */
export async function createOemBrand(data: OemBrandFormData) {
  const [brand] = await db
    .insert(oemSoftwareBrands)
    .values({
      slug: data.slug,
      name: data.name,
      softwareId: data.softwareId,
      themeConfig: data.themeConfig,
      allowedToolTypeIds: data.allowedToolTypeIds,
      isActive: data.isActive,
    })
    .returning();

  revalidatePath('/oem-brands');
  redirect('/oem-brands');
}

/**
 * Updates an existing OEM software brand.
 */
export async function updateOemBrand(id: string, data: OemBrandFormData) {
  await db
    .update(oemSoftwareBrands)
    .set({
      slug: data.slug,
      name: data.name,
      // Note: softwareId is intentionally not updated after creation
      themeConfig: data.themeConfig,
      allowedToolTypeIds: data.allowedToolTypeIds,
      isActive: data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(oemSoftwareBrands.id, id));

  revalidatePath('/oem-brands');
  redirect('/oem-brands');
}

/**
 * Deletes an OEM software brand.
 */
export async function deleteOemBrand(id: string) {
  await db.delete(oemSoftwareBrands).where(eq(oemSoftwareBrands.id, id));
  revalidatePath('/oem-brands');
  redirect('/oem-brands');
}

/**
 * Fetches a single OEM brand by ID.
 */
export async function getOemBrandById(id: string) {
  const [brand] = await db
    .select()
    .from(oemSoftwareBrands)
    .where(eq(oemSoftwareBrands.id, id))
    .limit(1);

  if (!brand) return null;

  return {
    id: brand.id,
    slug: brand.slug,
    name: brand.name,
    softwareId: brand.softwareId,
    themeConfig: (brand.themeConfig as ThemeConfig) || {},
    allowedToolTypeIds: (brand.allowedToolTypeIds as string[]) || [],
    isActive: brand.isActive,
    createdAt: brand.createdAt,
    updatedAt: brand.updatedAt,
  };
}

/**
 * Fetches all OEM brands for the list view.
 */
export async function getOemBrandsList() {
  const brands = await db
    .select()
    .from(oemSoftwareBrands)
    .orderBy(oemSoftwareBrands.name);

  return brands.map((brand) => ({
    id: brand.id,
    slug: brand.slug,
    name: brand.name,
    softwareId: brand.softwareId,
    themeConfig: (brand.themeConfig as ThemeConfig) || {},
    allowedToolTypeIds: (brand.allowedToolTypeIds as string[]) || [],
    isActive: brand.isActive,
  }));
}
