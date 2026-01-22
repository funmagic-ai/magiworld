import { NextResponse } from 'next/server';
import { getLogtoContext } from '@logto/next/server-actions';
import { db, tasks, eq, and } from '@magiworld/db';
import { logtoConfig } from '@/lib/logto';
import { getUserByLogtoId } from '@/lib/user';
import { maybeSignUrl } from '@/lib/cloudfront';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

/**
 * Sign URLs in outputData if they are CloudFront URLs
 * Returns both signed (for display) and unsigned (for task creation) URLs
 */
function signOutputData(outputData: unknown): unknown {
  if (!outputData || typeof outputData !== 'object') return outputData;

  const data = outputData as Record<string, unknown>;
  const signed = { ...data };

  if (typeof signed.resultUrl === 'string') {
    signed.unsignedResultUrl = signed.resultUrl;
    signed.resultUrl = maybeSignUrl(signed.resultUrl);
  }

  if (typeof signed.thumbnail === 'string') {
    signed.thumbnail = maybeSignUrl(signed.thumbnail);
  }

  return signed;
}

/**
 * Sign URLs in inputParams for display
 */
function signInputParams(inputParams: unknown): unknown {
  if (!inputParams || typeof inputParams !== 'object') return inputParams;

  const data = inputParams as Record<string, unknown>;
  const signed = { ...data };

  if (typeof signed.imageUrl === 'string') {
    signed.imageUrl = maybeSignUrl(signed.imageUrl);
  }

  if (typeof signed.referenceImageUrl === 'string') {
    signed.referenceImageUrl = maybeSignUrl(signed.referenceImageUrl);
  }

  return signed;
}

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { taskId } = await params;
    const url = new URL(request.url);
    const includeChildren = url.searchParams.get('includeChildren') === 'true';

    const context = await getLogtoContext(logtoConfig);
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByLogtoId(context.claims.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Build response
    const response: Record<string, unknown> = {
      id: task.id,
      status: task.status,
      progress: task.progress,
      inputParams: signInputParams(task.inputParams),
      outputData: signOutputData(task.outputData),
      errorMessage: task.errorMessage,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
    };

    // Fetch child tasks if requested
    if (includeChildren) {
      const childTasks = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.parentTaskId, taskId), eq(tasks.userId, user.id)));

      response.childTasks = childTasks.map((child) => ({
        id: child.id,
        status: child.status,
        progress: child.progress,
        inputParams: signInputParams(child.inputParams),
        outputData: signOutputData(child.outputData),
        errorMessage: child.errorMessage,
        createdAt: child.createdAt,
        completedAt: child.completedAt,
      }));
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Tasks API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
