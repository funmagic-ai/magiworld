/**
 * @fileoverview Login Page
 * @fileoverview 登录页面
 *
 * Authentication page with Logto sign-in integration.
 * Redirects to dashboard if already authenticated.
 * 使用Logto登录集成的认证页面。
 * 如果已认证则重定向到仪表板。
 *
 * @module app/login/page
 */

import { redirect } from 'next/navigation';
import { getLogtoContext, signIn } from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/logto';
import { SignInButton } from '@/components/auth/sign-in-button';

// Prevent static prerendering - this page requires Logto authentication check
// 防止静态预渲染 - 此页面需要Logto认证检查
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const { isAuthenticated } = await getLogtoContext(logtoConfig);

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    redirect('/');
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-2xl font-bold">M</span>
          </div>
          <h1 className="text-2xl font-bold">Magiworld Admin</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access the admin dashboard
          </p>
        </div>
        <SignInButton
          onSignIn={async () => {
            'use server';
            await signIn(logtoConfig);
          }}
        >
          Sign in with Logto
        </SignInButton>
      </div>
    </div>
  );
}
