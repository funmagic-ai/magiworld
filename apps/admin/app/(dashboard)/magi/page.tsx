import { Suspense } from 'react';
import { db, adminTasks, adminUsers, desc, eq } from '@magiworld/db';
import { MagiClient, MagiClientSkeleton } from '@/components/ai/magi-client';
import type { TaskItem } from '@/components/ai/magi-tasks-list';
import { MAGI_TOOLS } from '@/lib/magi-tools';

async function getTasks(): Promise<TaskItem[]> {
  const results = await db
    .select({
      id: adminTasks.id,
      status: adminTasks.status,
      progress: adminTasks.progress,
      inputParams: adminTasks.inputParams,
      outputData: adminTasks.outputData,
      errorMessage: adminTasks.errorMessage,
      createdAt: adminTasks.createdAt,
      completedAt: adminTasks.completedAt,
      toolSlug: adminTasks.toolSlug,
      adminName: adminUsers.name,
      adminEmail: adminUsers.email,
    })
    .from(adminTasks)
    .leftJoin(adminUsers, eq(adminTasks.adminId, adminUsers.id))
    .orderBy(desc(adminTasks.createdAt))
    .limit(100);

  return results.map((r) => ({
    id: r.id,
    status: r.status as TaskItem['status'],
    progress: r.progress ?? 0,
    inputParams: r.inputParams as Record<string, unknown> | null,
    outputData: r.outputData as Record<string, unknown> | null,
    errorMessage: r.errorMessage,
    createdAt: r.createdAt,
    completedAt: r.completedAt,
    // Get tool name from MAGI_TOOLS config
    toolName: MAGI_TOOLS[r.toolSlug]?.name || r.toolSlug,
    userName: r.adminName || r.adminEmail?.split('@')[0] || 'Unknown',
    userEmail: r.adminEmail,
  }));
}

export default async function MagiPage() {
  const tasksList = await getTasks();

  return (
    <Suspense fallback={<MagiClientSkeleton />}>
      <MagiClient tasks={tasksList} />
    </Suspense>
  );
}
