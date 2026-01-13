import { redirect } from 'next/navigation';
import { getLogtoContext } from '@logto/next/server-actions';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AuthStatus } from '@/components/auth/auth-status';
import { logtoConfig } from '@/lib/logto';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = await getLogtoContext(logtoConfig);

  if (!isAuthenticated) {
    redirect('/login');
  }

  return (
    <SidebarProvider>
      <AppSidebar footer={<AuthStatus />} />
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
