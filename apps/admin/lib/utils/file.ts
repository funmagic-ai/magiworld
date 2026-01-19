/**
 * @fileoverview File Utility Functions
 * @fileoverview 文件工具函数
 *
 * Shared utilities for file validation and processing.
 * File size limits are configured via NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB env var.
 * 共享的文件验证和处理工具函数。
 * 文件大小限制通过NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB环境变量配置。
 *
 * @module lib/utils/file
 */

// ============================================
// Constants / 常量
// ============================================

/** Default max file size in MB / 默认最大文件大小（MB） */
const DEFAULT_MAX_SIZE_MB = 20;

/**
 * Get maximum file size in MB from environment / 从环境变量获取最大文件大小（MB）
 *
 * Reads NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB, defaults to 20MB.
 * NEXT_PUBLIC_ vars are inlined at build time by Next.js, so this works on both server and client.
 * 读取NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB，默认20MB。
 * NEXT_PUBLIC_ 变量在构建时由 Next.js 内联，因此在服务器和客户端都有效。
 */
function getMaxSizeMB(): number {
  // NEXT_PUBLIC_ variables are inlined at build time, so they're available on both server and client
  const envValue = process.env.NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB;
  if (envValue) {
    const parsed = parseInt(envValue, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_MAX_SIZE_MB;
}

/**
 * Maximum file size in bytes / 最大文件大小（字节）
 *
 * Configurable via NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB env var.
 * 可通过NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB环境变量配置。
 */
export const MAX_FILE_SIZE = getMaxSizeMB() * 1024 * 1024;

/**
 * Maximum file size in megabytes (for display) / 最大文件大小（MB，用于显示）
 *
 * Configurable via NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB env var.
 * 可通过NEXT_PUBLIC_UPLOAD_MAX_SIZE_MB环境变量配置。
 */
export const MAX_FILE_SIZE_MB = getMaxSizeMB();

// ============================================
// Validation Functions / 验证函数
// ============================================

/**
 * Validate file size against the maximum allowed size.
 * 验证文件大小是否超过最大允许大小。
 *
 * @param file - The file to validate / 要验证的文件
 * @param maxSize - Optional custom max size in bytes (defaults to MAX_FILE_SIZE) / 可选的自定义最大大小（字节）
 * @returns Object with isValid boolean and optional error message / 包含isValid布尔值和可选错误消息的对象
 */
export function validateFileSize(
  file: File,
  maxSize: number = MAX_FILE_SIZE
): { isValid: boolean; error?: string } {
  if (file.size > maxSize) {
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return {
      isValid: false,
      error: `File "${file.name}" is too large (${fileSizeMB}MB). Maximum size is ${maxSizeMB}MB.`,
    };
  }
  return { isValid: true };
}

/**
 * Validate multiple files against the maximum allowed size.
 * 验证多个文件是否超过最大允许大小。
 *
 * @param files - The files to validate / 要验证的文件数组
 * @param maxSize - Optional custom max size in bytes (defaults to MAX_FILE_SIZE) / 可选的自定义最大大小（字节）
 * @returns Object with valid files array and any error messages / 包含有效文件数组和错误消息的对象
 */
export function validateFileSizes(
  files: File[],
  maxSize: number = MAX_FILE_SIZE
): { validFiles: File[]; errors: string[] } {
  const validFiles: File[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const result = validateFileSize(file, maxSize);
    if (result.isValid) {
      validFiles.push(file);
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return { validFiles, errors };
}

/**
 * Format file size for display.
 * 格式化文件大小用于显示。
 *
 * @param bytes - File size in bytes / 文件大小（字节）
 * @returns Formatted string (e.g., "2.5 MB", "500 KB") / 格式化字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
