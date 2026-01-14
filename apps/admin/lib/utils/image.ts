/**
 * @fileoverview Image Utility Functions
 * @fileoverview 图片工具函数
 *
 * Shared utilities for image dimension detection and validation.
 * Includes React hook for automatic dimension detection.
 * 共享的图片尺寸检测和验证工具函数。
 * 包含用于自动尺寸检测的React Hook。
 *
 * @module lib/utils/image
 */

'use client';

import { useState, useEffect } from 'react';

// ============================================
// Types / 类型定义
// ============================================

/**
 * Image dimensions / 图片尺寸
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Aspect ratio validation result / 宽高比验证结果
 */
export interface AspectRatioResult {
  /** Whether ratio matches expected / 比例是否匹配 */
  isMatch: boolean;
  /** Actual aspect ratio value / 实际宽高比值 */
  actualRatio: number;
  /** Formatted actual ratio string / 格式化的实际比例字符串 */
  actualRatioFormatted: string;
  /** Expected ratio label / 预期比例标签 */
  expectedLabel: string;
  /** Image width / 图片宽度 */
  width: number;
  /** Image height / 图片高度 */
  height: number;
}

/**
 * Result from useImageDimensions hook / useImageDimensions hook的返回结果
 */
export interface UseImageDimensionsResult {
  /** Detected dimensions or null / 检测到的尺寸或null */
  dimensions: ImageDimensions | null;
  /** Object URL for preview / 用于预览的Object URL */
  previewUrl: string;
  /** Whether detection is in progress / 是否正在检测 */
  isLoading: boolean;
  /** Error message if detection failed / 检测失败时的错误消息 */
  error: string | null;
}

// ============================================
// Constants / 常量
// ============================================

/** Default tolerance for aspect ratio comparison (5%) / 宽高比比较的默认容差（5%） */
export const DEFAULT_RATIO_TOLERANCE = 0.05;

/**
 * Common aspect ratios / 常用宽高比
 */
export const ASPECT_RATIOS = {
  '1:1': { ratio: 1, label: '1:1 (Square)' },
  '4:3': { ratio: 4 / 3, label: '4:3' },
  '3:4': { ratio: 3 / 4, label: '3:4' },
  '16:9': { ratio: 16 / 9, label: '16:9' },
  '9:16': { ratio: 9 / 16, label: '9:16' },
  '21:9': { ratio: 21 / 9, label: '21:9 (Ultrawide)' },
} as const;

// ============================================
// Functions / 函数
// ============================================

/**
 * Get image dimensions from a File / 从文件获取图片尺寸
 *
 * Creates a temporary Image element to read dimensions.
 * 创建临时Image元素读取尺寸。
 *
 * @param file - Image file to measure / 要测量的图片文件
 * @returns Promise resolving to dimensions / 解析为尺寸的Promise
 */
export function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Get image dimensions from a URL / 从URL获取图片尺寸
 *
 * @param url - Image URL / 图片URL
 * @returns Promise resolving to dimensions / 解析为尺寸的Promise
 */
export function getImageDimensionsFromUrl(url: string): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image from URL'));
    };

    img.src = url;
  });
}

/**
 * Calculate aspect ratio from dimensions / 从尺寸计算宽高比
 *
 * @param dimensions - Image dimensions / 图片尺寸
 * @returns Aspect ratio (width / height) / 宽高比
 */
export function calculateAspectRatio(dimensions: ImageDimensions): number {
  return dimensions.width / dimensions.height;
}

/**
 * Validate aspect ratio against expected ratio / 验证宽高比是否符合预期
 *
 * @param dimensions - Image dimensions / 图片尺寸
 * @param expectedRatio - Expected aspect ratio value / 预期宽高比值
 * @param expectedLabel - Label for expected ratio / 预期比例标签
 * @param tolerance - Tolerance for comparison (default 5%) / 比较容差（默认5%）
 * @returns Validation result / 验证结果
 */
export function validateAspectRatio(
  dimensions: ImageDimensions,
  expectedRatio: number,
  expectedLabel: string,
  tolerance: number = DEFAULT_RATIO_TOLERANCE
): AspectRatioResult {
  const actualRatio = calculateAspectRatio(dimensions);
  const diff = Math.abs(actualRatio - expectedRatio) / expectedRatio;
  const isMatch = diff <= tolerance;

  return {
    isMatch,
    actualRatio,
    actualRatioFormatted: actualRatio.toFixed(2),
    expectedLabel,
    width: dimensions.width,
    height: dimensions.height,
  };
}

/**
 * Check if image is square within tolerance / 检查图片是否为正方形（在容差范围内）
 *
 * @param dimensions - Image dimensions / 图片尺寸
 * @param tolerance - Tolerance for comparison / 比较容差
 * @returns Whether image is square / 是否为正方形
 */
export function isSquare(
  dimensions: ImageDimensions,
  tolerance: number = DEFAULT_RATIO_TOLERANCE
): boolean {
  const ratio = calculateAspectRatio(dimensions);
  return Math.abs(ratio - 1) <= tolerance;
}

/**
 * Validate minimum dimensions / 验证最小尺寸
 *
 * @param dimensions - Image dimensions / 图片尺寸
 * @param minWidth - Minimum width / 最小宽度
 * @param minHeight - Minimum height (defaults to minWidth) / 最小高度（默认与宽度相同）
 * @returns Validation result / 验证结果
 */
export function validateMinDimensions(
  dimensions: ImageDimensions,
  minWidth: number,
  minHeight: number = minWidth
): { isValid: boolean; error?: string } {
  if (dimensions.width < minWidth || dimensions.height < minHeight) {
    return {
      isValid: false,
      error: `Image must be at least ${minWidth}×${minHeight}px. Current: ${dimensions.width}×${dimensions.height}px`,
    };
  }
  return { isValid: true };
}

// ============================================
// React Hook / React Hook
// ============================================

/**
 * React hook for image dimension detection / 图片尺寸检测的React Hook
 *
 * Automatically detects dimensions when file changes.
 * Creates and manages object URL for preview.
 * 文件变化时自动检测尺寸。
 * 创建和管理用于预览的object URL。
 *
 * @param file - File to detect dimensions for / 要检测尺寸的文件
 * @returns Dimensions, preview URL, loading state, and error / 尺寸、预览URL、加载状态和错误
 *
 * @example
 * ```tsx
 * const { dimensions, previewUrl, isLoading } = useImageDimensions(selectedFile);
 *
 * if (isLoading) return <Spinner />;
 * if (dimensions) {
 *   console.log(`Size: ${dimensions.width}x${dimensions.height}`);
 * }
 * ```
 */
export function useImageDimensions(file: File | null): UseImageDimensionsResult {
  const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setDimensions(null);
      setPreviewUrl('');
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    const img = new window.Image();

    img.onload = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
      setIsLoading(false);
    };

    img.onerror = () => {
      setError('Failed to load image');
      setDimensions(null);
      setIsLoading(false);
    };

    img.src = url;

    // Cleanup: revoke object URL when file changes
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  return {
    dimensions,
    previewUrl,
    isLoading,
    error,
  };
}
