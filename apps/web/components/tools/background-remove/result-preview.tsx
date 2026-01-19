
'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Download04Icon,
  Copy01Icon,
  Image01Icon,
  ArrowLeft02Icon,
  FavouriteIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { ProgressBar } from '../shared/progress-bar';

interface ResultPreviewProps {
  originalImage: string | null;
  resultImage: string | null;
  isProcessing: boolean;
  progress?: number;
  isSaved?: boolean;
  onCancel?: () => void;
  onDownload?: () => void;
  onCopy?: () => void;
  onUseAsInput?: () => void;
  onSave?: () => void;
}

export function ResultPreview({
  originalImage,
  resultImage,
  isProcessing,
  progress = 0,
  isSaved = false,
  onCancel,
  onDownload,
  onCopy,
  onUseAsInput,
  onSave,
}: ResultPreviewProps) {
  const t = useTranslations('bgRemove.result');
  const tAssets = useTranslations('assets');

  if (isProcessing) {
    return (
      <div className="relative w-full h-full min-h-[200px] rounded-lg border bg-muted/20 flex items-center justify-center">
        <ProgressBar
          progress={progress}
          onCancel={onCancel}
          message={t('processing')}
        />
      </div>
    );
  }

  if (resultImage) {
    return (
      <div className="relative w-full h-full min-h-[200px] flex flex-col">
        <div
          className="flex-1 rounded-lg border overflow-hidden"
          style={{
            backgroundImage: `
              linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%),
              linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%),
              linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)
            `,
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          }}
        >
          <img
            src={resultImage}
            alt="Result"
            className="w-full h-full object-contain p-2"
          />
        </div>

        <div className="flex justify-center gap-2 mt-3">
          {onSave && (
            <Button
              onClick={onSave}
              variant={isSaved ? 'secondary' : 'outline'}
              size="sm"
              className="text-xs h-8 gap-1.5"
              disabled={isSaved}
            >
              <HugeiconsIcon icon={isSaved ? Tick02Icon : FavouriteIcon} className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {isSaved ? tAssets('saved') : tAssets('saveToAssets')}
              </span>
            </Button>
          )}
          {onUseAsInput && (
            <Button
              onClick={onUseAsInput}
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
            >
              <HugeiconsIcon icon={ArrowLeft02Icon} className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Use as Input</span>
            </Button>
          )}
          {onCopy && (
            <Button
              onClick={onCopy}
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
            >
              <HugeiconsIcon icon={Copy01Icon} className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
          )}
          {onDownload && (
            <Button
              onClick={onDownload}
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
            >
              <HugeiconsIcon icon={Download04Icon} className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[200px] rounded-lg border bg-muted/20 flex items-center justify-center">
      <div className="text-center space-y-3 p-4">
        <div className="p-4 rounded-full bg-muted/50 mx-auto w-fit">
          <HugeiconsIcon
            icon={Image01Icon}
            className="w-10 h-10 text-muted-foreground"
            strokeWidth={1.5}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {originalImage ? t('readyToProcess') : t('uploadFirst')}
        </p>
      </div>
    </div>
  );
}
