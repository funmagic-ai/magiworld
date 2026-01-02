'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

type User = {
  id: string;
  name?: string;
  email?: string;
  picture?: string;
};

type ProfileSidebarProps = {
  user: User;
  variant?: 'desktop' | 'mobile';
};

export function ProfileSidebar({ user, variant = 'desktop' }: ProfileSidebarProps) {
  const t = useTranslations('profile');
  const displayName = user.name || user.email || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  if (variant === 'mobile') {
    return (
      <div className="flex items-center gap-4 p-4 bg-card rounded-lg border">
        {/* Avatar */}
        {user.picture ? (
          <img
            src={user.picture}
            alt={displayName}
            className="h-16 w-16 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">
            {initials}
          </div>
        )}
        {/* Name and Email */}
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
      {/* Avatar Section */}
      <div className="flex flex-col items-center text-center p-6 bg-card rounded-lg border">
        {user.picture ? (
          <img
            src={user.picture}
            alt={displayName}
            className="h-24 w-24 rounded-full object-cover mb-4"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground mb-4">
            {initials}
          </div>
        )}
       
        {user.email && user.name && (
          <p className="text-sm text-muted-foreground">{user.email}</p>
        )}
      </div>

      {/* Navigation */}
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

function SidebarLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
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

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
