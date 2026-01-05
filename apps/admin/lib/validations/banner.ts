import { z } from 'zod';

const translationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().optional(),
});

export const bannerSchema = z.object({
  type: z.enum(['main', 'side'], { message: 'Banner type is required' }),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  link: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  order: z.number().int().min(0, 'Order must be 0 or greater'),
  isActive: z.boolean(),
  translations: z.object({
    en: translationSchema,
    zh: translationSchema,
    ja: translationSchema,
    pt: translationSchema,
  }),
});

export type BannerFormValues = z.infer<typeof bannerSchema>;

export const bannerFieldErrors = {
  type: {
    required: 'Please select a banner type',
  },
  link: {
    pattern: 'Must be a valid URL (e.g., https://example.com or /studio/edit)',
  },
  translations: {
    required: 'All locale titles (en, zh, ja, pt) are required',
  },
};
