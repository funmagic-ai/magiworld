/**
 * @fileoverview Winston Logger Utility
 *
 * Provides a configured winston logger that writes to console (stdout).
 * Docker captures stdout automatically, making this ideal for containerized apps.
 *
 * @module @magiworld/utils/logger
 */

import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

/**
 * Custom log format for console output
 * Format: [TIMESTAMP] LEVEL: message {metadata}
 */
const consoleFormat = printf(({ level, message, timestamp, module, ...metadata }) => {
  const modulePrefix = module ? `[${module}] ` : '';
  const metaStr = Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : '';
  return `[${timestamp}] ${level}: ${modulePrefix}${message}${metaStr}`;
});

/**
 * Logger instance configured to write to console (stdout).
 *
 * Log levels: error, warn, info, http, verbose, debug, silly
 *
 * @example
 * ```typescript
 * import { logger } from '@magiworld/utils';
 *
 * logger.info('Server started');
 * logger.error('Failed to process request', { err: error.message });
 * logger.debug('User action', { userId, action });
 * ```
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize({ all: process.env.NODE_ENV !== 'production' }),
        consoleFormat
      ),
    }),
  ],
});

/**
 * Create a child logger with a specific context/module name.
 *
 * @param name - The module or context name
 * @returns A child logger instance
 *
 * @example
 * ```typescript
 * const log = createLogger('chat-api');
 * log.info('Processing message');
 * // Output: [2024-01-15 12:00:00] info: [chat-api] Processing message
 * ```
 */
export function createLogger(name: string) {
  return logger.child({ module: name });
}

export default logger;
