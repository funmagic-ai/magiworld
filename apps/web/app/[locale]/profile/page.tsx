import { redirect } from 'next/navigation';
import { getLogtoContext } from '@logto/next/server-actions';
import { getTranslations } from 'next-intl/server';
import { logtoConfig } from '@/lib/logto';
import { ProfileSidebar } from '@/components/profile/profile-sidebar';
import { AccountInfoCard } from '@/components/profile/account-info-card';
import { PreferencesCard } from '@/components/profile/preferences-card';
import { AccountActionsCard } from '@/components/profile/account-actions-card';

// Prevent static prerendering - this page requires authentication
// 防止静态预渲染 - 此页面需要身份验证
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const { isAuthenticated, claims, userInfo } = await getLogtoContext(logtoConfig);
  const t = await getTranslations('profile');

  // Redirect to home if not authenticated
  if (!isAuthenticated || !claims) {
    redirect('/');
  }

  // userInfo contains full user data when fetchUserInfo is enabled
  const user = {
    id: claims.sub,
    name: userInfo?.name || (claims.name as string | undefined),
    email: userInfo?.email || (claims.email as string | undefined),
    picture: userInfo?.picture || (claims.picture as string | undefined),
    emailVerified: userInfo?.email_verified ?? (claims.email_verified as boolean | undefined),
    createdAt: claims.iat as number | undefined, // Use iat (issued at) as fallback for account creation
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar - visible on desktop, hidden on mobile */}
        <aside className="hidden lg:block lg:w-64 shrink-0">
          <ProfileSidebar user={user} />
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-6">
          {/* Mobile: Show avatar at top */}
          <div className="lg:hidden">
            <ProfileSidebar user={user} variant="mobile" />
          </div>

          {/* Account Info Card */}
          <AccountInfoCard user={user} />

          {/* Preferences Card */}
          <PreferencesCard />

          {/* Account Actions Card */}
          <AccountActionsCard />
        </main>
      </div>
    </div>
  );
}
