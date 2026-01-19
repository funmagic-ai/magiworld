import { signOut } from '@logto/next/server-actions';
import { getTranslations } from 'next-intl/server';
import { logtoConfig } from '@/lib/logto';
import { LogOutIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export async function AccountActionsCard() {
  const t = await getTranslations('profile');

  async function handleSignOut(): Promise<void> {
    'use server';
    await signOut(logtoConfig);
  }

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
        <form action={handleSignOut}>
          <Button type="submit" variant="destructive">
            {t('actions.signOut')}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
