'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ImageUploader } from './image-uploader';
import { ResultPreview } from './result-preview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type ToolData = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  toolType: {
    slug: string;
    name: string;
    badgeColor: string;
  };
};

interface BackgroundRemoveInterfaceProps {
  tool: ToolData;
}

type ProcessingState = 'idle' | 'processing' | 'completed' | 'error';

export function BackgroundRemoveInterface({ tool }: BackgroundRemoveInterfaceProps) {
  const t = useTranslations('bgRemove');
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [state, setState] = useState<ProcessingState>('idle');

  const handleImageSelect = (imageDataUrl: string) => {
    setInputImage(imageDataUrl);
    setResultImage(null);
    setState('idle');
  };

  const handleProcess = async () => {
    if (!inputImage) return;

    setState('processing');

    // Mock processing - 2 second delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Mock result - use the same image with a transparent background simulation
    // In production, this would call the fal.ai API
    setResultImage(inputImage);
    setState('completed');
  };

  const handleReset = () => {
    setInputImage(null);
    setResultImage(null);
    setState('idle');
  };

  const handleDownload = () => {
    if (!resultImage) return;

    const link = document.createElement('a');
    link.href = resultImage;
    link.download = 'background-removed.png';
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{tool.title}</h1>
          <Badge variant={tool.toolType.badgeColor as 'default' | 'secondary' | 'outline'}>
            {tool.toolType.name}
          </Badge>
        </div>
        {tool.description && (
          <p className="text-muted-foreground">{tool.description}</p>
        )}
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Left: Upload Area */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium">{t('upload.title')}</h2>
          <ImageUploader
            onImageSelect={handleImageSelect}
            previewUrl={inputImage}
            disabled={state === 'processing'}
          />
        </div>

        {/* Right: Result Area */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium">{t('result.title')}</h2>
          <ResultPreview
            originalImage={inputImage}
            resultImage={resultImage}
            isProcessing={state === 'processing'}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        {state === 'idle' && inputImage && (
          <Button onClick={handleProcess} size="lg">
            {t('actions.process')}
          </Button>
        )}
        {state === 'processing' && (
          <Button disabled size="lg">
            <LoadingSpinner className="mr-2 h-4 w-4" />
            {t('actions.processing')}
          </Button>
        )}
        {state === 'completed' && (
          <>
            <Button onClick={handleDownload} size="lg">
              {t('actions.download')}
            </Button>
            <Button onClick={handleReset} variant="outline" size="lg">
              {t('actions.tryAnother')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
