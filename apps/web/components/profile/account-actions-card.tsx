import { signOut } from '@logto/next/server-actions';
import { getTranslations } from 'next-intl/server';
import { logtoConfig } from '@/lib/logto';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SignOutButton } from './sign-out-button';

export async function AccountActionsCard() {
  const t = await getTranslations('profile');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LogOutIcon className="h-5 w-5" />
          {t('actions.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {t('actions.signOutDescription')}
        </p>
        <SignOutButton
          onSignOut={async () => {
            'use server';
            await signOut(logtoConfig);
          }}
        >
          {t('actions.signOut')}
        </SignOutButton>
      </CardContent>
    </Card>
  );
}

function LogOutIcon({ className }: { className?: string }) {
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
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}
