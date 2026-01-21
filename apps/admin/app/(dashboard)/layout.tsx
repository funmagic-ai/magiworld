/**
 * @fileoverview Dashboard Layout
 * @fileoverview 仪表板布局
 *
 * Protected layout with sidebar navigation and auth check.
 * Redirects to login if not authenticated.
 * 带侧边栏导航和认证检查的受保护布局。
 * 未认证则重定向到登录页面。
 *
 * @module app/(dashboard)/layout
 */

import { redirect } from 'next/navigation';
import { getLogtoContext } from '@logto/next/server-actions';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { logtoConfig } from '@/lib/logto';
import { syncAdminUserFromLogto } from '@/lib/admin-user';

// Prevent static prerendering - dashboard requires authentication
// 防止静态预渲染 - 仪表板需要认证
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await getLogtoContext(logtoConfig);

  if (!context.isAuthenticated || !context.claims) {
    redirect('/login');
  }

  // Sync admin user data from Logto to local database (once per request)
  // 从Logto同步管理员用户数据到本地数据库（每次请求一次）
  await syncAdminUserFromLogto(context);

  // Extract user data for sidebar
  const user = {
    name: context.claims.name as string | undefined,
    email: context.claims.email as string | undefined,
    picture: context.claims.picture as string | undefined,
  };

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:hidden">
          <SidebarTrigger className="-ml-1" />
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
