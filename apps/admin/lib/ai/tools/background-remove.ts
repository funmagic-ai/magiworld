/**
 * @fileoverview Background Removal Tool
 * @fileoverview 背景移除工具
 *
 * Remove backgrounds from images using Fal.ai Bria RMBG 2.0 model.
 * 使用Fal.ai Bria RMBG 2.0模型从图像中移除背景。
 *
 * @module lib/ai/tools/background-remove
 */

import { generateImage } from 'ai';
import { fal } from '../index';

/**
 * Background removal result / 背景移除结果
 *
 * @property base64 - Base64-encoded image with transparent background / Base64编码的透明背景图像
 * @property url - Optional URL to result image / 可选的结果图像URL
 */
export interface BackgroundRemoveResult {
  base64?: string;
  url?: string;
}

/**
 * Remove background from an image / 从图像中移除背景
 *
 * Uses Fal.ai Bria RMBG 2.0 model for high-quality background removal.
 * Returns transparent PNG image.
 * 使用Fal.ai Bria RMBG 2.0模型进行高质量背景移除。
 * 返回透明PNG图像。
 *
 * @param imageUrl - URL of source image / 源图像URL
 * @returns Result with base64-encoded transparent image / 带Base64编码透明图像的结果
 */
export async function removeBackground(imageUrl: string): Promise<BackgroundRemoveResult> {
  const { image } = await generateImage({
    model: fal.image('fal-ai/bria/background/remove'),
    prompt: '',
    providerOptions: {
      fal: {
        imageUrl: imageUrl,
      },
    },
  });

  return {
    base64: image.base64,
    url: undefined,
  };
}
