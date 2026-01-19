
import { NextResponse } from 'next/server';
import { getLogtoContext } from '@logto/next/server-actions';
import { db, userAssets, eq, and } from '@magiworld/db';
import { logtoConfig } from '@/lib/logto';
import { getUserByLogtoId } from '@/lib/user';

interface RouteParams {
  params: Promise<{ assetId: string }>;
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { assetId } = await params;

    const context = await getLogtoContext(logtoConfig);
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByLogtoId(context.claims.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const [asset] = await db
      .update(userAssets)
      .set({ deletedAt: new Date() })
      .where(and(eq(userAssets.id, assetId), eq(userAssets.userId, user.id)))
      .returning();

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error('[Assets API] Delete Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
