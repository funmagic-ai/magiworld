'use client';

import { useTranslations } from 'next-intl';

interface ResultPreviewProps {
  originalImage: string | null;
  resultImage: string | null;
  isProcessing: boolean;
}

export function ResultPreview({ originalImage, resultImage, isProcessing }: ResultPreviewProps) {
  const t = useTranslations('bgRemove.result');

  // Show processing state
  if (isProcessing) {
    return (
      <div className="aspect-square w-full rounded-lg border bg-muted/50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <ProcessingSpinner className="h-12 w-12 mx-auto text-primary" />
          <p className="text-sm text-muted-foreground">{t('processing')}</p>
        </div>
      </div>
    );
  }

  // Show result with transparent background pattern
  if (resultImage) {
    return (
      <div
        className="aspect-square w-full rounded-lg border overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(45deg, #e0e0e0 25%, transparent 25%),
            linear-gradient(-45deg, #e0e0e0 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e0e0e0 75%),
            linear-gradient(-45deg, transparent 75%, #e0e0e0 75%)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
        }}
      >
        <img
          src={resultImage}
          alt="Result"
          className="w-full h-full object-contain p-2"
        />
      </div>
    );
  }

  // Show empty state
  return (
    <div className="aspect-square w-full rounded-lg border bg-muted/50 flex items-center justify-center">
      <div className="text-center space-y-2 p-4">
        <ImageIcon className="h-10 w-10 mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {originalImage ? t('readyToProcess') : t('uploadFirst')}
        </p>
      </div>
    </div>
  );
}

function ProcessingSpinner({ className }: { className?: string }) {
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

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  );
}
