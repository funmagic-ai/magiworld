/**
 * @fileoverview SSE Stream API Route for Admin App
 * @fileoverview 管理后台SSE流API路由
 *
 * GET /api/tasks/[taskId]/stream - Stream task updates via SSE
 *
 * @module app/api/tasks/[taskId]/stream/route
 */

import { getLogtoContext } from '@logto/next/server-actions';
import { db, adminTasks, eq, and } from '@magiworld/db';
import { logtoConfig } from '@/lib/logto';
import { getAdminUserByLogtoId } from '@/lib/admin-user';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const { taskId } = await params;

  const context = await getLogtoContext(logtoConfig);
  if (!context.isAuthenticated || !context.claims?.sub) {
    return new Response('Unauthorized', { status: 401 });
  }

  const adminUser = await getAdminUserByLogtoId(context.claims.sub);
  if (!adminUser) {
    return new Response('Admin user not found', { status: 404 });
  }

  const [task] = await db
    .select()
    .from(adminTasks)
    .where(and(eq(adminTasks.id, taskId), eq(adminTasks.adminId, adminUser.id)))
    .limit(1);

  if (!task) {
    return new Response('Task not found', { status: 404 });
  }

  // If task is already complete, return final state immediately
  const isTerminalStatus = task.status === 'success' || task.status === 'failed';
  if (isTerminalStatus) {
    const finalData = JSON.stringify({
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      outputData: task.outputData,
      error: task.errorMessage,
      timestamp: Date.now(),
    });

    return new Response(`data: ${finalData}\n\n`, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const { createTaskSubscriber, getTaskChannel } = await import('@magiworld/queue');

      const subscriber = createTaskSubscriber();
      const channel = getTaskChannel(adminUser.id);

      let isOpen = true;

      subscriber.on('message', (ch: string, message: string) => {
        if (ch !== channel || !isOpen) return;

        try {
          const update = JSON.parse(message);

          if (update.taskId !== taskId) return;

          const sseMessage = `data: ${message}\n\n`;
          controller.enqueue(encoder.encode(sseMessage));

          if (update.status === 'success' || update.status === 'failed') {
            isOpen = false;
            subscriber.unsubscribe(channel);
            subscriber.quit();
            controller.close();
          }
        } catch (error) {
          console.error('[SSE] Failed to parse message:', error);
        }
      });

      subscriber.on('error', (err: Error) => {
        console.error('[SSE] Redis error:', err.message);
        if (isOpen) {
          isOpen = false;
          controller.close();
        }
      });

      await subscriber.subscribe(channel);

      // Send initial connection message
      const initialData = JSON.stringify({
        taskId: task.id,
        status: task.status,
        progress: task.progress,
        message: 'Connected to task stream',
        timestamp: Date.now(),
      });
      controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        if (isOpen) {
          isOpen = false;
          subscriber.unsubscribe(channel);
          subscriber.quit();
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
