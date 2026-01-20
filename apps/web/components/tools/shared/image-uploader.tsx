/**
 * @fileoverview Image Uploader Component
 * @fileoverview 图片上传组件
 *
 * Shared drag-and-drop image upload with preview.
 * Used by multiple tools (background-remove, fig-me, etc.)
 * 共享的带预览的拖放图片上传组件。
 * 被多个工具使用（background-remove、fig-me等）
 *
 * @module components/tools/shared/image-uploader
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { HugeiconsIcon } from '@hugeicons/react';
import { CloudUploadIcon, Cancel01Icon, Image01Icon } from '@hugeicons/core-free-icons';
import { validateFileSize, MAX_FILE_SIZE_MB } from '@magiworld/utils';

interface ImageUploaderProps {
  onImageSelect: (imageDataUrl: string, file: File) => void;
  previewUrl: string | null;
  onClear?: () => void;
  disabled?: boolean;
  className?: string;
  /** Compact mode for secondary/smaller upload areas */
  compact?: boolean;
}

export function ImageUploader({
  onImageSelect,
  previewUrl,
  onClear,
  disabled,
  className,
  compact,
}: ImageUploaderProps) {
  const t = useTranslations('shared.imageUploader');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return;

      const sizeValidation = validateFileSize(file);
      if (!sizeValidation.isValid) {
        alert(sizeValidation.error);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          onImageSelect(result, file);
        }
      };
      reader.readAsDataURL(file);
    },
    [onImageSelect]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileChange(file);
    e.target.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFileChange(file);
    },
    [disabled, handleFileChange]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!disabled && !previewUrl) {
      inputRef.current?.click();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClear?.();
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
      onDragLeave={handleDragLeave}
      aria-label={previewUrl ? t('changeImage') : t('dragDrop')}
      aria-disabled={disabled}
      className={cn(
        'relative w-full h-full rounded-lg border-2 border-dashed transition-all',
        compact ? 'min-h-[120px]' : 'min-h-[200px]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && !previewUrl && 'cursor-pointer hover:border-primary hover:bg-muted/30',
        previewUrl && 'border-primary bg-muted/10',
        isDragging && 'border-primary bg-primary/10 scale-[1.02]',
        className
      )}
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
        <div className="relative w-full h-full p-2">
          {/* Clear button */}
          {onClear && !disabled && (
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 z-10 p-1.5 bg-background/80 hover:bg-destructive text-muted-foreground hover:text-destructive-foreground transition-all rounded-md border shadow-sm"
              aria-label={t('clearImage')}
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
          {/* Preview image */}
          <img
            src={previewUrl}
            alt={t('uploadedImage')}
            className="w-full h-full object-contain rounded-md"
          />
        </div>
      ) : (
        <div className={cn(
          'absolute inset-0 flex flex-col items-center justify-center p-4',
          compact ? 'gap-2' : 'gap-3'
        )}>
          <div className={cn('rounded-full bg-muted/50', compact ? 'p-2' : 'p-4')}>
            <HugeiconsIcon
              icon={isDragging ? Image01Icon : CloudUploadIcon}
              className={cn(
                'transition-colors',
                compact ? 'w-6 h-6' : 'w-10 h-10',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )}
              strokeWidth={1.5}
            />
          </div>
          <div className="text-center">
            <p className={cn('font-medium text-foreground', compact ? 'text-xs' : 'text-sm')}>
              {isDragging ? t('dropHere') : (compact ? t('browse') : t('dragDrop'))}
            </p>
            {!compact && (
              <p className="text-xs text-muted-foreground mt-1">
                {t('or')} <span className="text-primary underline">{t('browse')}</span>
              </p>
            )}
            <p className={cn('text-muted-foreground/70', compact ? 'text-[10px] mt-1' : 'text-xs mt-2')}>
              ({t('maxSize', { size: MAX_FILE_SIZE_MB })})
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
