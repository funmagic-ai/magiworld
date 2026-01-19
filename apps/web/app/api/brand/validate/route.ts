import { NextResponse } from 'next/server';
import { db, oemSoftwareBrands, eq } from '@magiworld/db';

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const softwareId = searchParams.get('software_id');

  if (!softwareId) {
    return NextResponse.json({ error: 'software_id is required' }, { status: 400 });
  }

  try {
    const [brand] = await db
      .select()
      .from(oemSoftwareBrands)
      .where(eq(oemSoftwareBrands.softwareId, softwareId))
      .limit(1);

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    if (!brand.isActive) {
      return NextResponse.json({ error: 'Brand is inactive' }, { status: 403 });
    }

    return NextResponse.json({
      id: brand.id,
      slug: brand.slug,
      softwareId: brand.softwareId,
      themeConfig: brand.themeConfig || {},
      allowedToolTypeIds: brand.allowedToolTypeIds || [],
      isActive: brand.isActive,
    });
  } catch (error) {
    console.error('[Brand Validate] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
