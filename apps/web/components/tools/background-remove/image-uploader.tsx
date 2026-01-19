/**
 * @fileoverview Image Uploader Component
 * @fileoverview 图片上传组件
 *
 * Drag-and-drop image upload with preview.
 * Styled similar to Nano Banana Pro playground.
 * 带预览的拖放图片上传。
 * 样式类似于Nano Banana Pro playground。
 *
 * @module components/tools/background-remove/image-uploader
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
}

export function ImageUploader({
  onImageSelect,
  previewUrl,
  onClear,
  disabled,
  className,
}: ImageUploaderProps) {
  const t = useTranslations('bgRemove.upload');
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
        'relative w-full h-full min-h-[200px] rounded-lg border-2 border-dashed transition-all',
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
              aria-label="Clear image"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
          {/* Preview image */}
          <img
            src={previewUrl}
            alt="Uploaded image"
            className="w-full h-full object-contain rounded-md"
          />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          <div className="p-4 rounded-full bg-muted/50">
            <HugeiconsIcon
              icon={isDragging ? Image01Icon : CloudUploadIcon}
              className={cn(
                'w-10 h-10 transition-colors',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )}
              strokeWidth={1.5}
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragging ? 'Drop image here' : t('dragDrop')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t('or')} <span className="text-primary underline">{t('browse')}</span>
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              (max {MAX_FILE_SIZE_MB}&nbsp;MB)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
