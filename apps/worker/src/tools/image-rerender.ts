/**
 * @fileoverview Image Rerender Tool Processor
 * @fileoverview 图像重渲染工具处理器
 *
 * Transform images using AI with text prompts (image-to-image).
 * Uses fal.ai Flux Dev model for high-quality transformations.
 * Uses native @fal-ai/client SDK directly.
 * 使用AI和文字提示变换图像（图像到图像）。
 * 使用 fal.ai Flux Dev 模型进行高质量变换。
 * 直接使用原生 @fal-ai/client SDK。
 *
 * Provider: fal_ai
 * Model: fal-ai/flux/dev/image-to-image
 *
 * @module @magiworld/worker/tools/image-rerender
 */

import { fal } from '@fal-ai/client';
import type { ToolContext, ToolResult } from './types';
import { getProviderCredentials } from './provider-client';
import { uploadBase64Image, maybeSignUrl } from '../s3';
import { createLogger } from '@magiworld/utils/logger';
import { bufferToBase64 } from '@magiworld/utils/ai';

const logger = createLogger('tool:image-rerender');

/**
 * Input parameters for image rerendering
 * 图像重渲染的输入参数
 */
interface ImageRerenderInput {
  /** Source image URL */
  imageUrl: string;
  /** Text description of desired changes */
  prompt: string;
  /** Transform intensity 0-1 (0=keep original, 1=full transform) */
  strength?: number;
}

/**
 * Fal.ai Flux image-to-image response
 * Fal.ai Flux 图像到图像响应
 */
interface FalFluxImg2ImgResult {
  images: Array<{
    url: string;
    content_type: string;
    width: number;
    height: number;
  }>;
}

/**
 * Process image rerender task
 * 处理图像重渲染任务
 *
 * @param ctx - Tool context with task info and job
 * @returns Tool result with output URL and usage data
 */
export async function processImageRerender(ctx: ToolContext): Promise<ToolResult> {
  const { taskId, userId, toolSlug, inputParams, job } = ctx;
  const { imageUrl, prompt, strength = 0.75 } = inputParams as unknown as ImageRerenderInput;

  if (!imageUrl) {
    throw new Error('imageUrl is required for image rerendering');
  }

  if (!prompt) {
    throw new Error('prompt is required for image rerendering');
  }

  logger.info(`Processing image rerender`, {
    taskId,
    prompt: prompt.substring(0, 50) + '...',
    strength,
    imageUrl: imageUrl.substring(0, 50) + '...',
  });

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

  logger.debug(`Calling fal.ai Flux image-to-image API`, { taskId });
  const startTime = Date.now();

  const result = await fal.subscribe('fal-ai/flux/dev/image-to-image', {
    input: {
      image_url: signedImageUrl,
      prompt,
      strength,
      num_inference_steps: 28,
    },
    logs: false,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') {
        job.updateProgress(30);
      }
    },
  }) as { data: FalFluxImg2ImgResult };

  const apiLatencyMs = Date.now() - startTime;
  logger.debug(`fal.ai API responded`, { taskId, latencyMs: apiLatencyMs });

  // Update progress
  await job.updateProgress(70);

  // Step 3: Download result and upload to S3
  if (!result.data?.images?.[0]?.url) {
    throw new Error('No image returned from fal.ai');
  }

  // Fetch the image from fal.ai URL
  const imageResponse = await fetch(result.data.images[0].url);
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
      model: 'fal-ai/flux/dev/image-to-image',
      width: result.data.images[0].width,
      height: result.data.images[0].height,
      strength,
    },
    usageData: {
      provider: 'fal_ai',
      model: 'fal-ai/flux/dev/image-to-image',
      apiLatencyMs,
    },
  };
}
