/**
 * @fileoverview Nanobanana Pro Image Generation Tool
 *
 * Generate images using Google Gemini 3 Pro Image model.
 * Uses generateText with responseModalities: ['TEXT', 'IMAGE']
 *
 * @module apps/admin/lib/ai/tools/nanobanana-pro
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { createLogger } from '@magiworld/utils';

const logger = createLogger('nanobanana-pro');

const MODEL_ID = 'gemini-3-pro-image-preview';

export type NanobananaAspectRatio =
  | '1:1'
  | '3:4'
  | '4:3'
  | '9:16'
  | '16:9'
  | '21:9';

export type NanobananaImageSize = '1K' | '2K' | '4K';

export interface NanobananaOptions {
  aspectRatio?: NanobananaAspectRatio;
  imageSize?: NanobananaImageSize;
}

export interface NanobananaInputImage {
  base64: string;
  mediaType: string;
}

export interface NanobananaImage {
  base64: string;
  mediaType: string;
}

export interface NanobananaResult {
  images: NanobananaImage[];
  text: string;
}

/**
 * Generate images using Nanobanana Pro (gemini-3-pro-image-preview)
 */
export async function generateNanobanana(
  prompt: string,
  options: NanobananaOptions = {},
  inputImages?: NanobananaInputImage[]
): Promise<NanobananaResult> {
  const startTime = Date.now();

  // Log request
  logger.info(
    { prompt, options, inputImageCount: inputImages?.length ?? 0 },
    'Nanobanana request'
  );

  // Build message content
  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image'; image: URL | string };

  const contentParts: ContentPart[] = [{ type: 'text', text: prompt }];

  // Add input images if provided
  if (inputImages && inputImages.length > 0) {
    for (const img of inputImages) {
      const dataUrl = img.base64.startsWith('data:')
        ? img.base64
        : `data:${img.mediaType || 'image/png'};base64,${img.base64}`;
      contentParts.push({ type: 'image', image: dataUrl });
    }
  }

  // Call generateText
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

  // Log full response for observation
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

  // Extract images
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
