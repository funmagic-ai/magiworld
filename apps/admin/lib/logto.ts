/**
 * @fileoverview Logto Authentication Configuration
 * @fileoverview Logto认证配置
 *
 * Configuration for Logto authentication provider.
 * Used for admin user authentication and session management.
 * Logto认证提供商的配置。用于管理员用户认证和会话管理。
 *
 * @module lib/logto
 */

import { UserScope } from '@logto/next';

/**
 * Logto configuration object / Logto配置对象
 *
 * Reads all settings from environment variables.
 * Enables email and profile scopes for user info.
 * 从环境变量读取所有设置。启用邮箱和个人资料范围以获取用户信息。
 *
 * @property endpoint - Logto server endpoint / Logto服务器端点
 * @property appId - Application ID from Logto console / Logto控制台的应用ID
 * @property appSecret - Application secret / 应用密钥
 * @property baseUrl - Admin app base URL / 管理后台基础URL
 * @property cookieSecret - Secret for cookie encryption / Cookie加密密钥
 * @property cookieSecure - Use secure cookies in production / 生产环境使用安全Cookie
 * @property scopes - OAuth scopes to request / 请求的OAuth范围
 * @property fetchUserInfo - Whether to fetch full user info / 是否获取完整用户信息
 */
export const logtoConfig = {
  endpoint: process.env.LOGTO_ENDPOINT!,
  appId: process.env.LOGTO_APP_ID!,
  appSecret: process.env.LOGTO_APP_SECRET!,
  baseUrl: process.env.LOGTO_BASE_URL!,
  cookieSecret: process.env.LOGTO_COOKIE_SECRET!,
  cookieSecure: process.env.NODE_ENV === 'production',
  scopes: [UserScope.Email, UserScope.Profile],
  fetchUserInfo: true,
};
