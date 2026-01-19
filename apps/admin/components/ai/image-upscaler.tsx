/**
 * @fileoverview Image Upscaler Component
 * @fileoverview 图像放大组件
 *
 * UI component for upscaling images to higher resolution using AI.
 * Uses task-based async processing with real-time progress updates.
 * 使用AI将图像放大到更高分辨率的UI组件。
 * 使用基于任务的异步处理和实时进度更新。
 *
 * @module components/ai/image-upscaler
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
import { ImageSourcePicker, type SelectedImage } from './image-source-picker';
import { ResultActions } from './result-actions';
import { useTask } from './hooks/use-task';

interface ImageUpscalerProps {
  onComplete?: (result: { url?: string }) => void;
}

export function ImageUpscaler({ onComplete }: ImageUpscalerProps) {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [scale, setScale] = useState<2 | 4>(2);
  const task = useTask();

  const handleImageChange = (image: SelectedImage | null) => {
    setSelectedImage(image);
    task.reset();
  };

  const handleProcess = async () => {
    if (!selectedImage) {
      return;
    }

    await task.createTask({
      toolSlug: 'image-upscale',
      inputParams: { imageUrl: selectedImage.url, scale },
    });
  };

  const handleReset = () => {
    setSelectedImage(null);
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
      {/* Image Source */}
      <ImageSourcePicker
        value={selectedImage}
        onChange={handleImageChange}
        disabled={isProcessing}
      />

      {/* Scale & Process Button */}
      {selectedImage && !resultUrl && !isProcessing && (
        <div className="flex gap-4 items-end justify-end">
          <div className="w-32">
            <label className="text-sm text-muted-foreground mb-2 block">
              Scale
            </label>
            <Select
              value={scale.toString()}
              onValueChange={(value) => setScale(Number(value) as 2 | 4)}
              disabled={isProcessing}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2x</SelectItem>
                <SelectItem value="4">4x</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleProcess}
            disabled={isProcessing}
            size="lg"
          >
            Upscale Image
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

          {/* Upscaled Result */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upscaled ({scale}x) {isProcessing && `(${task.progress}%)`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Upscaling... {task.progress}%</span>
                  </div>
                ) : resultUrl ? (
                  <img
                    src={resultUrl}
                    alt="Upscaled"
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
      {resultUrl && (
        <ResultActions
          url={resultUrl}
          filename={`upscaled-${scale}x.png`}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
