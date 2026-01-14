/**
 * @fileoverview Image Rerenderer Component
 * @fileoverview 图像重渲染组件
 *
 * UI component for transforming images using AI with text prompts.
 * Uses ImageSourcePicker, PromptEditor, and ResultActions.
 * 使用AI根据文本提示转换图像的UI组件。
 * 使用ImageSourcePicker选择图片、PromptEditor编辑提示词、ResultActions操作栏。
 *
 * @module components/ai/image-rerenderer
 */

'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { rerenderImage } from '@/lib/actions/ai';
import { ImageSourcePicker, type SelectedImage } from './image-source-picker';
import { PromptEditor, type PromptPreset } from './prompt-editor';
import { ResultActions } from './result-actions';

const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'enhance',
    label: 'Enhance',
    prompt: 'Enhance this image with professional lighting, vivid colors, and sharp details while maintaining the original composition',
  },
  {
    id: 'artistic',
    label: 'Artistic',
    prompt: 'Transform into a beautiful artistic painting with expressive brushstrokes and rich textures',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    prompt: 'Apply cinematic color grading with dramatic lighting, film grain, and a moody atmosphere',
  },
  {
    id: 'anime',
    label: 'Anime Style',
    prompt: 'Convert to high-quality anime style illustration with clean lines and vibrant colors',
  },
];

interface ImageRerendererProps {
  onComplete?: (result: { base64?: string; url?: string }) => void;
}

export function ImageRerenderer({ onComplete }: ImageRerendererProps) {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [prompt, setPrompt] = useState(PROMPT_PRESETS[0].prompt);
  const [strength, setStrength] = useState(0.75);
  const [resultBase64, setResultBase64] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const handleImageChange = (image: SelectedImage | null) => {
    setSelectedImage(image);
    setResultBase64('');
    setError('');
  };

  const handleProcess = () => {
    if (!selectedImage) {
      setError('Please select an image');
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setError('');
    setResultBase64('');

    startTransition(async () => {
      const result = await rerenderImage({
        imageUrl: selectedImage.url,
        prompt,
        strength,
      });

      if (result.success && result.base64) {
        setResultBase64(result.base64);
        onComplete?.({ base64: result.base64, url: result.url });
      } else {
        setError(result.error || 'Failed to rerender image');
      }
    });
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPrompt(PROMPT_PRESETS[0].prompt);
    setStrength(0.75);
    setResultBase64('');
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Image Source */}
      <ImageSourcePicker
        value={selectedImage}
        onChange={handleImageChange}
        disabled={isPending}
      />

      {/* Prompt Editor */}
      {selectedImage && (
        <PromptEditor
          value={prompt}
          onChange={setPrompt}
          presets={PROMPT_PRESETS}
          label="Transformation Prompt"
          description="Describe how you want to transform the image. Use a preset as a starting point or write your own."
          placeholder="Describe the transformation..."
          disabled={isPending}
        />
      )}

      {/* Strength & Process Button */}
      {selectedImage && !resultBase64 && (
        <div className="flex gap-6 items-end">
          <div className="flex-1 max-w-xs">
            <label className="text-sm text-muted-foreground mb-2 block">
              Transformation Strength: {Math.round(strength * 100)}%
            </label>
            <Slider
              value={[strength]}
              onValueChange={(value) => {
                const val = Array.isArray(value) ? value[0] : value;
                setStrength(val);
              }}
              min={0.1}
              max={1}
              step={0.05}
              disabled={isPending}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lower = subtle changes, Higher = dramatic transformation
            </p>
          </div>

          <Button
            onClick={handleProcess}
            disabled={!prompt.trim() || isPending}
            size="lg"
          >
            {isPending ? 'Transforming...' : 'Transform Image'}
          </Button>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Result */}
      {(isPending || resultBase64) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Original */}
          {selectedImage && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Original
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                  <img
                    src={selectedImage.url}
                    alt="Original"
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Transformed Result */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Transformed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {isPending ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Transforming...</span>
                  </div>
                ) : resultBase64 ? (
                  <img
                    src={`data:image/png;base64,${resultBase64}`}
                    alt="Transformed"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Result will appear here
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Actions */}
      {resultBase64 && (
        <ResultActions
          base64={resultBase64}
          filename="transformed-image.png"
          onReset={handleReset}
        />
      )}
    </div>
  );
}
