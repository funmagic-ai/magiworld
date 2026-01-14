/**
 * @fileoverview Image Upscale Tool
 * @fileoverview 图像放大工具
 *
 * Upscale images to higher resolution using Fal.ai Real-ESRGAN model.
 * Supports 2x and 4x upscaling with AI enhancement.
 * 使用Fal.ai Real-ESRGAN模型将图像放大到更高分辨率。
 * 支持2倍和4倍放大，带AI增强。
 *
 * @module lib/ai/tools/image-upscale
 */

import { generateImage } from 'ai';
import { fal } from '../index';

/**
 * Image upscale result / 图像放大结果
 *
 * @property base64 - Base64-encoded upscaled image / Base64编码的放大图像
 * @property url - Optional URL to result image / 可选的结果图像URL
 */
export interface ImageUpscaleResult {
  base64?: string;
  url?: string;
}

/**
 * Image upscale options / 图像放大选项
 *
 * @property imageUrl - URL of source image to upscale / 要放大的源图像URL
 * @property scale - Upscale factor: 2x or 4x / 放大倍数：2倍或4倍
 */
export interface ImageUpscaleOptions {
  imageUrl: string;
  scale?: 2 | 4;
}

/**
 * Upscale an image to higher resolution / 将图像放大到更高分辨率
 *
 * Uses Real-ESRGAN model for high-quality AI upscaling.
 * Enhances details while increasing resolution.
 * 使用Real-ESRGAN模型进行高质量AI放大。
 * 在提高分辨率的同时增强细节。
 *
 * @param options - Upscale options / 放大选项
 * @returns Result with base64-encoded upscaled image / 带Base64编码放大图像的结果
 */
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
