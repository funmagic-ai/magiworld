'use client';

/**
 * @fileoverview Background Remover Component
 *
 * UI component for removing backgrounds from images using AI.
 * Supports upload and library selection with before/after comparison.
 *
 * @module apps/admin/components/ai/background-remover
 */

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { removeBackground } from '@/lib/actions/ai';
import { ImageSourcePicker, type SelectedImage } from './image-source-picker';
import { ResultActions } from './result-actions';

interface BackgroundRemoverProps {
  onComplete?: (result: { base64?: string; url?: string }) => void;
}

export function BackgroundRemover({ onComplete }: BackgroundRemoverProps) {
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
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
      const result = await removeBackground(selectedImage.url);

      if (result.success && result.base64) {
        setResultBase64(result.base64);
        onComplete?.({ base64: result.base64, url: result.url });
      } else {
        setError(result.error || 'Failed to process image');
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

      {/* Process Button */}
      {selectedImage && !resultBase64 && (
        <div className="flex justify-end">
          <Button
            onClick={handleProcess}
            disabled={isPending}
            size="lg"
          >
            {isPending ? 'Processing...' : 'Remove Background'}
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

          {/* Result */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Result
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
                {isPending ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm">Processing...</span>
                  </div>
                ) : resultBase64 ? (
                  <img
                    src={`data:image/png;base64,${resultBase64}`}
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
      {resultBase64 && (
        <ResultActions
          base64={resultBase64}
          filename="background-removed.png"
          onReset={handleReset}
        />
      )}
    </div>
  );
}
