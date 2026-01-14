/**
 * @fileoverview OAuth Callback Route
 * @fileoverview OAuth回调路由
 *
 * Handles Logto OAuth callback after user authentication.
 * Completes the sign-in flow and redirects to dashboard.
 * 处理用户认证后的Logto OAuth回调。
 * 完成登录流程并重定向到仪表板。
 *
 * @module app/callback/route
 */

import { handleSignIn } from '@logto/next/server-actions';
import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';
import { logtoConfig } from '@/lib/logto';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  await handleSignIn(logtoConfig, searchParams);

  redirect('/');
}
