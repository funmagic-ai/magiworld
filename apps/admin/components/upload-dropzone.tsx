'use client';

/**
 * @fileoverview Upload Dropzone Component
 *
 * Drag-and-drop file upload component using better-upload.
 * Supports images and videos with progress indication.
 *
 * @module apps/admin/components/upload-dropzone
 */

import { useState, useCallback } from 'react';
import { useUploadFiles, type FileUploadInfo, type UploadStatus } from '@better-upload/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { HugeiconsIcon } from '@hugeicons/react';
import { CloudUploadIcon, Delete02Icon, CheckmarkCircle02Icon, AlertCircleIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { validateFileSizes, MAX_FILE_SIZE_MB } from '@/lib/utils/file';

type UploadedFile = {
  name: string;
  url: string;
  size: number;
  type: string;
};

type UploadDropzoneProps = {
  route?: 'images' | 'videos' | 'assets';
  folderId?: string | null;
  onUploadComplete?: (files: UploadedFile[]) => void;
  maxFiles?: number;
  className?: string;
};

export function UploadDropzone({
  route = 'assets',
  folderId,
  onUploadComplete,
  maxFiles = 10,
  className,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const {
    upload,
    progresses,
    reset,
    isPending,
    isSettled,
    allSucceeded,
    hasFailedFiles,
    uploadedFiles,
    averageProgress,
  } = useUploadFiles({
    route,
    api: '/api/upload',
    onUploadComplete: ({ files }) => {
      const uploaded = files.map((f: FileUploadInfo<'complete'>) => ({
        name: f.name,
        url: `https://${process.env.NEXT_PUBLIC_S3_BUCKET || 'magiworld-assets'}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'ap-northeast-1'}.amazonaws.com/${f.objectInfo.key}`,
        size: f.size,
        type: f.type,
      }));
      onUploadComplete?.(uploaded);
    },
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const droppedFiles = Array.from(e.dataTransfer.files).slice(0, maxFiles);
      if (droppedFiles.length > 0) {
        // Validate file sizes before upload
        const { validFiles, errors } = validateFileSizes(droppedFiles);
        if (errors.length > 0) {
          alert(errors.join('\n'));
        }
        if (validFiles.length > 0) {
          upload(validFiles, { metadata: folderId ? { folderId } : undefined });
        }
      }
    },
    [upload, maxFiles, folderId]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(e.target.files || []).slice(0, maxFiles);
      if (selectedFiles.length > 0) {
        // Validate file sizes before upload
        const { validFiles, errors } = validateFileSizes(selectedFiles);
        if (errors.length > 0) {
          alert(errors.join('\n'));
        }
        if (validFiles.length > 0) {
          upload(validFiles, { metadata: folderId ? { folderId } : undefined });
        }
      }
      e.target.value = '';
    },
    [upload, maxFiles, folderId]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Dropzone */}
      <Card
        className={cn(
          'relative flex flex-col items-center justify-center border-2 border-dashed p-8 transition-colors',
          isDragging && 'border-primary bg-primary/5',
          isPending && 'pointer-events-none opacity-60'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={isPending}
        />
        <HugeiconsIcon
          icon={CloudUploadIcon}
          className={cn('h-12 w-12 text-muted-foreground', isDragging && 'text-primary')}
          strokeWidth={1.5}
        />
        <p className="mt-4 text-sm font-medium">
          {isDragging ? 'Drop files here' : 'Drag & drop files here'}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          or click to browse (max {maxFiles} files, {MAX_FILE_SIZE_MB}MB each)
        </p>
      </Card>

      {/* Upload Progress */}
      {progresses.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">
              Uploading {progresses.length} file{progresses.length > 1 ? 's' : ''}
            </span>
            {isSettled && allSucceeded && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4" />
                Complete
              </span>
            )}
            {isSettled && hasFailedFiles && (
              <span className="flex items-center gap-1 text-xs text-destructive">
                <HugeiconsIcon icon={AlertCircleIcon} className="h-4 w-4" />
                Some files failed
              </span>
            )}
          </div>
          <Progress value={averageProgress * 100} className="h-2" />
          <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
            {progresses.map((file: FileUploadInfo<UploadStatus>, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs"
              >
                <span className="truncate max-w-[200px]">{file.name}</span>
                <span className={cn(
                  'text-muted-foreground',
                  file.status === 'complete' && 'text-green-600',
                  file.status === 'failed' && 'text-destructive'
                )}>
                  {file.status === 'complete'
                    ? 'Done'
                    : file.status === 'failed'
                    ? 'Failed'
                    : `${Math.round(file.progress * 100)}%`}
                </span>
              </div>
            ))}
          </div>
          {isSettled && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              onClick={reset}
            >
              <HugeiconsIcon icon={Delete02Icon} className="h-4 w-4 mr-2" />
              Clear
            </Button>
          )}
        </Card>
      )}
    </div>
  );
}
