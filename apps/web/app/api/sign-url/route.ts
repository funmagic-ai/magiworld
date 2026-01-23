import { NextResponse } from 'next/server';
import { getLogtoContext } from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/logto';
import { getUserByLogtoId } from '@/lib/user';
import { maybeSignUrl } from '@/lib/cloudfront';
import { env } from '@/lib/env';

/**
 * Sign URL API Endpoint
 *
 * Signs a CloudFront URL on demand. Used when a previously signed URL has expired.
 *
 * Security:
 * - Requires authentication
 * - Only signs URLs that match the CloudFront private domain
 * - URL path must contain the user's ID (ownership verification)
 *
 * @module api/sign-url
 */

interface SignUrlRequest {
  url: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const context = await getLogtoContext(logtoConfig);
    if (!context.isAuthenticated || !context.claims?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByLogtoId(context.claims.sub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = (await request.json()) as SignUrlRequest;
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    // Security: Only sign URLs from our CloudFront private domain
    if (!url.startsWith(env.CLOUDFRONT_WEB_PRIVATE_URL)) {
      return NextResponse.json(
        { error: 'Invalid URL domain' },
        { status: 403 }
      );
    }

    // Security: Verify URL path contains user's ID (ownership check)
    // URLs are structured as: https://xxx.cloudfront.net/{type}/{userId}/...
    // e.g., https://xxx.cloudfront.net/outputs/user123/task456/result.glb
    const urlPath = url.replace(env.CLOUDFRONT_WEB_PRIVATE_URL, '');
    const pathContainsUserId = urlPath.includes(`/${user.id}/`);

    if (!pathContainsUserId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Sign the URL
    const signedUrl = maybeSignUrl(url);

    return NextResponse.json({ signedUrl });
  } catch (error) {
    console.error('[Sign URL API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
