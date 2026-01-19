/**
 * @fileoverview Admin Tasks API Route
 * @fileoverview 管理后台任务API路由
 *
 * POST /api/tasks - Create a new admin task
 * GET /api/tasks - List tasks for current admin
 *
 * Uses the adminTasks table for internal Magi tools.
 * 使用 adminTasks 表存储内部 Magi 工具任务。
 *
 * @module app/api/tasks/route
 */

import { NextResponse } from 'next/server';
import { getLogtoContext } from '@logto/next/server-actions';
import { db, adminTasks, eq, and, desc } from '@magiworld/db';
import { logtoConfig } from '@/lib/logto';
import { getAdminUserByLogtoId } from '@/lib/admin-user';
import {
  enqueueTask,
  incrementUserTasks,
  checkIdempotency,
  setIdempotency,
  generateIdempotencyKey,
} from '@/lib/queue';
import { isMagiTool, getMagiTool, MAGI_TOOLS } from '@/lib/magi-tools';

interface CreateTaskRequest {
  toolSlug: string;
  inputParams: Record<string, unknown>;
  idempotencyKey?: string;
}

/**
 * POST /api/tasks - Create a new admin task
 */
export async function POST(request: Request) {
  try {
    const context = await getLogtoContext(logtoConfig);
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await getAdminUserByLogtoId(context.claims.sub);
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    const body = (await request.json()) as CreateTaskRequest;
    const { toolSlug, inputParams, idempotencyKey: providedIdempotencyKey } = body;

    if (!toolSlug || !inputParams) {
      return NextResponse.json(
        { error: 'toolSlug and inputParams are required' },
        { status: 400 }
      );
    }

    // Validate it's a known Magi tool
    if (!isMagiTool(toolSlug)) {
      return NextResponse.json(
        { error: `Unknown tool: ${toolSlug}. Available: ${Object.keys(MAGI_TOOLS).join(', ')}` },
        { status: 404 }
      );
    }

    const magiTool = getMagiTool(toolSlug);
    if (!magiTool || !magiTool.isActive) {
      return NextResponse.json({ error: 'Tool is not available' }, { status: 503 });
    }

    // Generate or use provided idempotency key
    const idempotencyKey =
      providedIdempotencyKey || (await generateIdempotencyKey({ toolSlug, ...inputParams }));

    // Check idempotency
    const idempotencyCheck = await checkIdempotency(adminUser.id, idempotencyKey);
    if (idempotencyCheck.exists && idempotencyCheck.taskId) {
      const [existingTask] = await db
        .select()
        .from(adminTasks)
        .where(eq(adminTasks.id, idempotencyCheck.taskId))
        .limit(1);

      if (existingTask) {
        return NextResponse.json({
          taskId: existingTask.id,
          status: existingTask.status,
          message: 'Task already exists',
        });
      }
    }

    // Create task in adminTasks table
    const requestId = crypto.randomUUID();
    const [task] = await db
      .insert(adminTasks)
      .values({
        adminId: adminUser.id,
        toolSlug,
        inputParams,
        status: 'pending',
        priority: 15, // Admin priority
        progress: 0,
        idempotencyKey,
        requestId,
      })
      .returning();

    // Increment user task count and set idempotency
    await incrementUserTasks(adminUser.id);
    await setIdempotency(adminUser.id, idempotencyKey, task.id);

    // Extract provider from tool config for queue routing
    const providerSlug = (magiTool.configJson?.provider as string) || undefined;

    // Enqueue task to BullMQ (routes to provider-specific queue)
    const jobId = await enqueueTask({
      taskId: task.id,
      userId: adminUser.id,
      toolId: `admin:${toolSlug}`, // Virtual tool ID for admin tasks
      toolSlug,
      inputParams,
      toolConfig: magiTool.configJson,
      idempotencyKey,
      requestId,
      providerSlug, // Route to fal_ai, google, or openai queue
    });

    // Update task with job ID
    await db.update(adminTasks).set({ bullJobId: jobId }).where(eq(adminTasks.id, task.id));

    return NextResponse.json({
      taskId: task.id,
      status: 'pending',
      message: 'Task created successfully',
    });
  } catch (error) {
    console.error('[Admin Tasks API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/tasks - List tasks for current admin
 */
export async function GET(request: Request) {
  try {
    const context = await getLogtoContext(logtoConfig);
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await getAdminUserByLogtoId(context.claims.sub);
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    const url = new URL(request.url);
    const statusFilter = url.searchParams.get('status');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Build conditions - admin sees their own tasks
    const conditions = [eq(adminTasks.adminId, adminUser.id)];
    if (statusFilter && ['pending', 'processing', 'success', 'failed'].includes(statusFilter)) {
      conditions.push(eq(adminTasks.status, statusFilter as 'pending' | 'processing' | 'success' | 'failed'));
    }

    const result = await db
      .select({
        id: adminTasks.id,
        toolSlug: adminTasks.toolSlug,
        status: adminTasks.status,
        progress: adminTasks.progress,
        inputParams: adminTasks.inputParams,
        outputData: adminTasks.outputData,
        errorMessage: adminTasks.errorMessage,
        createdAt: adminTasks.createdAt,
        completedAt: adminTasks.completedAt,
      })
      .from(adminTasks)
      .where(and(...conditions))
      .orderBy(desc(adminTasks.createdAt))
      .limit(limit)
      .offset(offset);

    // Enrich with Magi tool metadata
    const taskList = result.map((row) => {
      const magiTool = getMagiTool(row.toolSlug);
      return {
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
          title: magiTool?.name || row.toolSlug,
          type: {
            slug: 'magi',
            name: 'Magi',
            badgeColor: 'secondary',
          },
        },
      };
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
    console.error('[Admin Tasks API] List Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
