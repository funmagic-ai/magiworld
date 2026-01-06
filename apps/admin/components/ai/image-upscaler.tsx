'use client';

/**
 * @fileoverview Image Upscaler Component
 *
 * UI component for upscaling images to higher resolution using AI.
 * Uses ImageSourcePicker for input and ResultActions for actions.
 *
 * @module apps/admin/components/ai/image-upscaler
 */

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { upscaleImage } from '@/lib/actions/ai';
import { ImageSourcePicker, type SelectedImage } from './image-source-picker';
import { ResultActions } from './result-actions';

interface ImageUpscalerProps {
  onComplete?: (result: { base64?: string; url?: string }) => void;
}

export function ImageUpscaler({ onComplete }: ImageUpscalerProps) {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  const [scale, setScale] = useState<2 | 4>(2);
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

    setError('');
    setResultBase64('');

    startTransition(async () => {
      const result = await upscaleImage({ imageUrl: selectedImage.url, scale });

      if (result.success && result.base64) {
        setResultBase64(result.base64);
        onComplete?.({ base64: result.base64, url: result.url });
      } else {
        setError(result.error || 'Failed to upscale image');
      }
    });
  };

  const handleReset = () => {
    setSelectedImage(null);
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

      {/* Scale & Process Button */}
      {selectedImage && !resultBase64 && (
        <div className="flex gap-4 items-end justify-end">
          <div className="w-32">
            <label className="text-sm text-muted-foreground mb-2 block">
              Scale
            </label>
            <Select
              value={scale.toString()}
              onValueChange={(value) => setScale(Number(value) as 2 | 4)}
              disabled={isPending}
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
            disabled={isPending}
            size="lg"
          >
            {isPending ? 'Upscaling...' : 'Upscale Image'}
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

          {/* Upscaled Result */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Upscaled ({scale}x)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {isPending ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Upscaling...</span>
                  </div>
                ) : resultBase64 ? (
                  <img
                    src={`data:image/png;base64,${resultBase64}`}
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
      {resultBase64 && (
        <ResultActions
          base64={resultBase64}
          filename={`upscaled-${scale}x.png`}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
