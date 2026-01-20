import { getLogtoContext } from '@logto/next/server-actions';
import { db, tasks, eq, and } from '@magiworld/db';
import { logtoConfig } from '@/lib/logto';
import { getUserByLogtoId } from '@/lib/user';
import { maybeSignUrl } from '@/lib/cloudfront';

/**
 * Sign URLs in outputData if they are CloudFront URLs
 * 如果outputData中的URL是CloudFront URL则签名
 */
function signOutputData(outputData: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!outputData) return null;

  const signed = { ...outputData };

  // Sign resultUrl if present
  if (typeof signed.resultUrl === 'string') {
    signed.resultUrl = maybeSignUrl(signed.resultUrl);
  }

  return signed;
}

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const { taskId } = await params;

  const context = await getLogtoContext(logtoConfig);
  if (!context.isAuthenticated || !context.claims?.sub) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = await getUserByLogtoId(context.claims.sub);
  if (!user) {
    return new Response('User not found', { status: 404 });
  }

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
    .limit(1);

  if (!task) {
    return new Response('Task not found', { status: 404 });
  }

  const isTerminalStatus = task.status === 'success' || task.status === 'failed';
  if (isTerminalStatus) {
    const finalData = JSON.stringify({
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      outputData: signOutputData(task.outputData as Record<string, unknown> | null),
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
      const channel = getTaskChannel(user.id);

      let isOpen = true;

      subscriber.on('message', (ch: string, message: string) => {
        if (ch !== channel || !isOpen) return;

        try {
          const update = JSON.parse(message);

          if (update.taskId !== taskId) return;

          // Sign URLs in outputData before sending to client
          if (update.outputData) {
            update.outputData = signOutputData(update.outputData);
          }

          const sseMessage = `data: ${JSON.stringify(update)}\n\n`;
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

      const initialData = JSON.stringify({
        taskId: task.id,
        status: task.status,
        progress: task.progress,
        message: 'Connected to task stream',
        timestamp: Date.now(),
      });
      controller.enqueue(encoder.encode(`data: ${initialData}\n\n`));

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
