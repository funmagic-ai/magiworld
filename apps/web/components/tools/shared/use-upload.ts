/**
 * @fileoverview Upload Hook for Web App
 * @fileoverview Web应用上传钩子
 *
 * Provides file upload functionality using presigned URLs to S3.
 * After upload, calls signUrl server action to get a signed CloudFront URL.
 * 使用预签名URL上传文件到S3。
 * 上传后调用signUrl服务端操作获取签名的CloudFront URL。
 *
 * @module components/tools/shared/use-upload
 */

'use client';

import { useState, useCallback } from 'react';
import { useUploadFile } from '@better-upload/client';
import { signUrl } from '@/lib/actions/upload';

export interface UseUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  uploadedUrl: string | null;
  uploadedKey: string | null;
}

export interface UploadOptions {
  /** Upload route to use / 使用的上传路由 */
  route?: string;
}

export interface UseUploadReturn extends UseUploadState {
  upload: (file: File) => Promise<string | null>;
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
  });

  const {
    upload: betterUpload,
    progress: hookProgress,
    reset: hookReset,
    error: hookError,
  } = useUploadFile({ route });

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      setState({
        isUploading: true,
        progress: 0,
        error: null,
        uploadedUrl: null,
        uploadedKey: null,
      });

      try {
        const result = await betterUpload(file);

        if (!result?.file) {
          throw new Error('Upload failed - no result returned');
        }

        const uploadedKey = result.file.objectInfo.key;
        // Build CloudFront URL using environment variable
        const baseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_WEB_PRIVATE_URL || '';
        const unsignedUrl = baseUrl ? `${baseUrl}/${uploadedKey}` : uploadedKey;

        // Sign the URL for private CloudFront access
        const uploadedUrl = await signUrl(unsignedUrl);

        setState({
          isUploading: false,
          progress: 100,
          error: null,
          uploadedUrl,
          uploadedKey,
        });

        return uploadedUrl;
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
    });
  }, [hookReset]);

  return {
    isUploading: state.isUploading,
    progress: state.isUploading ? hookProgress * 100 : state.progress,
    error: state.error || hookError?.message || null,
    uploadedUrl: state.uploadedUrl,
    uploadedKey: state.uploadedKey,
    upload,
    reset,
  };
}
