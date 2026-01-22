import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/logto';
import { getUserByLogtoId } from '@/lib/user';
import { maybeSignUrl } from '@/lib/cloudfront';

/**
 * User-level SSE endpoint for task updates
 *
 * Streams ALL task updates for the authenticated user.
 * Used by task lists for real-time progress updates.
 *
 * @module api/tasks/stream
 */

/**
 * Sign URLs in outputData if they are CloudFront URLs
 */
function signOutputData(outputData: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!outputData) return null;

  const signed = { ...outputData };

  if (typeof signed.resultUrl === 'string') {
    signed.unsignedResultUrl = signed.resultUrl;
    signed.resultUrl = maybeSignUrl(signed.resultUrl);
  }

  return signed;
}

export async function GET(request: Request): Promise<Response> {
  const context = await getLogtoContext(logtoConfig);
  if (!context.isAuthenticated || !context.claims?.sub) {
    return new Response('Unauthorized', { status: 401 });
  }

  const user = await getUserByLogtoId(context.claims.sub);
  if (!user) {
    return new Response('User not found', { status: 404 });
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

          // Sign URLs in outputData before sending to client
          if (update.outputData) {
            update.outputData = signOutputData(update.outputData);
          }

          const sseMessage = `data: ${JSON.stringify(update)}\n\n`;
          controller.enqueue(encoder.encode(sseMessage));

          // Don't close on terminal status - keep listening for other tasks
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
        type: 'connected',
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
