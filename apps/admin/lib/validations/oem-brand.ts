import { z } from 'zod';
import { brandPalettes } from '@/lib/brand-palettes';

/**
 * Theme configuration schema for OEM brands.
 * Uses predefined palettes for consistency and accessibility.
 */
const themeConfigSchema = z.object({
  /** Palette key from brandPalettes */
  palette: z.enum(Object.keys(brandPalettes) as [string, ...string[]]).default('neutral'),
  /** CDN URL to brand logo */
  logo: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  /** Display name shown in software UI */
  brandName: z.string().optional(),
});

/**
 * OEM Software Brand validation schema.
 */
export const oemBrandSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  name: z.string().min(1, 'Name is required'),
  softwareId: z
    .string()
    .min(1, 'Software ID is required')
    .regex(/^[A-Z0-9_]+$/, 'Software ID must be uppercase letters, numbers, and underscores only'),
  themeConfig: themeConfigSchema,
  allowedToolTypeIds: z.array(z.string().uuid()).default([]),
  isActive: z.boolean(),
});

export type OemBrandFormValues = z.infer<typeof oemBrandSchema>;

export const oemBrandFieldErrors = {
  slug: {
    required: 'Slug is required',
    pattern: 'Use lowercase letters, numbers, and hyphens only (e.g., "partner-a")',
  },
  name: {
    required: 'Name is required',
  },
  softwareId: {
    required: 'Software ID is required',
    pattern: 'Use uppercase letters, numbers, and underscores only (e.g., "PARTNER_A_2024")',
  },
};
