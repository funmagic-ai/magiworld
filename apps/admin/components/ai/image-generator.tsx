/**
 * @fileoverview Image Generator Component
 * @fileoverview 图像生成组件
 *
 * UI component for generating images from text prompts using AI.
 * Uses PromptEditor with presets and ResultActions for actions.
 * 使用AI根据文本提示生成图像的UI组件。
 * 使用带预设的PromptEditor和ResultActions操作栏。
 *
 * @module components/ai/image-generator
 */

'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateImage } from '@/lib/actions/ai';
import { PromptEditor, type PromptPreset } from './prompt-editor';
import { ResultActions } from './result-actions';

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square (1:1)' },
  { value: '16:9', label: 'Landscape (16:9)' },
  { value: '9:16', label: 'Portrait (9:16)' },
  { value: '4:3', label: 'Standard (4:3)' },
  { value: '3:4', label: 'Portrait (3:4)' },
] as const;

const PROMPT_PRESETS: PromptPreset[] = [
  {
    id: 'product',
    label: 'Product Shot',
    prompt: 'Professional product photography, clean white background, studio lighting, high resolution, sharp focus',
  },
  {
    id: 'lifestyle',
    label: 'Lifestyle',
    prompt: 'Lifestyle photography, natural lighting, warm tones, candid moment, authentic atmosphere',
  },
  {
    id: 'abstract',
    label: 'Abstract',
    prompt: 'Abstract digital art, vibrant colors, geometric shapes, modern design, creative composition',
  },
  {
    id: 'nature',
    label: 'Nature',
    prompt: 'Beautiful nature photography, golden hour lighting, serene landscape, high detail, vivid colors',
  },
];

interface ImageGeneratorProps {
  onComplete?: (result: { base64?: string; url?: string }) => void;
}

export function ImageGenerator({ onComplete }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState(PROMPT_PRESETS[0].prompt);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const [resultBase64, setResultBase64] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setError('');
    setResultBase64('');

    startTransition(async () => {
      const result = await generateImage({ prompt, aspectRatio });

      if (result.success && result.base64) {
        setResultBase64(result.base64);
        onComplete?.({ base64: result.base64, url: result.url });
      } else {
        setError(result.error || 'Failed to generate image');
      }
    });
  };

  const handleReset = () => {
    setPrompt(PROMPT_PRESETS[0].prompt);
    setResultBase64('');
    setError('');
  };

  return (
    <div className="space-y-6">
      {/* Prompt Editor */}
      <PromptEditor
        value={prompt}
        onChange={setPrompt}
        presets={PROMPT_PRESETS}
        label="Generation Prompt"
        description="Describe the image you want to generate. Use a preset as a starting point or write your own."
        placeholder="Describe the image you want to generate..."
        disabled={isPending}
      />

      {/* Aspect Ratio & Generate Button */}
      <div className="flex gap-4 items-end">
        <div className="flex-1 max-w-xs">
          <label className="text-sm text-muted-foreground mb-2 block">
            Aspect Ratio
          </label>
          <Select
            value={aspectRatio}
            onValueChange={(value) => setAspectRatio(value as typeof aspectRatio)}
            disabled={isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASPECT_RATIOS.map((ratio) => (
                <SelectItem key={ratio.value} value={ratio.value}>
                  {ratio.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isPending}
          size="lg"
        >
          {isPending ? 'Generating...' : 'Generate Image'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Result */}
      {(isPending || resultBase64) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Result
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="aspect-square max-w-md mx-auto rounded-lg overflow-hidden flex items-center justify-center bg-muted"
            >
              {isPending ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Generating...</span>
                </div>
              ) : resultBase64 ? (
                <img
                  src={`data:image/png;base64,${resultBase64}`}
                  alt="Generated"
                  className="max-w-full max-h-full object-contain"
                />
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {resultBase64 && (
        <ResultActions
          base64={resultBase64}
          filename="generated-image.png"
          onReset={handleReset}
        />
      )}
    </div>
  );
}
