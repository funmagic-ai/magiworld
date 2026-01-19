/**
 * @fileoverview Upload Hook for Admin AI Tools
 * @fileoverview 管理后台AI工具上传钩子
 *
 * Provides file upload functionality for AI tools that need to upload images
 * to S3 before submitting tasks. Returns CloudFront URLs instead of base64.
 * 为需要在提交任务前上传图片到S3的AI工具提供文件上传功能。
 * 返回CloudFront URL而非base64。
 *
 * @module components/ai/hooks/use-upload
 */

'use client';

import { useCallback, useState } from 'react';
import { useUploadFile } from '@better-upload/client';

/**
 * Upload state / 上传状态
 */
export interface UseUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  uploadedUrl: string | null;
  uploadedKey: string | null;
}

/**
 * Upload options / 上传选项
 */
export interface UploadOptions {
  /**
   * Upload route to use / 使用的上传路由
   * @default 'assets'
   */
  route?: 'assets' | 'magi';
}

/**
 * Return value from useUpload / useUpload的返回值
 */
export interface UseUploadReturn extends UseUploadState {
  /** Upload a file and get the CloudFront URL / 上传文件并获取CloudFront URL */
  upload: (file: File) => Promise<string | null>;
  /** Reset state for new upload / 重置状态以进行新上传 */
  reset: () => void;
}

/**
 * Hook for uploading files to S3 and getting CloudFront URLs
 * 上传文件到S3并获取CloudFront URL的钩子
 *
 * Use this hook when you need to upload user images for AI task processing.
 * Uploads to S3 and returns a CloudFront URL instead of base64 data.
 * 当需要为AI任务处理上传用户图片时使用此钩子。
 * 上传到S3并返回CloudFront URL而非base64数据。
 *
 * @param options - Upload options / 上传选项
 * @returns Upload function and status / 上传函数和状态
 *
 * @example
 * ```tsx
 * const { upload, isUploading, progress, error } = useUpload();
 *
 * const handleFile = async (file: File) => {
 *   const url = await upload(file);
 *   if (url) {
 *     // Use the CloudFront URL for the task
 *     console.log('Uploaded to:', url);
 *   }
 * };
 * ```
 */
export function useUpload(options: UploadOptions = {}): UseUploadReturn {
  const { route = 'assets' } = options;

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
  } = useUploadFile({ route, api: '/api/upload' });

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
        const baseUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_ADMIN_URL || '';
        const uploadedUrl = baseUrl ? `${baseUrl}/${uploadedKey}` : uploadedKey;

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
