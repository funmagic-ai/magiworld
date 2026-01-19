/**
 * @fileoverview Graceful Shutdown Handler
 * @fileoverview 优雅关闭处理器
 *
 * Handles SIGTERM/SIGINT signals for graceful worker shutdown.
 * 处理 SIGTERM/SIGINT 信号以实现优雅的 Worker 关闭。
 *
 * @module @magiworld/worker/shutdown
 */

import { Worker } from 'bullmq';
import { createLogger } from '@magiworld/utils/logger';
import { config } from './config';

const logger = createLogger('shutdown');

let isShuttingDown = false;

/**
 * Setup graceful shutdown handlers
 * 设置优雅关闭处理器
 *
 * @param workers - Array of BullMQ workers / BullMQ Worker 数组
 * @param cleanup - Additional cleanup function / 额外的清理函数
 */
export function setupGracefulShutdown(
  workers: Worker[],
  cleanup?: () => Promise<void>
): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal');
      return;
    }

    isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`);

    const shutdownTimeout = config.WORKER_SHUTDOWN_TIMEOUT_MS;

    // Create timeout promise
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Shutdown timed out after ${shutdownTimeout}ms`));
      }, shutdownTimeout);
    });

    try {
      // Race between graceful shutdown and timeout
      await Promise.race([
        gracefulShutdown(workers, cleanup),
        timeoutPromise,
      ]);

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Shutdown error or timeout', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  logger.info('Graceful shutdown handlers registered');
}

/**
 * Perform graceful shutdown
 * 执行优雅关闭
 *
 * @param workers - Array of BullMQ workers / BullMQ Worker 数组
 * @param cleanup - Additional cleanup function / 额外的清理函数
 */
async function gracefulShutdown(
  workers: Worker[],
  cleanup?: () => Promise<void>
): Promise<void> {
  // 1. Pause all workers (stop accepting new jobs)
  logger.info('Pausing workers...');
  await Promise.all(workers.map((worker) => worker.pause()));

  // 2. Wait for active jobs to complete
  logger.info('Waiting for active jobs to complete...');
  await Promise.all(workers.map((worker) => worker.close()));

  // 3. Run additional cleanup
  if (cleanup) {
    logger.info('Running cleanup...');
    await cleanup();
  }

  logger.info('All workers closed successfully');
}

/**
 * Check if shutdown is in progress
 * 检查是否正在关闭
 */
export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}
