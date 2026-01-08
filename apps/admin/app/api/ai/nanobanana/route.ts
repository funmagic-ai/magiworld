/**
 * @fileoverview Nanobanana Pro API Route
 *
 * POST /api/ai/nanobanana - Generate images using Gemini 3 Pro Image
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateNanobanana } from '@/lib/ai/tools/nanobanana-pro';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, options, inputImages } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'prompt is required' },
        { status: 400 }
      );
    }

    const result = await generateNanobanana(prompt, options, inputImages);

    // Return images as data URLs for easy display
    const images = result.images.map((img) => ({
      dataUrl: `data:${img.mediaType};base64,${img.base64}`,
      mediaType: img.mediaType,
    }));

    return NextResponse.json({
      success: true,
      text: result.text,
      images,
    });
  } catch (error) {
    console.error('[Nanobanana API Error]', error);

    return NextResponse.json(
      {
        error: 'Generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
