/**
 * @fileoverview Redis Pub/Sub Utilities
 * @fileoverview Redis 发布订阅工具
 *
 * Utilities for real-time task progress broadcasting via Redis Pub/Sub.
 * 通过 Redis 发布订阅进行实时任务进度广播的工具。
 *
 * @module @magiworld/queue/pubsub
 */

import type { Redis } from 'ioredis';
import { getPubSubConnection, createSubscriberConnection } from './redis';
import type { TaskUpdateMessage, TaskStatus } from './types';

/**
 * Channel prefix for user-specific task updates
 * 用户特定任务更新的频道前缀
 */
export const TASK_CHANNEL_PREFIX = 'task:user:';

/**
 * Get the channel name for a user's task updates
 * 获取用户任务更新的频道名称
 *
 * @param userId - User ID / 用户 ID
 * @returns Channel name / 频道名称
 */
export function getTaskChannel(userId: string): string {
  return `${TASK_CHANNEL_PREFIX}${userId}`;
}

/**
 * Publish a task update message to the user's channel
 * 向用户频道发布任务更新消息
 *
 * @param message - Task update message / 任务更新消息
 */
export async function publishTaskUpdate(message: TaskUpdateMessage): Promise<void> {
  const redis = getPubSubConnection('publisher');
  const channel = getTaskChannel(message.userId);
  const payload = JSON.stringify(message);

  await redis.publish(channel, payload);
}

/**
 * Create a task update message
 * 创建任务更新消息
 *
 * @param params - Message parameters / 消息参数
 * @returns Task update message / 任务更新消息
 */
export function createTaskUpdateMessage(params: {
  taskId: string;
  userId: string;
  status: TaskStatus;
  progress: number;
  message?: string;
  outputData?: Record<string, unknown>;
  error?: string;
}): TaskUpdateMessage {
  return {
    ...params,
    timestamp: Date.now(),
  };
}

/**
 * Create a Redis subscriber connection for task updates
 * 创建用于任务更新的 Redis 订阅者连接
 *
 * Note: Subscribers require a dedicated connection separate from the main client.
 * 注意：订阅者需要与主客户端分开的专用连接。
 *
 * @param name - Optional subscriber name for identification / 可选的订阅者名称用于标识
 * @returns Redis subscriber connection / Redis 订阅者连接
 */
export function createTaskSubscriber(name?: string): Redis {
  return createSubscriberConnection(name || `task-${Date.now()}`);
}

/**
 * Subscribe to a user's task update channel
 * 订阅用户的任务更新频道
 *
 * @param subscriber - Redis subscriber connection / Redis 订阅者连接
 * @param userId - User ID to subscribe to / 要订阅的用户 ID
 * @param onMessage - Callback for received messages / 接收消息的回调
 * @returns Cleanup function / 清理函数
 */
export async function subscribeToTaskUpdates(
  subscriber: Redis,
  userId: string,
  onMessage: (message: TaskUpdateMessage) => void
): Promise<() => Promise<void>> {
  const channel = getTaskChannel(userId);

  subscriber.on('message', (ch: string, data: string) => {
    if (ch === channel) {
      try {
        const message = JSON.parse(data) as TaskUpdateMessage;
        onMessage(message);
      } catch (error) {
        console.error('[PubSub] Failed to parse message:', error);
      }
    }
  });

  await subscriber.subscribe(channel);

  // Return cleanup function
  return async () => {
    await subscriber.unsubscribe(channel);
  };
}
