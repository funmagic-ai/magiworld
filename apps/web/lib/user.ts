/**
 * @fileoverview User Sync Utility
 *
 * Provides functions to sync user data from Logto to the local database.
 * Uses a "lazy sync" pattern where user data is synced on each login.
 *
 * @module lib/user
 */

import { db, users, eq, type User } from '@magiworld/db';
import type { LogtoContext } from '@logto/next';

/**
 * User data extracted from Logto context
 */
type LogtoUserData = {
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
  picture?: string;
};

/**
 * Extracts user data from Logto context (claims and userInfo)
 */
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

/**
 * Syncs user data from Logto to the local database.
 *
 * - On first login: Creates a new user record
 * - On subsequent logins: Updates lastLoginAt and refreshes profile fields
 *
 * @param context - The Logto context from getLogtoContext()
 * @returns The local user record, or null if not authenticated
 *
 * @example
 * ```typescript
 * const { isAuthenticated, ...context } = await getLogtoContext(logtoConfig);
 * if (isAuthenticated) {
 *   const user = await syncUserFromLogto(context);
 * }
 * ```
 */
export async function syncUserFromLogto(context: LogtoContext): Promise<User | null> {
  const userData = extractUserData(context);

  if (!userData) {
    return null;
  }

  const now = new Date();

  // Try to find existing user
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.logtoId, userData.sub))
    .limit(1);

  if (existingUser.length > 0) {
    // Update existing user with latest Logto data and login timestamp
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

  // Create new user
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

/**
 * Gets a user by their Logto ID without syncing.
 *
 * @param logtoId - The Logto user ID (sub claim)
 * @returns The user record or null if not found
 */
export async function getUserByLogtoId(logtoId: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.logtoId, logtoId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Gets a user by their local database ID.
 *
 * @param id - The local user UUID
 * @returns The user record or null if not found
 */
export async function getUserById(id: string): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Updates user preferences (locale-only fields, not synced from Logto).
 *
 * @param logtoId - The Logto user ID
 * @param preferences - The preferences to update
 * @returns The updated user record or null if not found
 */
export async function updateUserPreferences(
  logtoId: string,
  preferences: {
    locale?: 'en' | 'ja' | 'pt' | 'zh';
    theme?: string;
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
