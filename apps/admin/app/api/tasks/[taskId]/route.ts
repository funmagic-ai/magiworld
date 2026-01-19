/**
 * @fileoverview Single Task API Route for Admin App
 * @fileoverview 管理后台单个任务API路由
 *
 * GET /api/tasks/[taskId] - Get task details
 *
 * @module app/api/tasks/[taskId]/route
 */

import { NextResponse } from 'next/server';
import { getLogtoContext } from '@logto/next/server-actions';
import { db, adminTasks, eq, and } from '@magiworld/db';
import { logtoConfig } from '@/lib/logto';
import { getAdminUserByLogtoId } from '@/lib/admin-user';

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(request: Request, { params }: RouteParams): Promise<NextResponse> {
  try {
    const { taskId } = await params;

    const context = await getLogtoContext(logtoConfig);
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await getAdminUserByLogtoId(context.claims.sub);
    if (!adminUser) {
      return NextResponse.json({ error: 'Admin user not found' }, { status: 404 });
    }

    const [task] = await db
      .select()
      .from(adminTasks)
      .where(and(eq(adminTasks.id, taskId), eq(adminTasks.adminId, adminUser.id)))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: task.id,
      status: task.status,
      progress: task.progress,
      outputData: task.outputData,
      errorMessage: task.errorMessage,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
    });
  } catch (error) {
    console.error('[Admin Tasks API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
