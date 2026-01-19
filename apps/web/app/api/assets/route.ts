
import { NextResponse } from 'next/server';
import { getLogtoContext } from '@logto/next/server-actions';
import { db, tasks, tools, userAssets, toolTranslations, eq, and, desc, isNull } from '@magiworld/db';
import { logtoConfig } from '@/lib/logto';
import { getUserByLogtoId } from '@/lib/user';

interface SaveAssetRequest {
  taskId: string;
  name?: string;
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

    const body = (await request.json()) as SaveAssetRequest;
    const { taskId, name } = body;

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 });
    }

    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
      .limit(1);

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (task.status !== 'success' || !task.outputData) {
      return NextResponse.json({ error: 'Task has no output' }, { status: 400 });
    }

    const outputData = task.outputData as Record<string, unknown>;
    const resultUrl = outputData.resultUrl as string | undefined;

    if (!resultUrl) {
      return NextResponse.json({ error: 'No result URL in task output' }, { status: 400 });
    }

    const [tool] = await db.select().from(tools).where(eq(tools.id, task.toolId)).limit(1);
    const [existingAsset] = await db
      .select()
      .from(userAssets)
      .where(
        and(
          eq(userAssets.userId, user.id),
          eq(userAssets.taskId, taskId),
          isNull(userAssets.deletedAt)
        )
      )
      .limit(1);

    if (existingAsset) {
      return NextResponse.json({
        assetId: existingAsset.id,
        message: 'Asset already saved',
      });
    }

    const [asset] = await db
      .insert(userAssets)
      .values({
        userId: user.id,
        taskId,
        toolId: task.toolId,
        name: name || `${tool?.slug || 'result'}-${Date.now()}`,
        type: 'image',
        url: resultUrl,
        thumbnailUrl: resultUrl,
        metadata: {
          sourceTask: taskId,
          createdFrom: tool?.slug,
        },
      })
      .returning();

    return NextResponse.json({
      assetId: asset.id,
      message: 'Asset saved successfully',
    });
  } catch (error) {
    console.error('[Assets API] Save Error:', error);
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
    const locale = (url.searchParams.get('locale') || 'en') as 'en' | 'ja' | 'pt' | 'zh';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const result = await db
      .select({
        id: userAssets.id,
        name: userAssets.name,
        type: userAssets.type,
        url: userAssets.url,
        thumbnailUrl: userAssets.thumbnailUrl,
        metadata: userAssets.metadata,
        createdAt: userAssets.createdAt,
        toolTitle: toolTranslations.title,
      })
      .from(userAssets)
      .leftJoin(tools, eq(userAssets.toolId, tools.id))
      .leftJoin(
        toolTranslations,
        and(eq(toolTranslations.toolId, tools.id), eq(toolTranslations.locale, locale))
      )
      .where(and(eq(userAssets.userId, user.id), isNull(userAssets.deletedAt)))
      .orderBy(desc(userAssets.createdAt))
      .limit(limit)
      .offset(offset);

    const assets = result.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      url: row.url,
      thumbnailUrl: row.thumbnailUrl,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
      toolTitle: row.toolTitle,
    }));

    return NextResponse.json({
      assets,
      pagination: {
        limit,
        offset,
        hasMore: assets.length === limit,
      },
    });
  } catch (error) {
    console.error('[Assets API] List Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
