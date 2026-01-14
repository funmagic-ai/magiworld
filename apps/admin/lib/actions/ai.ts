/**
 * @fileoverview AI Server Actions
 * @fileoverview AI服务端操作
 *
 * Server actions for AI-powered image processing operations.
 * These actions are called from client components and execute on the server
 * where API keys are securely available.
 * 用于AI驱动的图像处理操作的服务端函数。
 * 这些操作从客户端组件调用，在服务端执行，API密钥在服务端安全可用。
 *
 * @module lib/actions/ai
 */

'use server';

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
 * Result from AI image processing operations / AI图像处理操作的结果
 *
 * Unified response structure for all AI image operations.
 * 所有AI图像操作的统一响应结构。
 *
 * @property success - Whether operation completed successfully / 操作是否成功完成
 * @property base64 - Base64-encoded image data / Base64编码的图像数据
 * @property url - URL to processed image (if hosted) / 处理后图像的URL（如果托管）
 * @property error - Error message if failed / 失败时的错误信息
 */
export interface AIImageResult {
  success: boolean;
  base64?: string;
  url?: string;
  error?: string;
}

/**
 * Remove background from an image / 移除图像背景
 *
 * Uses AI to detect and remove the background, leaving only the subject.
 * Powered by fal.ai background removal API.
 * 使用AI检测并移除背景，只保留主体。由fal.ai背景移除API驱动。
 *
 * @param imageUrl - URL of source image / 源图像URL
 * @returns Processing result with transparent background image / 带透明背景图像的处理结果
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
 * Generate an image from a text prompt / 根据文字提示生成图像
 *
 * Uses AI text-to-image models to create images from descriptions.
 * 使用AI文本到图像模型根据描述创建图像。
 *
 * @param options - Generation options including prompt and model / 生成选项，包括提示词和模型
 * @returns Generated image result / 生成的图像结果
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
 * Upscale an image to higher resolution / 将图像放大到更高分辨率
 *
 * Uses AI super-resolution to increase image dimensions while preserving quality.
 * 使用AI超分辨率技术增加图像尺寸同时保持质量。
 *
 * @param options - Upscale options including image URL and scale factor / 放大选项，包括图像URL和缩放比例
 * @returns Upscaled image result / 放大后的图像结果
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
 * Rerender an image using AI transformation / 使用AI变换重新渲染图像
 *
 * Applies AI-powered style transfer or modification to an existing image.
 * 对现有图像应用AI驱动的风格迁移或修改。
 *
 * @param options - Rerender options including image URL and prompt / 重渲染选项，包括图像URL和提示词
 * @returns Transformed image result / 变换后的图像结果
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
