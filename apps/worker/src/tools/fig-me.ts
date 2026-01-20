/**
 * @fileoverview Fig Me Tool Processor
 * @fileoverview Fig Me 工具处理器
 *
 * Multi-step tool for creating 3D figurines from user photos.
 * Step 1 (transform): Transform user photo to figurine style using OpenAI GPT-image-1
 * Step 2 (3d): Generate 3D model from transformed image using 3D SDK (Tripo/Hunyuan)
 *
 * 从用户照片创建3D人偶的多步骤工具。
 * 步骤1（transform）：使用OpenAI GPT-image-1将用户照片转换为人偶风格
 * 步骤2（3d）：使用3D SDK（Tripo/Hunyuan）从转换后的图像生成3D模型
 *
 * @module @magiworld/worker/tools/fig-me
 */

import OpenAI from 'openai';
import { Magi3DClient, TripoProvider, HunyuanProvider, TaskType, TaskStatus } from 'magi-3d/server';
import type { ToolContext, ToolResult } from './types';
import { getProviderCredentials } from './provider-client';
import { saveTaskResponse, sanitizeResponse } from './task-response';
import { uploadBase64Image, downloadAndUpload } from '../s3';
import { createLogger } from '@magiworld/utils/logger';

const logger = createLogger('tool:fig-me');

/**
 * Base step configuration with required name field
 * 带有必需 name 字段的基础步骤配置
 */
interface BaseStepConfig {
  name: string;
  provider?: string;
}

/**
 * Transform step configuration
 * 转换步骤配置
 */
interface TransformStepConfig extends BaseStepConfig {
  name: 'transform';
  /** Orchestration model for Responses API (e.g., gpt-4o) */
  model?: string;
  /** Image generation model (e.g., gpt-image-1.5) */
  imageModel?: string;
  systemPrompt?: string;
  /** Image size: 1024x1024, 1024x1536, 1536x1024, auto */
  size?: string;
  /** Rendering quality: low, medium, high */
  quality?: 'low' | 'medium' | 'high';
  /** Output format: png, jpeg, webp */
  format?: 'png' | 'jpeg' | 'webp';
  /** Compression level for JPEG/WebP (0-100) */
  compression?: number;
  /** Background: transparent or opaque */
  background?: 'transparent' | 'opaque';
  /** Moderation strictness: auto (default) or low */
  moderation?: 'auto' | 'low';
}

/**
 * 3D generation step configuration
 * 3D 生成步骤配置
 */
interface Step3DConfig extends BaseStepConfig {
  name: '3d';
  /** Provider slug: '3d_tripo' or '3d_hunyuan' */
  provider?: '3d_tripo' | '3d_hunyuan';
  /** Output format: 'glb', 'fbx', 'obj' */
  format?: 'glb' | 'fbx' | 'obj';
  /**
   * Provider-specific options passed to the 3D SDK
   * Tripo: pbr, texture, texture_quality, geometry_quality, face_limit, quad, auto_size
   * Hunyuan: EnablePBR, FaceCount, GenerateType, PolygonType, ResultFormat
   */
  providerOptions?: Record<string, unknown>;
}

/**
 * Union type for all step configurations
 * 所有步骤配置的联合类型
 */
type StepConfig = TransformStepConfig | Step3DConfig;

/**
 * Find a step by name in the steps array
 * 在步骤数组中按名称查找步骤
 *
 * @param steps - Array of step configurations or legacy object format
 * @param name - Step name to find
 * @returns Step configuration or undefined
 */
function findStepByName<T extends StepConfig>(
  steps: unknown,
  name: string
): Partial<Omit<T, 'name'>> {
  // Handle array format (new)
  if (Array.isArray(steps)) {
    const step = steps.find((s) => s && typeof s === 'object' && s.name === name);
    return step || {};
  }
  // Handle object format (legacy fallback)
  if (steps && typeof steps === 'object') {
    const legacySteps = steps as Record<string, unknown>;
    return (legacySteps[name] as Partial<Omit<T, 'name'>>) || {};
  }
  return {};
}

/**
 * Input parameters for Fig Me tool
 * Fig Me 工具的输入参数
 */
interface FigMeInput {
  /** Which step to execute: 'transform' or '3d' */
  step: 'transform' | '3d';
  /** Source image URL (user's uploaded photo) */
  imageUrl: string;
  /** Reference image URL for style guidance (user-selected from configJson.referenceImages) */
  referenceImageUrl?: string;
  /** Optional user prompt to customize the transformation */
  userPrompt?: string;
}

/**
 * Process Fig Me task
 * 处理 Fig Me 任务
 *
 * Routes to appropriate step handler based on inputParams.step
 * 根据 inputParams.step 路由到相应的步骤处理器
 *
 * @param ctx - Tool context with task info and job
 * @returns Tool result with output URL and usage data
 */
export async function processFigMe(ctx: ToolContext): Promise<ToolResult> {
  const { inputParams } = ctx;
  const { step } = inputParams as unknown as FigMeInput;

  if (!step) {
    throw new Error('step is required for Fig Me tool (transform or 3d)');
  }

  logger.info(`Processing Fig Me step: ${step}`, { taskId: ctx.taskId });

  switch (step) {
    case 'transform':
      return processTransformStep(ctx);
    case '3d':
      return process3DStep(ctx);
    default:
      throw new Error(`Unknown Fig Me step: ${step}. Expected 'transform' or '3d'`);
  }
}

/**
 * Process transform step - Convert user photo to figurine style
 * 处理转换步骤 - 将用户照片转换为人偶风格
 *
 * Uses OpenAI Responses API with gpt-image-1.5 for image-to-image transformation.
 * - User's uploaded photo is used as the source image
 * - User-selected reference image provides style guidance
 * - Admin-configured parameters control model, quality, size, format, etc.
 *
 * 使用 OpenAI Responses API 和 gpt-image-1.5 进行图像转换。
 * - 用户上传的照片作为源图像
 * - 用户选择的参考图像提供风格指导
 * - 管理员配置的参数控制模型、质量、尺寸、格式等
 *
 * @see https://platform.openai.com/docs/guides/image-generation
 */
async function processTransformStep(ctx: ToolContext): Promise<ToolResult> {
  const { taskId, userId, toolSlug, inputParams, toolConfig, job } = ctx;
  const { imageUrl, referenceImageUrl, userPrompt } = inputParams as unknown as FigMeInput;

  if (!imageUrl) {
    throw new Error('imageUrl is required for transform step');
  }

  // Get step config from toolConfig.steps array (or legacy object format)
  const stepConfig = findStepByName<TransformStepConfig>(toolConfig?.steps, 'transform');

  // Read models from config
  // model: orchestration model for Responses API (default: gpt-4o)
  // imageModel: image generation model (default: gpt-image-1.5)
  const model = stepConfig.model || 'gpt-4o';
  const imageModel = stepConfig.imageModel || 'gpt-image-1.5';

  logger.info(`Processing Fig Me transform`, {
    taskId,
    model,
    imageModel,
    imageUrl: imageUrl.substring(0, 50) + '...',
    hasReferenceImage: !!referenceImageUrl,
    hasSystemPrompt: !!stepConfig.systemPrompt,
  });

  // Get provider credentials
  const credentials = await getProviderCredentials('openai');

  await job.updateProgress(10);

  // Build prompt - describes the transformation to apply
  const systemPrompt = stepConfig.systemPrompt ||
    'Transform this photo into a cute 3D figurine style character. Make it colorful, toy-like, with smooth surfaces suitable for 3D printing. Keep the person\'s distinctive features but stylize them in a chibi/kawaii aesthetic.';
  const fullPrompt = userPrompt
    ? `${systemPrompt}\n\nUser request: ${userPrompt}`
    : systemPrompt;

  // Initialize OpenAI client
  const openai = new OpenAI({ apiKey: credentials.apiKey });

  await job.updateProgress(15);

  // Build input content array for Responses API
  // Pass fully qualified URLs directly - no need to download/convert to base64
  // Add text labels between images for clarity
  type InputContent =
    | { type: 'input_text'; text: string }
    | { type: 'input_image'; image_url: string; detail: 'auto' | 'low' | 'high' };

  const inputContent: InputContent[] = [
    { type: 'input_text', text: fullPrompt },
    { type: 'input_text', text: '[UploadImage]' },
    { type: 'input_image', image_url: imageUrl, detail: 'auto' },
  ];

  // Add reference image if provided
  if (referenceImageUrl) {
    inputContent.push({ type: 'input_text', text: '[ReferenceImage]' });
    inputContent.push({ type: 'input_image', image_url: referenceImageUrl, detail: 'auto' });
  }

  logger.debug(`Prepared input for OpenAI Responses API`, {
    taskId,
    imageCount: inputContent.filter(c => c.type === 'input_image').length,
  });

  await job.updateProgress(20);

  // Build generation parameters from stepConfig
  const outputFormat = stepConfig.format || 'png';
  const size = stepConfig.size || 'auto';
  const quality = stepConfig.quality || 'auto';
  const background = stepConfig.background || 'auto';

  logger.debug(`Calling OpenAI Responses API`, { taskId, model, imageModel });
  const startTime = Date.now();

  // Build request payload for logging
  const requestPayload = {
    model,
    input: [
      {
        role: 'user',
        content: inputContent,
      },
    ],
    tools: [{
      type: 'image_generation',
      model: imageModel,
      size,
      quality,
      background,
      output_format: outputFormat,
    }],
  };

  // Call OpenAI Responses API with image_generation tool
  // @see https://platform.openai.com/docs/guides/image-generation
  const response = await openai.responses.create({
    model,
    input: [
      {
        role: 'user',
        content: inputContent,
      },
    ],
    tools: [{
      type: 'image_generation',
      // Cast to expected type - SDK types may be outdated but API supports gpt-image-1.5
      model: imageModel as 'gpt-image-1',
      size: size as '1024x1024' | '1024x1536' | '1536x1024' | 'auto',
      quality: quality as 'low' | 'medium' | 'high' | 'auto',
      background: background as 'transparent' | 'opaque' | 'auto',
      output_format: outputFormat as 'png' | 'webp' | 'jpeg',
    }],
  });

  const apiLatencyMs = Date.now() - startTime;
  logger.debug(`OpenAI Responses API responded`, { taskId, latencyMs: apiLatencyMs });

  // Save raw request/response for debugging and auditing
  // Sanitize response to remove large base64 data
  await saveTaskResponse({
    taskId,
    stepName: 'transform',
    provider: 'openai',
    model: `${model}/${imageModel}`,
    rawRequest: requestPayload,
    rawResponse: sanitizeResponse(response),
    latencyMs: apiLatencyMs,
    statusCode: 200,
  });

  await job.updateProgress(70);

  // Extract image data from response.output
  // Filter for image_generation_call outputs and get the result (base64)
  const imageOutputs = response.output.filter(
    (output: { type: string }) => output.type === 'image_generation_call'
  );

  if (imageOutputs.length === 0) {
    // Check if there's a text response (error or message)
    const textOutput = response.output.find(
      (output: { type: string }) => output.type === 'message'
    );
    if (textOutput) {
      logger.error(`OpenAI returned message instead of image`, { taskId, output: textOutput });
    }
    throw new Error('No image returned from OpenAI Responses API');
  }

  // Get the base64 image from the first image_generation_call result
  const imageBase64 = (imageOutputs[0] as { type: string; result: string }).result;

  // Upload to S3
  const mimeType = outputFormat === 'jpeg' ? 'image/jpeg' : outputFormat === 'webp' ? 'image/webp' : 'image/png';
  const resultUrl = await uploadBase64Image(
    userId,
    taskId,
    imageBase64,
    mimeType,
    toolSlug
  );

  logger.debug(`Uploaded transform result to S3`, { taskId, resultUrl });

  await job.updateProgress(100);

  return {
    outputData: {
      resultUrl,
      provider: 'openai',
      model,
      imageModel,
      step: 'transform',
      format: outputFormat,
    },
    usageData: {
      provider: 'openai',
      model,
      imageModel,
      apiLatencyMs,
    },
  };
}

/**
 * Process 3D generation step - Generate 3D model from transformed image
 * 处理3D生成步骤 - 从转换后的图像生成3D模型
 *
 * Uses magi-3d SDK with Tripo or Hunyuan provider for 3D model generation.
 * Provider is selected via configJson.steps[].provider ('3d_tripo' or '3d_hunyuan').
 * Uses blocking polling with 5-second intervals to check progress.
 * Downloads the generated model and re-uploads to S3 for persistence.
 * 使用 magi-3d SDK 和 Tripo 或 Hunyuan 提供商生成 3D 模型。
 * 通过 configJson.steps[].provider 选择提供商（'3d_tripo' 或 '3d_hunyuan'）。
 * 使用5秒间隔的阻塞轮询检查进度。
 * 下载生成的模型并重新上传到 S3 以持久化存储。
 */
async function process3DStep(ctx: ToolContext): Promise<ToolResult> {
  const { taskId, userId, toolSlug, inputParams, toolConfig, job } = ctx;
  const { imageUrl } = inputParams as unknown as FigMeInput;

  if (!imageUrl) {
    throw new Error('imageUrl is required for 3D generation step');
  }

  // Get step config from toolConfig.steps array (or legacy object format)
  const stepConfig = findStepByName<Step3DConfig>(toolConfig?.steps, '3d');
  const providerSlug = stepConfig.provider || '3d_tripo';
  const outputFormat = stepConfig.format || 'glb';
  const providerOptions = stepConfig.providerOptions || {};

  logger.info(`Processing Fig Me 3D generation`, {
    taskId,
    provider: providerSlug,
    format: outputFormat,
    imageUrl: imageUrl.substring(0, 50) + '...',
    providerOptions,
  });

  await job.updateProgress(5);

  // Get provider credentials from database
  const credentials = await getProviderCredentials(providerSlug);

  await job.updateProgress(10);

  // Create appropriate SDK provider based on provider slug
  let sdkProvider: TripoProvider | HunyuanProvider;
  let providerName: string;

  if (providerSlug === '3d_hunyuan') {
    // Hunyuan uses secretId + secretKey + region
    if (!credentials.accessKeyId || !credentials.secretAccessKey) {
      throw new Error('Hunyuan provider requires accessKeyId (secretId) and secretAccessKey (secretKey)');
    }
    sdkProvider = new HunyuanProvider({
      secretId: credentials.accessKeyId,
      secretKey: credentials.secretAccessKey,
      region: credentials.region || 'ap-guangzhou',
    });
    providerName = 'hunyuan';
  } else {
    // Tripo uses apiKey
    if (!credentials.apiKey) {
      throw new Error('Tripo provider requires apiKey');
    }
    sdkProvider = new TripoProvider({
      apiKey: credentials.apiKey,
    });
    providerName = 'tripo';
  }

  // Create client
  const client = new Magi3DClient(sdkProvider);

  await job.updateProgress(15);

  logger.debug(`Creating 3D generation task with ${providerName}`, { taskId });
  const startTime = Date.now();

  // Build request payload for logging
  const requestPayload = {
    type: TaskType.IMAGE_TO_3D,
    input: imageUrl,
    providerOptions,
  };

  // Create the 3D generation task
  const sdkTaskId = await client.createTask({
    type: TaskType.IMAGE_TO_3D,
    input: imageUrl,
    providerOptions,
  });

  logger.info(`Created 3D task, polling for completion`, {
    taskId,
    sdkTaskId,
    provider: providerName,
  });

  await job.updateProgress(20);

  // Poll for completion with progress updates
  // Progress range: 20-80% during 3D generation
  // Uses 5-second polling interval
  const result = await client.pollUntilDone(sdkTaskId, {
    interval: 5000, // 5 seconds between polls
    onProgress: async (task) => {
      // Map SDK progress (0-100) to our range (20-80)
      const mappedProgress = 20 + Math.floor(task.progress * 0.6);
      await job.updateProgress(mappedProgress);
      logger.debug(`3D generation progress: ${task.progress}%`, {
        taskId,
        sdkTaskId,
        status: task.status,
        progressDetail: task.progressDetail,
      });
    },
  });

  const apiLatencyMs = Date.now() - startTime;

  logger.info(`3D generation completed`, {
    taskId,
    sdkTaskId,
    status: result.status,
    latencyMs: apiLatencyMs,
  });

  await job.updateProgress(85);

  // Check if task succeeded
  if (result.status !== TaskStatus.SUCCEEDED) {
    // Save error response
    await saveTaskResponse({
      taskId,
      stepName: '3d',
      provider: providerSlug,
      model: providerName,
      rawRequest: requestPayload,
      rawResponse: sanitizeResponse(result.rawResponse),
      latencyMs: apiLatencyMs,
      errorMessage: result.error?.message || 'Unknown error',
    });
    throw new Error(`3D generation failed: ${result.error?.message || 'Unknown error'}`);
  }

  // Get the model URL from result
  const modelUrl = result.result?.model;
  if (!modelUrl) {
    throw new Error('3D generation succeeded but no model URL returned');
  }

  logger.debug(`Downloading 3D model from provider`, {
    taskId,
    modelUrl: modelUrl.substring(0, 100) + '...',
  });

  // Download and re-upload to S3 (provider URLs may expire)
  const resultUrl = await downloadAndUpload(
    userId,
    taskId,
    modelUrl,
    outputFormat,
    toolSlug
  );

  logger.info(`3D model uploaded to S3`, { taskId, resultUrl });

  await job.updateProgress(95);

  // Save raw request/response for debugging and auditing
  await saveTaskResponse({
    taskId,
    stepName: '3d',
    provider: providerSlug,
    model: providerName,
    rawRequest: requestPayload,
    rawResponse: sanitizeResponse(result.rawResponse),
    latencyMs: apiLatencyMs,
    statusCode: 200,
  });

  await job.updateProgress(100);

  return {
    outputData: {
      resultUrl,
      providerModelUrl: modelUrl, // Original provider URL for reference
      provider: providerSlug,
      model: providerName,
      step: '3d',
      format: outputFormat,
      sdkTaskId,
      thumbnail: result.result?.thumbnail,
    },
    usageData: {
      provider: providerSlug,
      model: providerName,
      apiLatencyMs,
      sdkTaskId,
    },
  };
}
