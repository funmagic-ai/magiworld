/**
 * @fileoverview Background Remover Component
 * @fileoverview 背景移除组件
 *
 * UI component for removing backgrounds from images using AI.
 * Uses task-based async processing with real-time progress updates.
 * 使用AI从图片中移除背景的UI组件。
 * 使用基于任务的异步处理和实时进度更新。
 *
 * @module components/ai/background-remover
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageSourcePicker, type SelectedImage } from './image-source-picker';
import { ResultActions } from './result-actions';
import { useTask } from './hooks/use-task';

interface BackgroundRemoverProps {
  onComplete?: (result: { url?: string }) => void;
}

export function BackgroundRemover({ onComplete }: BackgroundRemoverProps) {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
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
      toolSlug: 'background-remove',
      inputParams: { imageUrl: selectedImage.url },
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

      {/* Process Button */}
      {selectedImage && !resultUrl && !isProcessing && (
        <div className="flex justify-end gap-2">
          <Button
            onClick={handleProcess}
            disabled={isProcessing}
            size="lg"
          >
            Remove Background
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

          {/* Result */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Result {isProcessing && `(${task.progress}%)`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="aspect-square rounded-lg overflow-hidden flex items-center justify-center"
                style={{
                  backgroundImage: 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                }}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Processing... {task.progress}%</span>
                  </div>
                ) : resultUrl ? (
                  <img
                    src={resultUrl}
                    alt="Result"
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
          filename="background-removed.png"
          onReset={handleReset}
        />
      )}
    </div>
  );
}
