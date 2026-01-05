import { z } from 'zod';
import { TOOL_REGISTRY } from '@magiworld/types';

const translationSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  promptTemplate: z.string().optional(),
});

export const toolSchema = z.object({
  slug: z
    .string()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase letters, numbers, and hyphens only')
    .refine(
      (slug) => TOOL_REGISTRY.includes(slug as typeof TOOL_REGISTRY[number]),
      {
        message: `Slug must match a registered tool component. Valid slugs: ${TOOL_REGISTRY.join(', ')}`,
      }
    ),
  toolTypeId: z.string().uuid('Tool type is required'),
  thumbnailUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  aiEndpoint: z.string().optional(),
  promptTemplate: z.string().optional(),
  configJson: z.record(z.string(), z.unknown()).optional(),
  order: z.number().int().min(0, 'Order must be 0 or greater'),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  translations: z.object({
    en: translationSchema,
    zh: translationSchema,
    ja: translationSchema,
    pt: translationSchema,
  }),
});

export type ToolFormValues = z.infer<typeof toolSchema>;

export const toolFieldErrors = {
  slug: {
    required: 'Slug is required',
    pattern: 'Use lowercase letters, numbers, and hyphens only (e.g., "background-remove")',
    notRegistered: `Slug must match a registered tool component. Valid slugs: ${TOOL_REGISTRY.join(', ')}`,
  },
  toolTypeId: {
    required: 'Please select a tool type',
  },
  translations: {
    required: 'All locale titles (en, zh, ja, pt) are required',
  },
};

/** List of valid tool slugs for display in UI */
export const validToolSlugs = TOOL_REGISTRY;
