import { getLogtoContext, signOut } from '@logto/next/server-actions';
import { logtoConfig } from '@/lib/logto';
import { syncAdminUserFromLogto } from '@/lib/admin-user';
import { UserButton } from './user-button';

export async function AuthStatus() {
  const context = await getLogtoContext(logtoConfig);
  const { isAuthenticated, claims } = context;

  if (!isAuthenticated || !claims) {
    return null;
  }

  // Sync admin user data from Logto to local database (lazy sync on each page load)
  await syncAdminUserFromLogto(context);

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
    />
  );
}
