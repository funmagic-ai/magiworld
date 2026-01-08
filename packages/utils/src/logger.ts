/**
 * @fileoverview Pino Logger Utility
 *
 * Provides a configured pino logger that writes to both console and file.
 * Log files are stored in the `logs/` directory at the project root.
 *
 * @module @magiworld/utils/logger
 */

import pino from 'pino';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Generate log filename with date
const getLogFileName = () => {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logDir, `app-${date}.log`);
};

/**
 * Logger instance configured to write to file and console.
 *
 * Log levels: trace, debug, info, warn, error, fatal
 *
 * @example
 * ```typescript
 * import { logger } from '@magiworld/utils';
 *
 * logger.info('Server started');
 * logger.error({ err }, 'Failed to process request');
 * logger.debug({ userId, action }, 'User action');
 * ```
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    targets: [
      // Write to file
      {
        target: 'pino/file',
        options: {
          destination: getLogFileName(),
          mkdir: true,
        },
        level: 'info',
      },
      // Pretty print to console in development
      ...(process.env.NODE_ENV !== 'production'
        ? [
            {
              target: 'pino-pretty',
              options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
              },
              level: 'debug',
            },
          ]
        : [
            {
              target: 'pino/file',
              options: { destination: 1 }, // stdout
              level: 'info',
            },
          ]),
    ],
  },
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
 * // Output: {"module":"chat-api","msg":"Processing message",...}
 * ```
 */
export function createLogger(name: string) {
  return logger.child({ module: name });
}

export default logger;
