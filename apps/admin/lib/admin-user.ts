/**
 * @fileoverview Admin User Sync Utility
 *
 * Provides functions to sync admin user data from Logto to the local database.
 * Uses a "lazy sync" pattern where admin user data is synced on each login.
 *
 * @module lib/admin-user
 */

import { db, adminUsers, eq, type AdminUser } from '@magiworld/db';
import type { LogtoContext } from '@logto/next';

/**
 * Admin user data extracted from Logto context
 */
type LogtoAdminData = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

/**
 * Extracts admin user data from Logto context (claims and userInfo)
 */
function extractAdminData(context: LogtoContext): LogtoAdminData | null {
  const { claims, userInfo } = context;

  if (!claims?.sub) {
    return null;
  }

  const email = userInfo?.email ?? (claims.email as string | undefined);

  // Email is required for admin users
  if (!email) {
    return null;
  }

  return {
    sub: claims.sub,
    email,
    name: userInfo?.name ?? (claims.name as string | undefined),
    picture: userInfo?.picture ?? (claims.picture as string | undefined),
  };
}

/**
 * Syncs admin user data from Logto to the local database.
 *
 * - On first login: Creates a new admin user record
 * - On subsequent logins: Updates lastLoginAt and refreshes profile fields
 * - Returns null if user is not active (disabled by super admin)
 *
 * @param context - The Logto context from getLogtoContext()
 * @returns The local admin user record, or null if not authenticated/authorized
 *
 * @example
 * ```typescript
 * const { isAuthenticated, ...context } = await getLogtoContext(logtoConfig);
 * if (isAuthenticated) {
 *   const adminUser = await syncAdminUserFromLogto(context);
 *   if (!adminUser) {
 *     // User is not authorized or account is disabled
 *     redirect('/unauthorized');
 *   }
 * }
 * ```
 */
export async function syncAdminUserFromLogto(context: LogtoContext): Promise<AdminUser | null> {
  const adminData = extractAdminData(context);

  if (!adminData) {
    return null;
  }

  const now = new Date();

  // Try to find existing admin user
  const existingAdmin = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.logtoId, adminData.sub))
    .limit(1);

  if (existingAdmin.length > 0) {
    const admin = existingAdmin[0];

    // Check if admin is active
    if (!admin.isActive) {
      return null;
    }

    // Update existing admin with latest Logto data and login timestamp
    const [updatedAdmin] = await db
      .update(adminUsers)
      .set({
        email: adminData.email,
        name: adminData.name,
        avatarUrl: adminData.picture,
        updatedAt: now,
        lastLoginAt: now,
      })
      .where(eq(adminUsers.logtoId, adminData.sub))
      .returning();

    return updatedAdmin;
  }

  // Create new admin user
  const [newAdmin] = await db
    .insert(adminUsers)
    .values({
      logtoId: adminData.sub,
      email: adminData.email,
      name: adminData.name,
      avatarUrl: adminData.picture,
      lastLoginAt: now,
    })
    .returning();

  return newAdmin;
}

/**
 * Gets an admin user by their Logto ID without syncing.
 *
 * @param logtoId - The Logto user ID (sub claim)
 * @returns The admin user record or null if not found
 */
export async function getAdminUserByLogtoId(logtoId: string): Promise<AdminUser | null> {
  const result = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.logtoId, logtoId))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Gets an admin user by their local database ID.
 *
 * @param id - The local admin user UUID
 * @returns The admin user record or null if not found
 */
export async function getAdminUserById(id: string): Promise<AdminUser | null> {
  const result = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  return result[0] ?? null;
}

/**
 * Disables an admin user account.
 * The user will not be able to access the admin dashboard until re-enabled.
 *
 * @param logtoId - The Logto user ID
 * @returns The updated admin user record or null if not found
 */
export async function disableAdminUser(logtoId: string): Promise<AdminUser | null> {
  const [updatedAdmin] = await db
    .update(adminUsers)
    .set({
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.logtoId, logtoId))
    .returning();

  return updatedAdmin ?? null;
}

/**
 * Enables a previously disabled admin user account.
 *
 * @param logtoId - The Logto user ID
 * @returns The updated admin user record or null if not found
 */
export async function enableAdminUser(logtoId: string): Promise<AdminUser | null> {
  const [updatedAdmin] = await db
    .update(adminUsers)
    .set({
      isActive: true,
      updatedAt: new Date(),
    })
    .where(eq(adminUsers.logtoId, logtoId))
    .returning();

  return updatedAdmin ?? null;
}
