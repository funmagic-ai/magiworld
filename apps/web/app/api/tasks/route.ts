
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
 * Sign a CloudFront URL for retrieval
 * 为检索签名CloudFront URL
 *
 * URLs are stored unsigned in the database, signed on retrieval.
 * URL存储时未签名，检索时签名。
 */
function signUrlForRetrieval(url: string): string {
  return maybeSignUrl(url);
}

/**
 * Sign URLs in outputData if they are CloudFront URLs
 * 如果outputData中的URL是CloudFront URL则签名
 *
 * Returns both signed and unsigned URLs:
 * - resultUrl: signed for display (expires after 1 hour)
 * - unsignedResultUrl: unsigned for subsequent task creation (never expires)
 */
function signOutputData(outputData: unknown): unknown {
  if (!outputData || typeof outputData !== 'object') return outputData;

  const data = outputData as Record<string, unknown>;
  const signed = { ...data };

  // Sign resultUrl if present, keep unsigned version for task creation
  if (typeof signed.resultUrl === 'string') {
    signed.unsignedResultUrl = signed.resultUrl;  // Keep unsigned for task creation
    signed.resultUrl = signUrlForRetrieval(signed.resultUrl);  // Sign for display
  }

  // Sign thumbnail if present
  if (typeof signed.thumbnail === 'string') {
    signed.thumbnail = signUrlForRetrieval(signed.thumbnail);
  }

  return signed;
}

/**
 * Sign URLs in inputParams if they are CloudFront URLs
 * 如果inputParams中的URL是CloudFront URL则签名
 */
function signInputParams(inputParams: unknown): unknown {
  if (!inputParams || typeof inputParams !== 'object') return inputParams;

  const data = inputParams as Record<string, unknown>;
  const signed = { ...data };

  // Sign imageUrl if present (used as thumbnail for 3D tasks)
  if (typeof signed.imageUrl === 'string') {
    signed.imageUrl = signUrlForRetrieval(signed.imageUrl);
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

/**
 * Multi-step tools that require additional steps after the first
 * Maps tool slug to the step name that indicates it's the first step
 */
const MULTI_STEP_TOOLS: Record<string, string> = {
  'fig-me': 'transform', // transform step needs a 3d child to be complete
};

type TaskStatus = 'pending' | 'processing' | 'success' | 'failed';

interface TaskWithChildren {
  id: string;
  status: TaskStatus;
  outputData: unknown;
  toolSlug: string;
  childTasks?: TaskWithChildren[];
}

/**
 * Get effective status for a task (considers child tasks for multi-step workflows)
 * For multi-step tasks: success only if ALL expected children are success
 *
 * This is a server-side version of the function in task-card.tsx
 * 获取任务的有效状态（考虑多步骤工作流的子任务）
 */
function getEffectiveStatus(task: TaskWithChildren): TaskStatus {
  const isMultiStepTool = task.toolSlug in MULTI_STEP_TOOLS;
  const outputData = task.outputData as Record<string, unknown> | null;
  const step = outputData?.step as string | undefined;

  // Check if this is the first step of a multi-step tool
  if (isMultiStepTool) {
    const firstStepName = MULTI_STEP_TOOLS[task.toolSlug];
    const isFirstStep = step === firstStepName || !step; // No step means it's the initial task

    // If first step is complete but no child tasks yet, show as processing
    if (isFirstStep && task.status === 'success') {
      if (!task.childTasks || task.childTasks.length === 0) {
        // First step done, waiting for next step to be triggered
        return 'processing';
      }
    }
  }

  // If task has children, determine status from children
  if (task.childTasks && task.childTasks.length > 0) {
    const childStatuses = task.childTasks.map((c) => c.status);

    // If any child failed, the whole task failed
    if (childStatuses.includes('failed')) return 'failed';

    // If any child is still processing/pending, show as processing
    if (childStatuses.includes('processing')) return 'processing';
    if (childStatuses.includes('pending')) return 'pending';

    // All children must be success for the task to be success
    if (childStatuses.every((s) => s === 'success')) return 'success';

    // Default to processing if mixed states
    return 'processing';
  }

  // No children, use task's own status
  return task.status;
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

    const toolConfig = tool.configJson as Record<string, unknown> | undefined;

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
    const toolIdFilter = url.searchParams.get('toolId');
    const locale = (url.searchParams.get('locale') || 'en') as 'en' | 'ja' | 'pt' | 'zh';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const rootOnly = url.searchParams.get('rootOnly') === 'true';
    const includeChildren = url.searchParams.get('includeChildren') === 'true';

    const conditions = [eq(tasks.userId, user.id)];
    // Note: status filter is applied AFTER calculating effective status (see below)
    // Filter by tool ID if provided
    if (toolIdFilter) {
      conditions.push(eq(tasks.toolId, toolIdFilter));
    }
    // Filter to only root tasks (no parent) if requested
    if (rootOnly) {
      conditions.push(isNull(tasks.parentTaskId));
    }

    // When filtering by status, we need to fetch more tasks because effective status
    // may differ from raw status (for multi-step workflows with children)
    // Fetch extra to compensate for tasks that will be filtered out
    const fetchLimit = statusFilter ? limit * 3 + 20 : limit;

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
      .limit(fetchLimit)
      .offset(offset);

    // Fetch child tasks if requested OR if filtering by status
    // (status filter requires children to calculate effective status)
    const needChildren = includeChildren || !!statusFilter;
    let childTasksMap: Map<string, typeof result> = new Map();
    if (needChildren && result.length > 0) {
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
      inputParams: signInputParams(row.inputParams),
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

    // Build task list with children and calculate effective status
    let taskList = result.map((row) => {
      const children = childTasksMap.get(row.id) || [];

      // Calculate effective status using the server-side function
      const taskForStatus: TaskWithChildren = {
        id: row.id,
        status: row.status,
        outputData: row.outputData,
        toolSlug: row.toolSlug,
        childTasks: children.map((c) => ({
          id: c.id,
          status: c.status,
          outputData: c.outputData,
          toolSlug: c.toolSlug,
        })),
      };
      const effectiveStatus = getEffectiveStatus(taskForStatus);

      const task = formatTask(row);
      // Include child tasks if requested (not just for internal filtering)
      if (includeChildren) {
        return {
          ...task,
          childTasks: children.map(formatTask),
          _effectiveStatus: effectiveStatus, // Internal field for filtering
        };
      }
      return {
        ...task,
        _effectiveStatus: effectiveStatus,
      };
    });

    // Filter by effective status if status filter is provided
    if (statusFilter && ['pending', 'processing', 'success', 'failed'].includes(statusFilter)) {
      taskList = taskList.filter((t) => t._effectiveStatus === statusFilter);
    }

    // Apply the original limit after filtering
    const limitedTasks = taskList.slice(0, limit);

    // Remove internal _effectiveStatus field from response
    const cleanedTasks = limitedTasks.map(({ _effectiveStatus, ...rest }) => rest);

    return NextResponse.json({
      tasks: cleanedTasks,
      pagination: {
        limit,
        offset,
        hasMore: limitedTasks.length === limit,
      },
    });
  } catch (error) {
    console.error('[Tasks API] List Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
