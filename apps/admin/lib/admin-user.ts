/**
 * @fileoverview Admin User Sync Utility
 * @fileoverview 管理员用户同步工具
 *
 * Provides functions to sync admin user data from Logto to the local database.
 * Uses a "lazy sync" pattern where admin user data is synced on each login.
 * 提供将管理员用户数据从Logto同步到本地数据库的函数。
 * 使用"延迟同步"模式，在每次登录时同步管理员用户数据。
 *
 * @module lib/admin-user
 */

import { db, adminUsers, eq, type AdminUser } from '@magiworld/db';
import type { LogtoContext } from '@logto/next';

/**
 * Admin user data extracted from Logto context / 从Logto上下文提取的管理员用户数据
 */
type LogtoAdminData = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

/**
 * Extracts admin user data from Logto context / 从Logto上下文提取管理员用户数据
 *
 * Combines data from claims and userInfo.
 * 合并claims和userInfo中的数据。
 */
function extractAdminData(context: LogtoContext): LogtoAdminData | null {
  const { claims, userInfo } = context;

  if (!claims?.sub) {
    return null;
  }

  const email = userInfo?.email ?? (claims.email as string | undefined);

  // Email is required for admin users / 管理员用户必须有邮箱
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
 * Syncs admin user data from Logto to the local database / 将管理员用户数据从Logto同步到本地数据库
 *
 * - On first login: Creates a new admin user record / 首次登录：创建新管理员用户记录
 * - On subsequent logins: Updates lastLoginAt and refreshes profile / 后续登录：更新lastLoginAt并刷新个人资料
 * - Returns null if user is not active (disabled by super admin) / 如果用户未激活返回null
 *
 * @param context - The Logto context from getLogtoContext() / 来自getLogtoContext()的Logto上下文
 * @returns The local admin user record, or null if not authenticated / 本地管理员用户记录，未认证返回null
 *
 * @example
 * ```typescript
 * const { isAuthenticated, ...context } = await getLogtoContext(logtoConfig);
 * if (isAuthenticated) {
 *   const adminUser = await syncAdminUserFromLogto(context);
 *   if (!adminUser) {
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

  // Try to find existing admin user / 尝试查找现有管理员用户
  const existingAdmin = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.logtoId, adminData.sub))
    .limit(1);

  if (existingAdmin.length > 0) {
    const admin = existingAdmin[0];

    // Check if admin is active / 检查管理员是否激活
    if (!admin.isActive) {
      return null;
    }

    // Update existing admin with latest Logto data and login timestamp
    // 使用最新的Logto数据和登录时间戳更新现有管理员
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

  // Create new admin user / 创建新管理员用户
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
 * Gets an admin user by their Logto ID without syncing / 按Logto ID获取管理员用户（不同步）
 *
 * @param logtoId - The Logto user ID (sub claim) / Logto用户ID（sub claim）
 * @returns The admin user record or null if not found / 管理员用户记录，未找到返回null
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
 * Gets an admin user by their local database ID / 按本地数据库ID获取管理员用户
 *
 * @param id - The local admin user UUID / 本地管理员用户UUID
 * @returns The admin user record or null if not found / 管理员用户记录，未找到返回null
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
 * Disables an admin user account / 禁用管理员用户账户
 *
 * The user will not be able to access the admin dashboard until re-enabled.
 * 用户在重新启用前将无法访问管理后台。
 *
 * @param logtoId - The Logto user ID / Logto用户ID
 * @returns The updated admin user record or null if not found / 更新后的管理员用户记录，未找到返回null
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
 * Enables a previously disabled admin user account / 启用之前禁用的管理员用户账户
 *
 * @param logtoId - The Logto user ID / Logto用户ID
 * @returns The updated admin user record or null if not found / 更新后的管理员用户记录，未找到返回null
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
