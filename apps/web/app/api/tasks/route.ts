
import { NextResponse } from 'next/server';
import { getLogtoContext } from '@logto/next/server-actions';
import { db, tasks, tools, toolTypes, toolTranslations, toolTypeTranslations, eq, and, desc, isNull, inArray } from '@magiworld/db';
import { logtoConfig } from '@/lib/logto';
import { getUserByLogtoId } from '@/lib/user';
import { maybeSignUrl } from '@/lib/cloudfront';
import {
  enqueueTask,
  checkUserConcurrency,
  incrementUserTasks,
  checkIdempotency,
  setIdempotency,
  generateIdempotencyKey,
} from '@/lib/queue';

/**
 * Sign URLs in outputData if they are CloudFront URLs
 * 如果outputData中的URL是CloudFront URL则签名
 */
function signOutputData(outputData: unknown): unknown {
  if (!outputData || typeof outputData !== 'object') return outputData;

  const data = outputData as Record<string, unknown>;
  const signed = { ...data };

  // Sign resultUrl if present
  if (typeof signed.resultUrl === 'string') {
    signed.resultUrl = maybeSignUrl(signed.resultUrl);
  }

  return signed;
}

interface CreateTaskRequest {
  toolId: string;
  inputParams: Record<string, unknown>;
  idempotencyKey?: string;
  /** Parent task ID for multi-step workflows (e.g., Fig Me 3D step links to transform step) */
  parentTaskId?: string;
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
    const { toolId, inputParams, idempotencyKey: providedIdempotencyKey, parentTaskId } = body;

    if (!toolId || !inputParams) {
      return NextResponse.json(
        { error: 'toolId and inputParams are required' },
        { status: 400 }
      );
    }

    // Validate parentTaskId if provided
    if (parentTaskId) {
      const [parentTask] = await db
        .select({ id: tasks.id, userId: tasks.userId })
        .from(tasks)
        .where(eq(tasks.id, parentTaskId))
        .limit(1);

      if (!parentTask) {
        return NextResponse.json({ error: 'Parent task not found' }, { status: 404 });
      }

      // Ensure parent task belongs to the same user
      if (parentTask.userId !== user.id) {
        return NextResponse.json({ error: 'Parent task does not belong to user' }, { status: 403 });
      }
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
        parentTaskId: parentTaskId || null,
      })
      .returning();

    await incrementUserTasks(user.id);
    await setIdempotency(user.id, idempotencyKey, task.id);

    // Extract provider from tool config for queue routing
    // For multi-step tools, get provider from the step config
    const toolConfig = tool.configJson as Record<string, unknown> | undefined;
    let providerSlug = (toolConfig?.provider as string) || undefined;

    // Check if this is a multi-step tool and get provider from step config
    const step = (inputParams as Record<string, unknown>)?.step as string | undefined;
    if (step && toolConfig?.steps) {
      // Support both array format (new) and object format (legacy)
      let stepConfig: { provider?: string } | undefined;
      if (Array.isArray(toolConfig.steps)) {
        // Array format: find step by name
        stepConfig = (toolConfig.steps as Array<{ name: string; provider?: string }>)
          .find((s) => s.name === step);
      } else {
        // Object format (legacy): access by key
        const steps = toolConfig.steps as Record<string, { provider?: string }>;
        stepConfig = steps[step];
      }
      if (stepConfig?.provider) {
        providerSlug = stepConfig.provider;
      }
    }

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
    const rootOnly = url.searchParams.get('rootOnly') === 'true';
    const includeChildren = url.searchParams.get('includeChildren') === 'true';

    const conditions = [eq(tasks.userId, user.id)];
    if (statusFilter && ['pending', 'processing', 'success', 'failed'].includes(statusFilter)) {
      conditions.push(eq(tasks.status, statusFilter as 'pending' | 'processing' | 'success' | 'failed'));
    }
    // Filter to only root tasks (no parent) if requested
    if (rootOnly) {
      conditions.push(isNull(tasks.parentTaskId));
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
        parentTaskId: tasks.parentTaskId,
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

    // Fetch child tasks if requested
    let childTasksMap: Map<string, typeof result> = new Map();
    if (includeChildren && result.length > 0) {
      const parentIds = result.map((r) => r.id);
      const childTasks = await db
        .select({
          id: tasks.id,
          status: tasks.status,
          progress: tasks.progress,
          inputParams: tasks.inputParams,
          outputData: tasks.outputData,
          errorMessage: tasks.errorMessage,
          createdAt: tasks.createdAt,
          completedAt: tasks.completedAt,
          parentTaskId: tasks.parentTaskId,
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
        .where(inArray(tasks.parentTaskId, parentIds))
        .orderBy(desc(tasks.createdAt));

      // Group children by parent ID
      for (const child of childTasks) {
        if (child.parentTaskId) {
          const existing = childTasksMap.get(child.parentTaskId) || [];
          existing.push(child);
          childTasksMap.set(child.parentTaskId, existing);
        }
      }
    }

    const formatTask = (row: (typeof result)[0]) => ({
      id: row.id,
      status: row.status,
      progress: row.progress,
      inputParams: row.inputParams,
      outputData: signOutputData(row.outputData),
      errorMessage: row.errorMessage,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      parentTaskId: row.parentTaskId ?? null,
      tool: {
        slug: row.toolSlug,
        title: row.toolTitle,
        type: {
          slug: row.toolTypeSlug,
          name: row.toolTypeName,
          badgeColor: row.toolTypeBadgeColor,
        },
      },
    });

    const taskList = result.map((row) => {
      const task = formatTask(row);
      // Include child tasks if requested
      if (includeChildren) {
        const children = childTasksMap.get(row.id) || [];
        return {
          ...task,
          childTasks: children.map(formatTask),
        };
      }
      return task;
    });

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
