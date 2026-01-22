/**
 * @fileoverview Upload Hook for Web App
 * @fileoverview Web应用上传钩子
 *
 * Provides file upload functionality using presigned URLs to S3.
 * Returns both signed URL (for display) and unsigned URL (for storage).
 * 使用预签名URL上传文件到S3。
 * 返回签名URL（用于显示）和未签名URL（用于存储）。
 *
 * @module components/tools/shared/use-upload
 */

'use client';

import { useState, useCallback } from 'react';
import { useUploadFile } from '@better-upload/client';
import { signUrl } from '@/lib/actions/upload';

/**
 * Upload result containing both signed and unsigned URLs
 * 上传结果，包含签名和未签名URL
 */
export interface UploadResult {
  /** Signed URL for immediate display (expires after 1 hour) */
  signedUrl: string;
  /** Unsigned URL for database storage (never expires) */
  unsignedUrl: string;
  /** S3 object key */
  key: string;
}

export interface UseUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  /** @deprecated Use signedUrl instead */
  uploadedUrl: string | null;
  uploadedKey: string | null;
  /** Signed URL for display (expires after 1 hour) */
  signedUrl: string | null;
  /** Unsigned URL for storage (never expires) */
  unsignedUrl: string | null;
}

export interface UploadOptions {
  /** Upload route to use / 使用的上传路由 */
  route?: string;
}

export interface UseUploadReturn extends UseUploadState {
  /** Upload file and return result with both signed and unsigned URLs */
  upload: (file: File) => Promise<UploadResult | null>;
  reset: () => void;
}

export function useUpload(options: UploadOptions = {}): UseUploadReturn {
  const { route = 'tools' } = options;

  const [state, setState] = useState<UseUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedUrl: null,
    uploadedKey: null,
    signedUrl: null,
    unsignedUrl: null,
  });

  const {
    upload: betterUpload,
    progress: hookProgress,
    reset: hookReset,
    error: hookError,
  } = useUploadFile({ route });

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setState({
        isUploading: true,
        progress: 0,
        error: null,
        uploadedUrl: null,
        uploadedKey: null,
        signedUrl: null,
        unsignedUrl: null,
      });

      try {
        const result = await betterUpload(file);

        if (!result?.file) {
          throw new Error('Upload failed - no result returned');
        }

        const key = result.file.objectInfo.key;
        // Build unsigned CloudFront URL
        const baseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_PRIVATE_URL || '';
        const unsignedUrl = baseUrl ? `${baseUrl}/${key}` : key;

        // Sign the URL for immediate display
        const signedUrl = await signUrl(unsignedUrl);

        setState({
          isUploading: false,
          progress: 100,
          error: null,
          uploadedUrl: signedUrl, // Backward compatibility
          uploadedKey: key,
          signedUrl,
          unsignedUrl,
        });

        return { signedUrl, unsignedUrl, key };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Upload failed';
        setState((prev) => ({
          ...prev,
          isUploading: false,
          error: errorMessage,
        }));
        return null;
      }
    },
    [betterUpload]
  );

  const reset = useCallback(() => {
    hookReset();
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      uploadedUrl: null,
      uploadedKey: null,
      signedUrl: null,
      unsignedUrl: null,
    });
  }, [hookReset]);

  return {
    isUploading: state.isUploading,
    progress: state.isUploading ? hookProgress * 100 : state.progress,
    error: state.error || hookError?.message || null,
    uploadedUrl: state.uploadedUrl,
    uploadedKey: state.uploadedKey,
    signedUrl: state.signedUrl,
    unsignedUrl: state.unsignedUrl,
    upload,
    reset,
  };
}
