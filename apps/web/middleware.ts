/**
 * @fileoverview Next.js Middleware
 *
 * Combines:
 * 1. next-intl internationalization middleware
 * 2. OEM brand detection based on software_id query parameter
 *
 * Brand Detection Flow:
 * 1. Desktop software opens: https://yoursite.com/?software_id=PARTNER_A_2024
 * 2. Middleware detects software_id, validates brand via direct DB call
 * 3. If valid: sets brand cookie, redirects to clean URL
 * 4. Subsequent requests: brand context read from cookie (no DB call)
 *
 * Note: This middleware uses Node.js runtime (not Edge) to support
 * direct database access. Consider switching to Redis for Edge compatibility.
 *
 * @module middleware
 */

import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { db, oemSoftwareBrands, eq } from '@magiworld/db';

// Force Node.js runtime for database access
export const runtime = 'nodejs';

const BRAND_COOKIE_NAME = 'oem_brand';
const BRAND_COOKIE_MAX_AGE = 60 * 60 * 24; // 24 hours

// Create the i18n middleware
const intlMiddleware = createMiddleware(routing);

/**
 * Validate and retrieve brand by software ID.
 * This is the function to replace with Redis lookup in the future.
 */
async function getBrandBySoftwareId(softwareId: string) {
  try {
    const [brand] = await db
      .select()
      .from(oemSoftwareBrands)
      .where(eq(oemSoftwareBrands.softwareId, softwareId))
      .limit(1);

    if (!brand || !brand.isActive) {
      return null;
    }

    return {
      id: brand.id,
      slug: brand.slug,
      softwareId: brand.softwareId,
      themeConfig: brand.themeConfig || {},
      allowedToolTypeIds: brand.allowedToolTypeIds || [],
    };
  } catch (error) {
    console.error('[Middleware] Brand lookup error:', error);
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const { searchParams, pathname } = request.nextUrl;
  const softwareId = searchParams.get('software_id');

  // If software_id is present, validate and set cookie
  if (softwareId) {
    const brand = await getBrandBySoftwareId(softwareId);

    // Create redirect URL without software_id
    const cleanUrl = new URL(pathname, request.url);
    searchParams.forEach((value, key) => {
      if (key !== 'software_id') {
        cleanUrl.searchParams.set(key, value);
      }
    });

    if (brand) {
      const redirectResponse = NextResponse.redirect(cleanUrl);

      // Set brand cookie
      redirectResponse.cookies.set(BRAND_COOKIE_NAME, JSON.stringify({
        id: brand.id,
        slug: brand.slug,
        softwareId: brand.softwareId,
        themeConfig: brand.themeConfig,
        allowedToolTypeIds: brand.allowedToolTypeIds,
      }), {
        maxAge: BRAND_COOKIE_MAX_AGE,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
      });

      return redirectResponse;
    }

    // If validation failed, just clean the URL and continue
    return NextResponse.redirect(cleanUrl);
  }

  // Run i18n middleware for all other requests
  return intlMiddleware(request);
}

export const config = {
  // Match all pathnames except for API routes, static files, and _next internal paths
  matcher: ['/', '/(en|ja|pt|zh)/:path*'],
};
