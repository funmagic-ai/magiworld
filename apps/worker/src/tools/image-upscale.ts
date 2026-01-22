/**
 * @fileoverview Image Upscale Tool Processor
 * @fileoverview 图像放大工具处理器
 *
 * Upscales images to higher resolution using fal.ai Real-ESRGAN model.
 * Uses native @fal-ai/client SDK directly.
 * 使用 fal.ai Real-ESRGAN 模型将图像放大到更高分辨率。
 * 直接使用原生 @fal-ai/client SDK。
 *
 * Provider: fal_ai
 * Model: fal-ai/real-esrgan
 *
 * @module @magiworld/worker/tools/image-upscale
 */

import { fal } from '@fal-ai/client';
import type { ToolContext, ToolResult } from './types';
import { getProviderCredentials } from './provider-client';
import { uploadBase64Image, maybeSignUrl } from '../s3';
import { createLogger } from '@magiworld/utils/logger';
import { bufferToBase64 } from '@magiworld/utils/ai';

const logger = createLogger('tool:image-upscale');

/**
 * Input parameters for image upscaling
 * 图像放大的输入参数
 */
interface ImageUpscaleInput {
  /** Source image URL */
  imageUrl: string;
  /** Upscale factor: 2x or 4x */
  scale?: 2 | 4;
}

/**
 * Fal.ai Real-ESRGAN response
 * Fal.ai Real-ESRGAN 响应
 */
interface FalUpscaleResult {
  image: {
    url: string;
    content_type: string;
    width: number;
    height: number;
  };
}

/**
 * Process image upscale task
 * 处理图像放大任务
 *
 * @param ctx - Tool context with task info and job
 * @returns Tool result with output URL and usage data
 */
export async function processImageUpscale(ctx: ToolContext): Promise<ToolResult> {
  const { taskId, userId, toolSlug, inputParams, job } = ctx;
  const { imageUrl, scale = 2 } = inputParams as unknown as ImageUpscaleInput;

  if (!imageUrl) {
    throw new Error('imageUrl is required for image upscaling');
  }

  logger.info(`Processing image upscale`, { taskId, scale, imageUrl: imageUrl.substring(0, 50) + '...' });

  // Step 1: Get provider credentials
  const credentials = await getProviderCredentials('fal_ai');

  // Configure fal client with credentials from DB
  fal.config({
    credentials: credentials.apiKey,
  });

  // Update progress
  await job.updateProgress(10);

  // Step 2: Call fal.ai API using native SDK
  // Sign URL before sending to external API
  const signedImageUrl = maybeSignUrl(imageUrl);

  logger.debug(`Calling fal.ai Real-ESRGAN API`, { taskId });
  const startTime = Date.now();

  const result = await fal.subscribe('fal-ai/real-esrgan', {
    input: {
      image_url: signedImageUrl,
      scale,
    },
    logs: false,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') {
        job.updateProgress(30);
      }
    },
  }) as { data: FalUpscaleResult };

  const apiLatencyMs = Date.now() - startTime;
  logger.debug(`fal.ai API responded`, { taskId, latencyMs: apiLatencyMs });

  // Update progress
  await job.updateProgress(70);

  // Step 3: Download result and upload to S3
  if (!result.data?.image?.url) {
    throw new Error('No image returned from fal.ai');
  }

  // Fetch the image from fal.ai URL
  const imageResponse = await fetch(result.data.image.url);
  if (!imageResponse.ok) {
    throw new Error(`Failed to fetch result image: ${imageResponse.status}`);
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  const base64 = bufferToBase64(imageBuffer);

  // Upload to S3
  const resultUrl = await uploadBase64Image(userId, taskId, base64, 'image/png', toolSlug);
  logger.debug(`Uploaded result to S3`, { taskId, resultUrl });

  // Update progress
  await job.updateProgress(100);

  return {
    outputData: {
      resultUrl,
      provider: 'fal_ai',
      model: 'fal-ai/real-esrgan',
      width: result.data.image.width,
      height: result.data.image.height,
      scale,
    },
    usageData: {
      provider: 'fal_ai',
      model: 'fal-ai/real-esrgan',
      apiLatencyMs,
    },
  };
}
