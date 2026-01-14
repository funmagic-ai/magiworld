/**
 * @fileoverview Image Rerender Tool
 * @fileoverview 图像重渲染工具
 *
 * Transform images using AI with text prompts (image-to-image).
 * Uses Flux Dev model for high-quality transformations.
 * 使用AI和文字提示变换图像（图像到图像）。
 * 使用Flux Dev模型进行高质量变换。
 *
 * @module lib/ai/tools/image-rerender
 */

import { generateImage } from 'ai';
import { fal } from '../index';

/**
 * Image rerender result / 图像重渲染结果
 *
 * @property base64 - Base64-encoded transformed image / Base64编码的变换图像
 * @property url - Optional URL to result image / 可选的结果图像URL
 */
export interface ImageRerenderResult {
  base64?: string;
  url?: string;
}

/**
 * Image rerender options / 图像重渲染选项
 *
 * @property imageUrl - URL of source image to transform / 要变换的源图像URL
 * @property prompt - Text description of desired changes / 期望变化的文字描述
 * @property strength - Transform intensity 0-1 (0=keep original, 1=full transform) / 变换强度0-1
 */
export interface ImageRerenderOptions {
  imageUrl: string;
  prompt: string;
  strength?: number;
}

/**
 * Rerender an image with AI transformation / 使用AI变换重渲染图像
 *
 * Applies text-guided modifications to an existing image.
 * Strength controls how much of the original is preserved.
 * 对现有图像应用文字引导的修改。
 * 强度控制保留多少原图特征。
 *
 * @param options - Rerender options / 重渲染选项
 * @returns Result with base64-encoded transformed image / 带Base64编码变换图像的结果
 */
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
