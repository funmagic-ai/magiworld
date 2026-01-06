/**
 * @fileoverview Image Upscale Tool
 *
 * Upscale images to higher resolution using Fal.ai models.
 *
 * @module apps/admin/lib/ai/tools/image-upscale
 */

import { generateImage } from 'ai';
import { fal } from '../index';

export interface ImageUpscaleResult {
  base64?: string;
  url?: string;
}

export interface ImageUpscaleOptions {
  imageUrl: string;
  scale?: 2 | 4;
}

export async function upscaleImage(
  options: ImageUpscaleOptions
): Promise<ImageUpscaleResult> {
  const { imageUrl, scale = 2 } = options;

  const { image } = await generateImage({
    model: fal.image('fal-ai/real-esrgan'),
    prompt: '',
    providerOptions: {
      fal: {
        image_url: imageUrl,
        scale,
      },
    },
  });

  return {
    base64: image.base64,
    url: undefined,
  };
}
