'use server';

/**
 * @fileoverview AI Server Actions
 *
 * Server actions for AI-powered image processing operations.
 * These actions are called from client components and execute on the server
 * where API keys are securely available.
 *
 * @module apps/admin/lib/actions/ai
 */

import {
  removeBackground as removeBackgroundFn,
  generateImageFromPrompt as generateImageFn,
  upscaleImage as upscaleImageFn,
  rerenderImage as rerenderImageFn,
  type ImageGenerateOptions,
  type ImageUpscaleOptions,
  type ImageRerenderOptions,
} from '@/lib/ai';

/**
 * Result from AI image processing operations.
 */
export interface AIImageResult {
  success: boolean;
  base64?: string;
  url?: string;
  error?: string;
}

/**
 * Remove background from an image.
 */
export async function removeBackground(imageUrl: string): Promise<AIImageResult> {
  try {
    if (!imageUrl) {
      return { success: false, error: 'Image URL is required' };
    }

    const result = await removeBackgroundFn(imageUrl);

    return {
      success: true,
      base64: result.base64,
      url: result.url,
    };
  } catch (error) {
    console.error('Background removal failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove background',
    };
  }
}

/**
 * Generate an image from a text prompt.
 */
export async function generateImage(options: ImageGenerateOptions): Promise<AIImageResult> {
  try {
    if (!options.prompt?.trim()) {
      return { success: false, error: 'Prompt is required' };
    }

    const result = await generateImageFn(options);

    return {
      success: true,
      base64: result.base64,
      url: result.url,
    };
  } catch (error) {
    console.error('Image generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate image',
    };
  }
}

/**
 * Upscale an image to higher resolution.
 */
export async function upscaleImage(options: ImageUpscaleOptions): Promise<AIImageResult> {
  try {
    if (!options.imageUrl) {
      return { success: false, error: 'Image URL is required' };
    }

    const result = await upscaleImageFn(options);

    return {
      success: true,
      base64: result.base64,
      url: result.url,
    };
  } catch (error) {
    console.error('Image upscale failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upscale image',
    };
  }
}

/**
 * Rerender an image using AI transformation.
 */
export async function rerenderImage(options: ImageRerenderOptions): Promise<AIImageResult> {
  try {
    if (!options.imageUrl) {
      return { success: false, error: 'Image URL is required' };
    }
    if (!options.prompt?.trim()) {
      return { success: false, error: 'Prompt is required' };
    }

    const result = await rerenderImageFn(options);

    return {
      success: true,
      base64: result.base64,
      url: result.url,
    };
  } catch (error) {
    console.error('Image rerender failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rerender image',
    };
  }
}

