/**
 * @fileoverview Auth Status Component
 * @fileoverview 认证状态组件
 *
 * Server component that checks authentication status and renders UserButton.
 * Syncs admin user data from Logto to local database on each page load.
 * 检查认证状态并渲染UserButton的服务端组件。
 * 在每次页面加载时将管理员用户数据从Logto同步到本地数据库。
 *
 * @module components/auth/auth-status
 */

import { getLogtoContext, signOut } from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/logto';
import { syncAdminUserFromLogto } from '@/lib/admin-user';
import { UserButton } from './user-button';

export async function AuthStatus() {
  const context = await getLogtoContext(logtoConfig);
  const { isAuthenticated, claims } = context;

  if (!isAuthenticated || !claims) {
    return null;
  }

  // Sync admin user data from Logto to local database (lazy sync on each page load)
  await syncAdminUserFromLogto(context);

  return (
    <UserButton
      user={{
        name: claims.name as string | undefined,
        email: claims.email as string | undefined,
        picture: claims.picture as string | undefined,
      }}
      onSignOut={async () => {
        'use server';
        await signOut(logtoConfig);
      }}
    />
  );
}
