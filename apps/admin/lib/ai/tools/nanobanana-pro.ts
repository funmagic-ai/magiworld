/**
 * @fileoverview Nanobanana Pro Image Generation Tool
 * @fileoverview Nanobanana Pro图像生成工具
 *
 * Generate images using Google Gemini 3 Pro Image model.
 * Uses generateText with responseModalities: ['TEXT', 'IMAGE'].
 * Supports text-to-image and image-to-image generation.
 * 使用Google Gemini 3 Pro Image模型生成图像。
 * 使用generateText配合responseModalities: ['TEXT', 'IMAGE']。
 * 支持文本到图像和图像到图像生成。
 *
 * @module lib/ai/tools/nanobanana-pro
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { createLogger } from '@magiworld/utils/logger';

const logger = createLogger('nanobanana-pro');

/** Gemini 3 Pro Image model ID / Gemini 3 Pro Image模型ID */
const MODEL_ID = 'gemini-3-pro-image-preview';

/**
 * Supported aspect ratios / 支持的宽高比
 */
export type NanobananaAspectRatio =
  | '1:1'
  | '3:4'
  | '4:3'
  | '9:16'
  | '16:9'
  | '21:9';

/**
 * Supported output image sizes / 支持的输出图像尺寸
 */
export type NanobananaImageSize = '1K' | '2K' | '4K';

/**
 * Nanobanana generation options / Nanobanana生成选项
 *
 * @property aspectRatio - Output image aspect ratio / 输出图像宽高比
 * @property imageSize - Output image resolution / 输出图像分辨率
 */
export interface NanobananaOptions {
  aspectRatio?: NanobananaAspectRatio;
  imageSize?: NanobananaImageSize;
}

/**
 * Input image for image-to-image generation / 用于图像到图像生成的输入图像
 *
 * @property base64 - Base64-encoded image data / Base64编码的图像数据
 * @property mediaType - MIME type of the image / 图像的MIME类型
 */
export interface NanobananaInputImage {
  base64: string;
  mediaType: string;
}

/**
 * Generated image result / 生成的图像结果
 *
 * @property base64 - Base64-encoded generated image / Base64编码的生成图像
 * @property mediaType - MIME type of the image / 图像的MIME类型
 */
export interface NanobananaImage {
  base64: string;
  mediaType: string;
}

/**
 * Complete generation result / 完整生成结果
 *
 * @property images - Array of generated images / 生成图像数组
 * @property text - Text response from the model / 模型的文字响应
 */
export interface NanobananaResult {
  images: NanobananaImage[];
  text: string;
}

/**
 * Generate images using Nanobanana Pro / 使用Nanobanana Pro生成图像
 *
 * Uses Gemini 3 Pro Image model for multimodal image generation.
 * Supports both text-to-image and image-to-image workflows.
 * 使用Gemini 3 Pro Image模型进行多模态图像生成。
 * 支持文本到图像和图像到图像工作流程。
 *
 * @param prompt - Text prompt describing the image / 描述图像的文字提示
 * @param options - Generation options (aspect ratio, size) / 生成选项（宽高比、尺寸）
 * @param inputImages - Optional input images for image-to-image / 可选的输入图像用于图像到图像
 * @returns Generated images and text response / 生成的图像和文字响应
 */
export async function generateNanobanana(
  prompt: string,
  options: NanobananaOptions = {},
  inputImages?: NanobananaInputImage[]
): Promise<NanobananaResult> {
  const startTime = Date.now();

  // Log request / 记录请求
  logger.info(
    { prompt, options, inputImageCount: inputImages?.length ?? 0 },
    'Nanobanana request'
  );

  // Build message content / 构建消息内容
  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image'; image: URL | string };

  const contentParts: ContentPart[] = [{ type: 'text', text: prompt }];

  // Add input images if provided / 如果提供则添加输入图像
  if (inputImages && inputImages.length > 0) {
    for (const img of inputImages) {
      const dataUrl = img.base64.startsWith('data:')
        ? img.base64
        : `data:${img.mediaType || 'image/png'};base64,${img.base64}`;
      contentParts.push({ type: 'image', image: dataUrl });
    }
  }

  // Call generateText / 调用generateText
  const result = await generateText({
    model: google(MODEL_ID),
    messages: [{ role: 'user', content: contentParts }],
    providerOptions: {
      google: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: options.aspectRatio || '1:1',
          imageSize: options.imageSize || '2K',
        }
      },
    },
  });

  const durationMs = Date.now() - startTime;

  // Log full response for observation / 记录完整响应以便观察
  logger.info(
    {
      durationMs,
      text: result.text,
      filesCount: result.files?.length ?? 0,
      finishReason: result.finishReason,
      rawFinishReason: result.rawFinishReason,
      usage: result.usage,
      providerMetadata: result.providerMetadata,
      response: {
        id: result.response?.id,
        modelId: result.response?.modelId,
        timestamp: result.response?.timestamp,
      },
      reasoning: result.reasoning,
      reasoningText: result.reasoningText,
      warnings: result.warnings,
    },
    'Nanobanana response'
  );

  // Extract images / 提取图像
  const images: NanobananaImage[] = [];
  for (const file of result.files ?? []) {
    if (file.mediaType.startsWith('image/')) {
      images.push({
        base64: file.base64,
        mediaType: file.mediaType,
      });
      logger.info(
        { mediaType: file.mediaType, base64Length: file.base64.length },
        'Generated image'
      );
    }
  }

  return {
    images,
    text: result.text ?? '',
  };
}
