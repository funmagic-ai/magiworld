import { getLogtoContext, signIn, signOut } from '@logto/next/server-actions';
import { getTranslations } from 'next-intl/server';
import { logtoConfig } from '@/lib/logto';
import { syncUserFromLogto } from '@/lib/user';
import { SignInButton } from './sign-in-button';
import { UserButton } from './user-button';

export async function AuthStatus() {
  const context = await getLogtoContext(logtoConfig);
  const { isAuthenticated, claims } = context;
  const t = await getTranslations('nav');

  if (isAuthenticated && claims) {
    await syncUserFromLogto(context);

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
        signOutLabel={t('logout')}
        profileLabel={t('profile')}
      />
    );
  }

  return (
    <SignInButton
      onSignIn={async () => {
        'use server';
        await signIn(logtoConfig);
      }}
    >
      {t('login')}
    </SignInButton>
  );
}
