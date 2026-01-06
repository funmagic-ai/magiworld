'use client';

/**
 * @fileoverview Result Actions Component
 *
 * Action buttons for AI tool results: save to library, download.
 * Uses better-upload for saving to library via presigned URLs.
 *
 * @module apps/admin/components/ai/result-actions
 */

import { useState, useCallback } from 'react';
import { useUploadFiles } from '@better-upload/client';
import { Button } from '@/components/ui/button';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Download04Icon,
  FolderLibraryIcon,
  CheckmarkCircle02Icon,
} from '@hugeicons/core-free-icons';

interface ResultActionsProps {
  /** Base64 encoded image data */
  base64?: string;
  /** Suggested filename for download/save */
  filename?: string;
  /** Callback when reset is clicked */
  onReset?: () => void;
  /** Disable all actions */
  disabled?: boolean;
}

/**
 * Convert base64 string to File object
 */
function base64ToFile(base64: string, filename: string): File {
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([ab], { type: 'image/png' });
  return new File([blob], filename, { type: 'image/png' });
}

export function ResultActions({
  base64,
  filename = 'ai-result.png',
  onReset,
  disabled,
}: ResultActionsProps) {
  const [saved, setSaved] = useState(false);

  const { upload, isPending } = useUploadFiles({
    route: 'magi',
    api: '/api/upload',
    onUploadComplete: () => {
      setSaved(true);
    },
    onError: (error) => {
      console.error('Upload failed:', error);
      alert('Failed to save to library');
    },
  });

  const handleDownload = useCallback(() => {
    if (!base64) return;

    const link = document.createElement('a');
    link.href = `data:image/png;base64,${base64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [base64, filename]);

  const handleSaveToLibrary = useCallback(() => {
    if (!base64) return;

    const file = base64ToFile(base64, filename);
    upload([file]);
  }, [base64, filename, upload]);

  if (!base64) return null;

  return (
    <div className="flex gap-2 justify-end">
      {onReset && (
        <Button variant="outline" onClick={onReset} disabled={disabled}>
          Reset
        </Button>
      )}

      <Button
        variant="outline"
        onClick={handleSaveToLibrary}
        disabled={disabled || isPending || saved}
      >
        {saved ? (
          <>
            <HugeiconsIcon
              icon={CheckmarkCircle02Icon}
              className="h-4 w-4 mr-2 text-green-600"
              strokeWidth={2}
            />
            Saved
          </>
        ) : isPending ? (
          'Saving...'
        ) : (
          <>
            <HugeiconsIcon
              icon={FolderLibraryIcon}
              className="h-4 w-4 mr-2"
              strokeWidth={2}
            />
            Save to Library
          </>
        )}
      </Button>

      <Button onClick={handleDownload} disabled={disabled}>
        <HugeiconsIcon icon={Download04Icon} className="h-4 w-4 mr-2" strokeWidth={2} />
        Download
      </Button>
    </div>
  );
}
