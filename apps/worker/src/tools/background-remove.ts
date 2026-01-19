/**
 * @fileoverview Background Remove Tool Processor
 * @fileoverview 背景移除工具处理器
 *
 * Removes background from images using fal.ai bria/background/remove model.
 * Uses native @fal-ai/client SDK directly.
 * 使用 fal.ai bria/background/remove 模型从图像中移除背景。
 * 直接使用原生 @fal-ai/client SDK。
 *
 * Provider: fal_ai
 * Model: fal-ai/bria/background/remove
 *
 * @module @magiworld/worker/tools/background-remove
 */

import { fal } from '@fal-ai/client';
import type { ToolContext, ToolResult } from './types';
import { getProviderCredentials } from './provider-client';
import { uploadBase64Image } from '../s3';
import { createLogger } from '@magiworld/utils/logger';
import { bufferToBase64 } from '@magiworld/utils/ai';

const logger = createLogger('tool:background-remove');

/**
 * Input parameters for background removal
 * 背景移除的输入参数
 */
interface BackgroundRemoveInput {
  /** Source image URL */
  imageUrl: string;
}

/**
 * Fal.ai background removal response
 * Fal.ai 背景移除响应
 */
interface FalBackgroundRemoveResult {
  image: {
    url: string;
    content_type: string;
    width: number;
    height: number;
  };
}

/**
 * Process background removal task
 * 处理背景移除任务
 *
 * @param ctx - Tool context with task info and job
 * @returns Tool result with output URL and usage data
 */
export async function processBackgroundRemove(ctx: ToolContext): Promise<ToolResult> {
  const { taskId, userId, toolSlug, inputParams, job } = ctx;
  const { imageUrl } = inputParams as unknown as BackgroundRemoveInput;

  if (!imageUrl) {
    throw new Error('imageUrl is required for background removal');
  }

  logger.info(`Processing background removal`, { taskId, imageUrl: imageUrl.substring(0, 50) + '...' });

  // Step 1: Get provider credentials
  const credentials = await getProviderCredentials('fal_ai');

  // Configure fal client with credentials from DB
  fal.config({
    credentials: credentials.apiKey,
  });

  // Update progress
  await job.updateProgress(10);

  // Step 2: Call fal.ai API using native SDK
  logger.debug(`Calling fal.ai background removal API`, { taskId });
  const startTime = Date.now();

  const result = await fal.subscribe('fal-ai/bria/background/remove', {
    input: {
      image_url: imageUrl,
    },
    logs: false,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') {
        // Update progress based on queue position
        job.updateProgress(30);
      }
    },
  }) as { data: FalBackgroundRemoveResult };

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
      model: 'fal-ai/bria/background/remove',
      width: result.data.image.width,
      height: result.data.image.height,
    },
    usageData: {
      provider: 'fal_ai',
      model: 'fal-ai/bria/background/remove',
      apiLatencyMs,
    },
  };
}
