'use client';

import { useTranslations } from 'next-intl';
import { UserIcon, SettingsIcon } from '@/components/icons';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
}

interface ProfileSidebarProps {
  user: User;
  variant?: 'desktop' | 'mobile';
}

export function ProfileSidebar({ user, variant = 'desktop' }: ProfileSidebarProps) {
  const t = useTranslations('profile');
  const displayName = user.name || user.email || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  if (variant === 'mobile') {
    return (
      <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
        {user.picture ? (
          <img
            src={user.picture}
            alt={displayName}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold truncate">{displayName}</h1>
          {user.email && user.name && (
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-24 space-y-6">
      <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
        {user.picture ? (
          <img
            src={user.picture}
            alt={displayName}
            width={96}
            height={96}
            className="h-24 w-24 rounded-full object-cover mb-4"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground mb-4">
            {initials}
          </div>
        )}
        <h2 className="text-xl font-semibold">{displayName}</h2>
        {user.email && user.name && (
          <p className="text-sm text-muted-foreground">{user.email}</p>
        )}
      </div>

      <nav className="space-y-1">
        <SidebarLink href="#account" active>
          <UserIcon className="h-4 w-4" />
          {t('sidebar.account')}
        </SidebarLink>
        <SidebarLink href="#preferences">
          <SettingsIcon className="h-4 w-4" />
          {t('sidebar.preferences')}
        </SidebarLink>
      </nav>
    </div>
  );
}

interface SidebarLinkProps {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}

function SidebarLink({ href, active, children }: SidebarLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </a>
  );
}
