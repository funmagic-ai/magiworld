'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

type User = {
  id: string;
  name?: string;
  email?: string;
  emailVerified?: boolean;
  createdAt?: number;
};

type AccountInfoCardProps = {
  user: User;
  formattedDate?: string;
};

export function AccountInfoCard({ user, formattedDate }: AccountInfoCardProps) {
  const t = useTranslations('profile');
  const [isOpen, setIsOpen] = useState(true);
  const [memberSince, setMemberSince] = useState(formattedDate || t('account.unknown'));

  useEffect(() => {
    // Format date on client side to avoid hydration mismatch
    if (user.createdAt) {
      const date = new Date(user.createdAt * 1000);
      setMemberSince(date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }));
    }
  }, [user.createdAt]);

  return (
    <Card id="account">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full text-left">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserIcon className="h-5 w-5" />
                {t('account.title')}
              </CardTitle>
              <ChevronIcon className={cn('h-5 w-5 transition-transform', isOpen && 'rotate-180')} />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <InfoRow label={t('account.name')} value={user.name || t('account.notSet')} />
            <InfoRow
              label={t('account.email')}
              value={user.email || t('account.notSet')}
              badge={user.emailVerified ? t('account.verified') : undefined}
              badgeVariant={user.emailVerified ? 'success' : undefined}
            />
            <InfoRow label={t('account.userId')} value={user.id} mono />
            <InfoRow label={t('account.memberSince')} value={memberSince} />
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function InfoRow({
  label,
  value,
  mono,
  badge,
  badgeVariant,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: string;
  badgeVariant?: 'success' | 'warning';
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground sm:w-32 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className={cn('text-sm truncate', mono && 'font-mono text-xs')}>{value}</span>
        {badge && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full shrink-0',
            badgeVariant === 'success' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          )}>
            {badge}
          </span>
        )}
      </div>
    </div>
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

function ChevronIcon({ className }: { className?: string }) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
