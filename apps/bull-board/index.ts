/**
 * @fileoverview Bull Board - Queue Monitoring Dashboard
 * @fileoverview Bull Board - 队列监控仪表板
 *
 * Provides a web UI for monitoring all BullMQ queues.
 * 提供一个用于监控所有 BullMQ 队列的 Web UI。
 *
 * @module @magiworld/bull-board
 */

import express from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

// Configuration
const PORT = parseInt(process.env.PORT || '8082', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Queue names (base names without prefix)
const BASE_QUEUE_NAMES = ['default', 'fal_ai', 'google', 'openai'];

// Prefixes to monitor
const QUEUE_PREFIXES = ['', 'admin']; // empty string = web queues

console.log('[Bull Board] Starting...');
console.log('[Bull Board] Redis URL:', REDIS_URL);

// Create Redis connection
const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisConnection.on('connect', () => {
  console.log('[Bull Board] Redis connected');
});

redisConnection.on('error', (err) => {
  console.error('[Bull Board] Redis error:', err.message);
});

// Create queues for all combinations of prefix + base name
const queues: Queue[] = [];

for (const prefix of QUEUE_PREFIXES) {
  for (const baseName of BASE_QUEUE_NAMES) {
    const queueName = prefix ? `${prefix}_${baseName}` : baseName;
    const queue = new Queue(queueName, {
      connection: redisConnection,
    });
    queues.push(queue);
    console.log(`[Bull Board] Registered queue: ${queueName}`);
  }
}

// Create Bull Board adapters
const queueAdapters = queues.map((queue) => new BullMQAdapter(queue));

// Create Express adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/');

// Create Bull Board
createBullBoard({
  queues: queueAdapters,
  serverAdapter,
});

// Create Express app
const app = express();

// Mount Bull Board
app.use('/', serverAdapter.getRouter());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', queues: queues.length });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Bull Board] Dashboard available at http://localhost:${PORT}`);
  console.log(`[Bull Board] Monitoring ${queues.length} queues`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Bull Board] Shutting down...');
  for (const queue of queues) {
    await queue.close();
  }
  await redisConnection.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Bull Board] Shutting down...');
  for (const queue of queues) {
    await queue.close();
  }
  await redisConnection.quit();
  process.exit(0);
});
