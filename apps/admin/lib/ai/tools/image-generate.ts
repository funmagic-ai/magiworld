/**
 * @fileoverview Image Generation Tool
 * @fileoverview 图像生成工具
 *
 * Generate images from text prompts using Fal.ai models.
 * Uses Flux Schnell for fast, high-quality image generation.
 * 使用Fal.ai模型从文字提示生成图像。
 * 使用Flux Schnell实现快速高质量图像生成。
 *
 * @module lib/ai/tools/image-generate
 */

import { generateImage } from 'ai';
import { fal } from '../index';

/**
 * Image generation result / 图像生成结果
 *
 * @property base64 - Base64-encoded generated image / Base64编码的生成图像
 * @property url - Optional URL to result image / 可选的结果图像URL
 */
export interface ImageGenerateResult {
  base64?: string;
  url?: string;
}

/**
 * Image generation options / 图像生成选项
 *
 * @property prompt - Text description of desired image / 期望图像的文字描述
 * @property negativePrompt - Things to avoid in the image / 图像中要避免的内容
 * @property aspectRatio - Output image dimensions / 输出图像尺寸比例
 * @property style - Visual style preset / 视觉风格预设
 */
export interface ImageGenerateOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  style?: 'realistic' | 'anime' | 'digital-art' | 'fantasy';
}

/**
 * Generate an image from a text prompt / 从文字提示生成图像
 *
 * Uses Fal.ai Flux Schnell model for fast generation.
 * Supports multiple aspect ratios and optional negative prompts.
 * 使用Fal.ai Flux Schnell模型快速生成。
 * 支持多种宽高比和可选的负面提示词。
 *
 * @param options - Generation options / 生成选项
 * @returns Result with base64-encoded image / 带Base64编码图像的结果
 */
export async function generateImageFromPrompt(
  options: ImageGenerateOptions
): Promise<ImageGenerateResult> {
  const { prompt, negativePrompt, aspectRatio = '1:1' } = options;

  // Map aspect ratio to dimensions / 将宽高比映射到尺寸
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
