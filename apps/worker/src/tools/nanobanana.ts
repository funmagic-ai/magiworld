/**
 * @fileoverview Nanobanana Pro Tool Processor
 * @fileoverview Nanobanana Pro工具处理器
 *
 * Generate images using Google Gemini 2.0 Flash model.
 * Uses native @google/genai SDK directly.
 * Supports text-to-image and image-to-image generation.
 * 使用Google Gemini 2.0 Flash模型生成图像。
 * 直接使用原生@google/genai SDK。
 * 支持文本到图像和图像到图像生成。
 *
 * Provider: google
 * Model: gemini-2.0-flash-preview-image-generation
 *
 * @module @magiworld/worker/tools/nanobanana
 */

import { GoogleGenAI } from '@google/genai';
import type { ToolContext, ToolResult } from './types';
import { getProviderCredentials } from './provider-client';
import { uploadBase64Image } from '../s3';
import { createLogger } from '@magiworld/utils/logger';

const logger = createLogger('tool:nanobanana');

/** Gemini model ID for image generation */
const MODEL_ID = 'gemini-2.0-flash-preview-image-generation';

/**
 * Input parameters for nanobanana generation
 * Nanobanana生成的输入参数
 */
interface NanobananaInput {
  /** Text prompt describing the image */
  prompt: string;
  /** Aspect ratio (e.g., '1:1', '16:9') */
  aspectRatio?: string;
  /** Output size ('1K', '2K', '4K') */
  imageSize?: string;
  /** Input images for image-to-image generation */
  inputImages?: Array<{
    base64: string;
    mediaType: string;
  }>;
}

/**
 * Process nanobanana generation task
 * 处理nanobanana生成任务
 *
 * @param ctx - Tool context with task info and job
 * @returns Tool result with output URLs and usage data
 */
export async function processNanobanana(ctx: ToolContext): Promise<ToolResult> {
  const { taskId, userId, toolSlug, inputParams, job } = ctx;
  const { prompt, aspectRatio, imageSize, inputImages } = inputParams as unknown as NanobananaInput;

  if (!prompt) {
    throw new Error('prompt is required for nanobanana generation');
  }

  logger.info(`Processing nanobanana generation`, {
    taskId,
    prompt: prompt.substring(0, 50) + '...',
    aspectRatio,
    imageSize,
    inputImageCount: inputImages?.length ?? 0,
  });

  // Step 1: Get provider credentials
  const credentials = await getProviderCredentials('google');

  // Update progress
  await job.updateProgress(10);

  // Step 2: Build request and call Gemini API
  const client = new GoogleGenAI({ apiKey: credentials.apiKey });

  // Build message parts
  type Part =
    | { text: string }
    | { inlineData: { mimeType: string; data: string } };

  const parts: Part[] = [{ text: prompt }];

  // Add input images if provided
  if (inputImages && inputImages.length > 0) {
    for (const img of inputImages) {
      // Strip data URL prefix if present
      const base64Data = img.base64.includes('base64,')
        ? img.base64.split('base64,')[1]
        : img.base64;

      parts.push({
        inlineData: {
          mimeType: img.mediaType || 'image/png',
          data: base64Data,
        },
      });
    }
  }

  logger.debug(`Calling Gemini API`, { taskId });
  const startTime = Date.now();

  await job.updateProgress(20);

  const response = await client.models.generateContent({
    model: MODEL_ID,
    contents: [{ role: 'user', parts }],
    config: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  });

  const apiLatencyMs = Date.now() - startTime;
  logger.debug(`Gemini API responded`, { taskId, latencyMs: apiLatencyMs });

  await job.updateProgress(50);

  // Step 3: Extract images and text from response
  const generatedImages: Array<{ base64: string; mediaType: string }> = [];
  let text = '';

  if (response.candidates && response.candidates[0]?.content?.parts) {
    for (const part of response.candidates[0].content.parts) {
      if ('text' in part && part.text) {
        text += part.text;
      }
      if ('inlineData' in part && part.inlineData) {
        generatedImages.push({
          base64: part.inlineData.data ?? '',
          mediaType: part.inlineData.mimeType ?? 'image/png',
        });
      }
    }
  }

  logger.debug(`Extracted response`, {
    taskId,
    imageCount: generatedImages.length,
    textLength: text.length,
  });

  // Step 4: Upload generated images to S3
  const imageUrls: string[] = [];

  for (let i = 0; i < generatedImages.length; i++) {
    const img = generatedImages[i];
    const progress = 50 + Math.floor((i + 1) / generatedImages.length * 40);
    await job.updateProgress(progress);

    // Upload to S3 with unique suffix for each image
    const resultUrl = await uploadBase64Image(
      userId,
      `${taskId}-${i}`,
      img.base64,
      img.mediaType,
      toolSlug
    );
    imageUrls.push(resultUrl);
    logger.debug(`Uploaded image ${i + 1}/${generatedImages.length} to S3`, { taskId, resultUrl });
  }

  // Update progress
  await job.updateProgress(100);

  return {
    outputData: {
      resultUrl: imageUrls[0], // Primary result URL for compatibility
      imageUrls, // All generated image URLs
      text, // Text response from model
      provider: 'google',
      model: MODEL_ID,
      imageCount: imageUrls.length,
    },
    usageData: {
      provider: 'google',
      model: MODEL_ID,
      apiLatencyMs,
    },
  };
}
