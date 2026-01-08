/**
 * @fileoverview File Utility Functions
 *
 * Shared utilities for file validation and processing.
 *
 * @module apps/admin/lib/utils/file
 */

// ============================================
// Constants
// ============================================

/**
 * Maximum file size in bytes (20MB)
 * This is the unified limit across all upload points in the application.
 */
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Maximum file size in megabytes (for display)
 */
export const MAX_FILE_SIZE_MB = 20;

// ============================================
// Validation Functions
// ============================================

/**
 * Validate file size against the maximum allowed size.
 *
 * @param file - The file to validate
 * @param maxSize - Optional custom max size in bytes (defaults to MAX_FILE_SIZE)
 * @returns Object with isValid boolean and optional error message
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
 *
 * @param files - The files to validate
 * @param maxSize - Optional custom max size in bytes (defaults to MAX_FILE_SIZE)
 * @returns Object with valid files array and any error messages
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
 *
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "2.5 MB", "500 KB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
