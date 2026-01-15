'use client';

import { useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { validateFileSize, MAX_FILE_SIZE_MB } from '@magiworld/utils';

interface ImageUploaderProps {
  onImageSelect: (imageDataUrl: string) => void;
  previewUrl: string | null;
  disabled?: boolean;
}

export function ImageUploader({ onImageSelect, previewUrl, disabled }: ImageUploaderProps) {
  const t = useTranslations('bgRemove.upload');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;

      // Validate file size before processing
      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.isValid) {
        alert(sizeValidation.error);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          onImageSelect(result);
        }
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFileChange(file);
    },
    [disabled, handleFileChange]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      aria-label={previewUrl ? t('changeImage') : t('dragDrop')}
      aria-disabled={disabled}
      className={`
        relative aspect-square w-full rounded-lg border-2 border-dashed
        transition-colors cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-muted/50'}
        ${previewUrl ? 'border-primary' : 'border-muted-foreground/25'}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
        aria-hidden="true"
      />

      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Uploaded image"
          className="absolute inset-0 w-full h-full object-contain rounded-lg p-2"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4">
          <UploadIcon className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            {t('dragDrop')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('or')} <span className="text-primary underline">{t('browse')}</span>
          </p>
          <p className="text-xs text-muted-foreground/70">
            (max {MAX_FILE_SIZE_MB}&nbsp;MB)
          </p>
        </div>
      )}
    </div>
  );
}

function UploadIcon({ className }: { className?: string }) {
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
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}
