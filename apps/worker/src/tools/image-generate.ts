/**
 * @fileoverview Image Generate Tool Processor
 * @fileoverview 图像生成工具处理器
 *
 * Generates images from text prompts using fal.ai flux/schnell model.
 * Uses native @fal-ai/client SDK directly.
 * 使用 fal.ai flux/schnell 模型从文本提示生成图像。
 * 直接使用原生 @fal-ai/client SDK。
 *
 * Provider: fal_ai
 * Model: fal-ai/flux/schnell
 *
 * @module @magiworld/worker/tools/image-generate
 */

import { fal } from '@fal-ai/client';
import type { ToolContext, ToolResult } from './types';
import { getProviderCredentials } from './provider-client';
import { uploadBase64Image } from '../s3';
import { createLogger } from '@magiworld/utils/logger';
import { bufferToBase64 } from '@magiworld/utils/ai';

const logger = createLogger('tool:image-generate');

/**
 * Input parameters for image generation
 * 图像生成的输入参数
 */
interface ImageGenerateInput {
  /** Text prompt for image generation */
  prompt: string;
  /** Aspect ratio */
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  /** Negative prompt */
  negativePrompt?: string;
}

/**
 * Fal.ai flux response
 * Fal.ai flux 响应
 */
interface FalFluxResult {
  images: Array<{
    url: string;
    content_type: string;
    width: number;
    height: number;
  }>;
}

/**
 * Process image generation task
 * 处理图像生成任务
 *
 * @param ctx - Tool context with task info and job
 * @returns Tool result with output URL and usage data
 */
export async function processImageGenerate(ctx: ToolContext): Promise<ToolResult> {
  const { taskId, userId, toolSlug, inputParams, job } = ctx;
  const { prompt, aspectRatio = '1:1', negativePrompt } = inputParams as unknown as ImageGenerateInput;

  if (!prompt) {
    throw new Error('prompt is required for image generation');
  }

  logger.info(`Processing image generation`, { taskId, prompt: prompt.substring(0, 50) + '...' });

  // Step 1: Get provider credentials
  const credentials = await getProviderCredentials('fal_ai');

  // Configure fal client with credentials from DB
  fal.config({
    credentials: credentials.apiKey,
  });

  // Update progress
  await job.updateProgress(10);

  // Map aspect ratio to dimensions
  const dimensions: Record<string, { width: number; height: number }> = {
    '1:1': { width: 1024, height: 1024 },
    '16:9': { width: 1024, height: 576 },
    '9:16': { width: 576, height: 1024 },
    '4:3': { width: 1024, height: 768 },
    '3:4': { width: 768, height: 1024 },
  };

  const { width, height } = dimensions[aspectRatio] || dimensions['1:1'];

  // Step 2: Call fal.ai API using native SDK
  logger.debug(`Calling fal.ai flux API`, { taskId });
  const startTime = Date.now();

  const result = await fal.subscribe('fal-ai/flux/schnell', {
    input: {
      prompt,
      image_size: { width, height },
      num_inference_steps: 4,
      ...(negativePrompt && { negative_prompt: negativePrompt }),
    },
    logs: false,
    onQueueUpdate: (update) => {
      if (update.status === 'IN_PROGRESS') {
        job.updateProgress(30);
      }
    },
  }) as { data: FalFluxResult };

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
      model: 'fal-ai/flux/schnell',
      width: result.data.images[0].width,
      height: result.data.images[0].height,
    },
    usageData: {
      provider: 'fal_ai',
      model: 'fal-ai/flux/schnell',
      apiLatencyMs,
    },
  };
}
