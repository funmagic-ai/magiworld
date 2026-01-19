/**
 * @fileoverview Image Generator Component
 * @fileoverview 图像生成组件
 *
 * UI component for generating images from text prompts using AI.
 * Uses task-based async processing with real-time progress updates.
 * 使用AI根据文本提示生成图像的UI组件。
 * 使用基于任务的异步处理和实时进度更新。
 *
 * @module components/ai/image-generator
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PromptEditor, type PromptPreset } from './prompt-editor';
import { ResultActions } from './result-actions';
import { useTask } from './hooks/use-task';

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
  onComplete?: (result: { url?: string }) => void;
}

export function ImageGenerator({ onComplete }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState(PROMPT_PRESETS[0].prompt);
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'>('1:1');
  const task = useTask();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      return;
    }

    await task.createTask({
      toolSlug: 'image-generate',
      inputParams: { prompt, aspectRatio },
    });
  };

  const handleReset = () => {
    setPrompt(PROMPT_PRESETS[0].prompt);
    task.reset();
  };

  // Call onComplete when task succeeds
  useEffect(() => {
    if (task.status === 'success' && task.outputData?.resultUrl) {
      onComplete?.({ url: task.outputData.resultUrl });
    }
  }, [task.status, task.outputData, onComplete]);

  const resultUrl = task.outputData?.resultUrl as string | undefined;
  const isProcessing = task.isLoading;
  const showResult = isProcessing || resultUrl;

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
        disabled={isProcessing}
      />

      {/* Aspect Ratio & Generate Button */}
      {!resultUrl && !isProcessing && (
        <div className="flex gap-4 items-end">
          <div className="flex-1 max-w-xs">
            <label id="aspect-ratio-label" className="text-sm text-muted-foreground mb-2 block">
              Aspect Ratio
            </label>
            <Select
              aria-labelledby="aspect-ratio-label"
              value={aspectRatio}
              onValueChange={(value) => setAspectRatio(value as typeof aspectRatio)}
              disabled={isProcessing}
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
            disabled={!prompt.trim() || isProcessing}
            size="lg"
          >
            Generate Image
          </Button>
        </div>
      )}

      {/* Cancel Button during processing */}
      {isProcessing && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={task.cancel}
            size="lg"
          >
            Cancel
          </Button>
        </div>
      )}

      {task.error && (
        <p className="text-sm text-destructive">{task.error}</p>
      )}

      {/* Result */}
      {showResult && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Result {isProcessing && `(${task.progress}%)`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="aspect-square max-w-md mx-auto rounded-lg overflow-hidden flex items-center justify-center bg-muted"
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Generating... {task.progress}%</span>
                </div>
              ) : resultUrl ? (
                <img
                  src={resultUrl}
                  alt="Generated"
                  className="max-w-full max-h-full object-contain"
                />
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {resultUrl && (
        <ResultActions
          url={resultUrl}
          filename="generated-image.png"
          onReset={handleReset}
        />
      )}
    </div>
  );
}
