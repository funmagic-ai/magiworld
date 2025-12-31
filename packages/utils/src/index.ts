/**
 * @fileoverview Shared Utility Functions
 *
 * This module provides common utility functions used across the Magiworld platform.
 * Includes string manipulation, date formatting, and CSS class utilities.
 *
 * @module @magiworld/utils
 */

// ============================================
// String Utilities
// ============================================

/**
 * Generate a URL-friendly slug from a string.
 *
 * Transforms the input text by:
 * - Converting to lowercase
 * - Removing leading/trailing whitespace
 * - Removing special characters (keeping alphanumeric, spaces, and hyphens)
 * - Replacing spaces and underscores with hyphens
 * - Removing leading/trailing hyphens
 *
 * @param text - The input string to convert to a slug
 * @returns A URL-friendly slug string
 *
 * @example
 * ```typescript
 * slugify('Hello World!');     // 'hello-world'
 * slugify('Anime Style 2024'); // 'anime-style-2024'
 * slugify('  Multiple   Spaces  '); // 'multiple-spaces'
 * ```
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Truncate text to a maximum length with ellipsis.
 *
 * If the text exceeds the maximum length, it will be truncated
 * and an ellipsis (...) will be appended.
 *
 * @param text - The input text to truncate
 * @param maxLength - Maximum length including the ellipsis
 * @returns The truncated text with ellipsis, or original text if within limit
 *
 * @example
 * ```typescript
 * truncate('Hello World', 8);  // 'Hello...'
 * truncate('Short', 10);       // 'Short'
 * truncate('Exactly Ten', 11); // 'Exactly Ten'
 * ```
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

// ============================================
// Date Formatting Utilities
// ============================================

/**
 * Format a date string to a localized date format.
 *
 * Uses the Intl.DateTimeFormat API for proper internationalization.
 *
 * @param date - The date to format (string or Date object)
 * @param locale - BCP 47 language tag (default: 'en')
 * @param options - Intl.DateTimeFormatOptions for customizing output
 * @returns A localized date string
 *
 * @example
 * ```typescript
 * formatDate('2024-01-15');
 * // 'Jan 15, 2024' (en)
 *
 * formatDate('2024-01-15', 'ja');
 * // '2024年1月15日' (ja)
 *
 * formatDate(new Date(), 'en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
 * // 'Monday, January 15, 2024'
 * ```
 */
export function formatDate(
  date: string | Date,
  locale: string = 'en',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, options);
}

/**
 * Format a date as relative time (e.g., "2 hours ago").
 *
 * Uses the Intl.RelativeTimeFormat API for proper internationalization.
 * Automatically selects the most appropriate time unit based on the difference.
 *
 * Time unit thresholds:
 * - Less than 60 seconds: seconds
 * - Less than 60 minutes: minutes
 * - Less than 24 hours: hours
 * - Less than 30 days: days
 * - Less than 365 days: months
 * - Otherwise: years
 *
 * @param date - The date to format (string or Date object)
 * @param locale - BCP 47 language tag (default: 'en')
 * @returns A localized relative time string
 *
 * @example
 * ```typescript
 * // Assuming current time is 2024-01-15 12:00:00
 * formatRelativeTime('2024-01-15T11:30:00'); // '30 minutes ago'
 * formatRelativeTime('2024-01-14T12:00:00'); // 'yesterday'
 * formatRelativeTime('2024-01-10T12:00:00'); // '5 days ago'
 * formatRelativeTime('2024-01-15T11:30:00', 'ja'); // '30分前'
 * ```
 */
export function formatRelativeTime(date: string | Date, locale: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffInSeconds < 60) {
    return rtf.format(-diffInSeconds, 'second');
  } else if (diffInSeconds < 3600) {
    return rtf.format(-Math.floor(diffInSeconds / 60), 'minute');
  } else if (diffInSeconds < 86400) {
    return rtf.format(-Math.floor(diffInSeconds / 3600), 'hour');
  } else if (diffInSeconds < 2592000) {
    return rtf.format(-Math.floor(diffInSeconds / 86400), 'day');
  } else if (diffInSeconds < 31536000) {
    return rtf.format(-Math.floor(diffInSeconds / 2592000), 'month');
  } else {
    return rtf.format(-Math.floor(diffInSeconds / 31536000), 'year');
  }
}

// ============================================
// CSS Utilities
// ============================================

/**
 * Combine CSS class names, filtering out falsy values.
 *
 * A simplified version of the popular `clsx` or `classnames` utilities.
 * Useful for conditional class name application in React components.
 *
 * @param classes - Variable number of class name strings or falsy values
 * @returns A single space-separated string of valid class names
 *
 * @example
 * ```typescript
 * cn('base-class', 'another-class');
 * // 'base-class another-class'
 *
 * cn('always-applied', isActive && 'active', isDisabled && 'disabled');
 * // 'always-applied active' (if isActive=true, isDisabled=false)
 *
 * cn('btn', undefined, null, false, 'btn-primary');
 * // 'btn btn-primary'
 * ```
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
