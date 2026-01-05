import { z } from 'zod';

const translationSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
});

export const toolTypeSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only'),
  badgeColor: z.enum(['default', 'secondary', 'outline']),
  order: z.number().int().min(0, 'Order must be 0 or greater'),
  isActive: z.boolean(),
  translations: z.object({
    en: translationSchema,
    zh: translationSchema,
    ja: translationSchema,
    pt: translationSchema,
  }),
});

export type ToolTypeFormValues = z.infer<typeof toolTypeSchema>;

export const toolTypeFieldErrors = {
  slug: {
    required: 'Slug is required',
    pattern: 'Use lowercase letters, numbers, and hyphens only (e.g., "edit-tools")',
  },
  translations: {
    required: 'All locale names (en, zh, ja, pt) are required',
  },
};
