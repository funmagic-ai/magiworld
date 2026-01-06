/**
 * @fileoverview Image Generation Tool
 *
 * Generate images from text prompts using Fal.ai models.
 *
 * @module apps/admin/lib/ai/tools/image-generate
 */

import { generateImage } from 'ai';
import { fal } from '../index';

export interface ImageGenerateResult {
  base64?: string;
  url?: string;
}

export interface ImageGenerateOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  style?: 'realistic' | 'anime' | 'digital-art' | 'fantasy';
}

export async function generateImageFromPrompt(
  options: ImageGenerateOptions
): Promise<ImageGenerateResult> {
  const { prompt, negativePrompt, aspectRatio = '1:1' } = options;

  // Map aspect ratio to dimensions
  const dimensions: Record<string, { width: number; height: number }> = {
    '1:1': { width: 1024, height: 1024 },
    '16:9': { width: 1024, height: 576 },
    '9:16': { width: 576, height: 1024 },
    '4:3': { width: 1024, height: 768 },
    '3:4': { width: 768, height: 1024 },
  };

  const { width, height } = dimensions[aspectRatio];

  const { image } = await generateImage({
    model: fal.image('fal-ai/flux/schnell'),
    prompt,
    providerOptions: {
      fal: {
        image_size: { width, height },
        num_inference_steps: 4,
        ...(negativePrompt && { negative_prompt: negativePrompt }),
      },
    },
  });

  return {
    base64: image.base64,
    url: undefined,
  };
}
