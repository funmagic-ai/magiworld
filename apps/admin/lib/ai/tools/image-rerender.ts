/**
 * @fileoverview Image Rerender Tool
 *
 * Transform images using AI with text prompts (image-to-image).
 *
 * @module apps/admin/lib/ai/tools/image-rerender
 */

import { generateImage } from 'ai';
import { fal } from '../index';

export interface ImageRerenderResult {
  base64?: string;
  url?: string;
}

export interface ImageRerenderOptions {
  imageUrl: string;
  prompt: string;
  strength?: number; // 0-1, how much to transform (0 = keep original, 1 = full transform)
}

export async function rerenderImage(
  options: ImageRerenderOptions
): Promise<ImageRerenderResult> {
  const { imageUrl, prompt, strength = 0.75 } = options;

  const { image } = await generateImage({
    model: fal.image('fal-ai/flux/dev/image-to-image'),
    prompt,
    providerOptions: {
      fal: {
        image_url: imageUrl,
        strength,
        num_inference_steps: 28,
      },
    },
  });

  return {
    base64: image.base64,
    url: undefined,
  };
}
