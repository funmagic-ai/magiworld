/**
 * @fileoverview Utility Functions
 * @fileoverview 工具函数
 *
 * Common utility functions used throughout the admin application.
 * 管理后台应用中使用的通用工具函数。
 *
 * @module lib/utils
 */

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combine class names with Tailwind CSS merge / 合并类名并处理Tailwind CSS冲突
 *
 * Uses clsx for conditional classes and tailwind-merge to resolve conflicts.
 * 使用clsx处理条件类名，使用tailwind-merge解决冲突。
 *
 * @param inputs - Class values to combine / 要合并的类值
 * @returns Merged class string / 合并后的类字符串
 *
 * @example
 * ```ts
 * cn('px-4 py-2', 'px-8') // 'py-2 px-8' - px-8 overrides px-4
 * cn('text-red-500', condition && 'text-blue-500')
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
