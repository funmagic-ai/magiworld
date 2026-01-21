/**
 * @fileoverview Auth Server Actions
 * @fileoverview 认证服务端操作
 *
 * Server actions for authentication operations.
 * 用于认证操作的服务端操作。
 *
 * @module lib/auth-actions
 */

'use server';

import { signOut as logtoSignOut } from '@logto/next/server-actions';
import { logtoConfig } from './logto';

/**
 * Sign out the current user
 * 登出当前用户
 */
export async function signOut(): Promise<void> {
  await logtoSignOut(logtoConfig);
}
