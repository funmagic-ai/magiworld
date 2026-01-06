/**
 * @fileoverview Background Removal Tool
 *
 * Remove backgrounds from images using Fal.ai Bria RMBG 2.0 model.
 *
 * @module apps/admin/lib/ai/tools/background-remove
 */

import { generateImage } from 'ai';
import { fal } from '../index';

export interface BackgroundRemoveResult {
  base64?: string;
  url?: string;
}

export async function removeBackground(imageUrl: string): Promise<BackgroundRemoveResult> {
  const { image } = await generateImage({
    model: fal.image('fal-ai/bria/background/remove'),
    prompt: '',
    providerOptions: {
      fal: {
        image_url: imageUrl,
      },
    },
  });

  return {
    base64: image.base64,
    url: undefined,
  };
}
