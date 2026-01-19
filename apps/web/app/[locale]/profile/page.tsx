import { redirect } from 'next/navigation';
import { getLogtoContext } from '@logto/next/server-actions';
import { getTranslations } from 'next-intl/server';
import { logtoConfig } from '@/lib/logto';
import { ProfileSidebar } from '@/components/profile/profile-sidebar';
import { AccountInfoCard } from '@/components/profile/account-info-card';
import { PreferencesCard } from '@/components/profile/preferences-card';
import { AccountActionsCard } from '@/components/profile/account-actions-card';

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const { isAuthenticated, claims, userInfo } = await getLogtoContext(logtoConfig);
  const t = await getTranslations('profile');

  if (!isAuthenticated || !claims) {
    redirect('/');
  }

  const user = {
    id: claims.sub,
    name: userInfo?.name || (claims.name as string | undefined),
    email: userInfo?.email || (claims.email as string | undefined),
    picture: userInfo?.picture || (claims.picture as string | undefined),
    emailVerified: userInfo?.email_verified ?? (claims.email_verified as boolean | undefined),
    createdAt: claims.iat as number | undefined,
  };

  return (
    <div className="container py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="hidden lg:block lg:w-64 shrink-0">
          <ProfileSidebar user={user} />
        </aside>

        <main className="flex-1 space-y-6">
          <div className="lg:hidden">
            <ProfileSidebar user={user} variant="mobile" />
          </div>

          <AccountInfoCard user={user} />
          <PreferencesCard />
          <AccountActionsCard />
        </main>
      </div>
    </div>
  );
}
