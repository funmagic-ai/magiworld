/**
 * @fileoverview CSS Class Name Utilities
 * @fileoverview CSS类名工具函数
 *
 * Provides utility functions for managing CSS class names.
 * Uses clsx for conditional classes and tailwind-merge for deduplication.
 * 提供CSS类名管理的工具函数。
 * 使用clsx处理条件类名，tailwind-merge去重。
 *
 * @module apps/web/lib/utils
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge class names with Tailwind CSS conflict resolution.
 * 合并类名并解决Tailwind CSS冲突。
 *
 * @param inputs - Class values to merge / 要合并的类名值
 * @returns Merged class name string / 合并后的类名字符串
 *
 * @example
 * ```tsx
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4'
 * cn({ 'bg-red-500': isError }, 'text-white')
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
