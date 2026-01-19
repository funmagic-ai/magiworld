
import { NextResponse } from 'next/server';
import { getLogtoContext } from '@logto/next/server-actions';
import { db, tasks, tools, toolTypes, toolTranslations, toolTypeTranslations, eq, and, desc } from '@magiworld/db';
import { logtoConfig } from '@/lib/logto';
import { getUserByLogtoId } from '@/lib/user';
import {
  enqueueTask,
  checkUserConcurrency,
  incrementUserTasks,
  checkIdempotency,
  setIdempotency,
  generateIdempotencyKey,
} from '@/lib/queue';

interface CreateTaskRequest {
  toolId: string;
  inputParams: Record<string, unknown>;
  idempotencyKey?: string;
}
export async function POST(request: Request) {
  try {
    const context = await getLogtoContext(logtoConfig);
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByLogtoId(context.claims.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = (await request.json()) as CreateTaskRequest;
    const { toolId, inputParams, idempotencyKey: providedIdempotencyKey } = body;

    if (!toolId || !inputParams) {
      return NextResponse.json(
        { error: 'toolId and inputParams are required' },
        { status: 400 }
      );
    }

    const idempotencyKey =
      providedIdempotencyKey || (await generateIdempotencyKey({ toolId, ...inputParams }));
    const idempotencyCheck = await checkIdempotency(user.id, idempotencyKey);
    if (idempotencyCheck.exists && idempotencyCheck.taskId) {
      const [existingTask] = await db
        .select()
        .from(tasks)
        .where(eq(tasks.id, idempotencyCheck.taskId))
        .limit(1);

      if (existingTask) {
        return NextResponse.json({
          taskId: existingTask.id,
          status: existingTask.status,
          message: 'Task already exists',
        });
      }
    }
    const concurrencyCheck = await checkUserConcurrency(user.id);
    if (!concurrencyCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Too many active tasks',
          current: concurrencyCheck.current,
          max: concurrencyCheck.max,
        },
        { status: 429 }
      );
    }

    const [tool] = await db.select().from(tools).where(eq(tools.id, toolId)).limit(1);

    if (!tool) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    if (!tool.isActive) {
      return NextResponse.json({ error: 'Tool is not available' }, { status: 503 });
    }
    const [task] = await db
      .insert(tasks)
      .values({
        userId: user.id,
        toolId: tool.id,
        inputParams,
        status: 'pending',
        priority: 5,
        progress: 0,
        idempotencyKey,
        requestId: crypto.randomUUID(),
      })
      .returning();

    await incrementUserTasks(user.id);
    await setIdempotency(user.id, idempotencyKey, task.id);

    // Extract provider from tool config for queue routing
    const toolConfig = tool.configJson as Record<string, unknown> | undefined;
    const providerSlug = (toolConfig?.provider as string) || undefined;

    const jobId = await enqueueTask({
      taskId: task.id,
      userId: user.id,
      toolId: tool.id,
      toolSlug: tool.slug,
      inputParams,
      priceConfig: tool.priceConfig as import('@magiworld/queue').PriceConfig | undefined,
      toolConfig,
      idempotencyKey,
      requestId: task.requestId!,
      providerSlug, // Route to fal_ai, google, or openai queue
    });

    await db.update(tasks).set({ bullJobId: jobId }).where(eq(tasks.id, task.id));

    return NextResponse.json({
      taskId: task.id,
      status: 'pending',
      message: 'Task created successfully',
    });
  } catch (error) {
    console.error('[Tasks API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const context = await getLogtoContext(logtoConfig);
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByLogtoId(context.claims.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const locale = (url.searchParams.get('locale') || 'en') as 'en' | 'ja' | 'pt' | 'zh';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const conditions = [eq(tasks.userId, user.id)];
    if (statusFilter && ['pending', 'processing', 'success', 'failed'].includes(statusFilter)) {
      conditions.push(eq(tasks.status, statusFilter as 'pending' | 'processing' | 'success' | 'failed'));
    }
    const result = await db
      .select({
        id: tasks.id,
        status: tasks.status,
        progress: tasks.progress,
        inputParams: tasks.inputParams,
        outputData: tasks.outputData,
        errorMessage: tasks.errorMessage,
        createdAt: tasks.createdAt,
        completedAt: tasks.completedAt,
        toolSlug: tools.slug,
        toolTitle: toolTranslations.title,
        toolTypeSlug: toolTypes.slug,
        toolTypeName: toolTypeTranslations.name,
        toolTypeBadgeColor: toolTypes.badgeColor,
      })
      .from(tasks)
      .innerJoin(tools, eq(tasks.toolId, tools.id))
      .innerJoin(toolTypes, eq(tools.toolTypeId, toolTypes.id))
      .innerJoin(
        toolTranslations,
        and(eq(toolTranslations.toolId, tools.id), eq(toolTranslations.locale, locale))
      )
      .innerJoin(
        toolTypeTranslations,
        and(eq(toolTypeTranslations.toolTypeId, toolTypes.id), eq(toolTypeTranslations.locale, locale))
      )
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt))
      .limit(limit)
      .offset(offset);

    const taskList = result.map((row) => ({
      id: row.id,
      status: row.status,
      progress: row.progress,
      inputParams: row.inputParams,
      outputData: row.outputData,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      tool: {
        slug: row.toolSlug,
        title: row.toolTitle,
        type: {
          slug: row.toolTypeSlug,
          name: row.toolTypeName,
          badgeColor: row.toolTypeBadgeColor,
        },
      },
    }));

    return NextResponse.json({
      tasks: taskList,
      pagination: {
        limit,
        offset,
        hasMore: taskList.length === limit,
      },
    });
  } catch (error) {
    console.error('[Tasks API] List Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
