/**
 * @fileoverview AI Service Layer
 *
 * Configures and exports AI providers for the admin application.
 * Uses Vercel AI SDK with Fal.ai provider for image processing.
 *
 * @module apps/admin/lib/ai
 */

import { createFal } from '@ai-sdk/fal';

/**
 * Fal.ai provider instance configured with API key from environment.
 * Used for image generation and processing tasks.
 */
export const fal = createFal({
  // API key is read from FAL_API_KEY environment variable by default
});

// Re-export all tools
export * from './tools';
