import { db, users, eq, type User } from '@magiworld/db';
import type { LogtoContext } from '@logto/next';

type LogtoUserData = {
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
};

function extractUserData(context: LogtoContext): LogtoUserData | null {
  const { claims, userInfo } = context;

  if (!claims?.sub) {
    return null;
  }

  return {
    sub: claims.sub,
    email: userInfo?.email ?? (claims.email as string | undefined),
    emailVerified: userInfo?.email_verified ?? (claims.email_verified as boolean | undefined),
    name: userInfo?.name ?? (claims.name as string | undefined),
    picture: userInfo?.picture ?? (claims.picture as string | undefined),
  };
}

export async function syncUserFromLogto(context: LogtoContext): Promise<User | null> {
  const userData = extractUserData(context);

  if (!userData) {
    return null;
  }

  const now = new Date();

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.logtoId, userData.sub))
    .limit(1);

  if (existingUser.length > 0) {
    const [updatedUser] = await db
      .update(users)
      .set({
        email: userData.email,
        emailVerified: userData.emailVerified,
        name: userData.name,
        avatarUrl: userData.picture,
        updatedAt: now,
        lastLoginAt: now,
      })
      .where(eq(users.logtoId, userData.sub))
      .returning();

    return updatedUser;
  }

  const [newUser] = await db
    .insert(users)
    .values({
      logtoId: userData.sub,
      email: userData.email,
      emailVerified: userData.emailVerified,
      name: userData.name,
      avatarUrl: userData.picture,
      lastLoginAt: now,
    })
    .returning();

  return newUser;
}

export async function getUserByLogtoId(logtoId: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.logtoId, logtoId))
    .limit(1);

  return result[0] ?? null;
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function updateUserPreferences(
  logtoId: string,
  preferences: {
    locale?: 'en' | 'ja' | 'pt' | 'zh';
    colorMode?: 'light' | 'dark' | 'system';
  }
): Promise<User | null> {
  const [updatedUser] = await db
    .update(users)
    .set({
      ...preferences,
      updatedAt: new Date(),
    })
    .where(eq(users.logtoId, logtoId))
    .returning();

  return updatedUser ?? null;
}
