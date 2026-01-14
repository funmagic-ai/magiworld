/**
 * @fileoverview Logto Authentication Configuration
 * @fileoverview Logto认证配置
 *
 * Configuration for Logto authentication in the web application.
 * Handles OAuth 2.0 / OIDC authentication with user profile scopes.
 * Web应用的Logto认证配置。
 * 处理OAuth 2.0 / OIDC认证，包含用户资料作用域。
 *
 * @module apps/web/lib/logto
 */

import { LogtoNextConfig, UserScope } from '@logto/next';

/**
 * Logto configuration object / Logto配置对象
 *
 * Required environment variables / 必需的环境变量:
 * - LOGTO_ENDPOINT: Logto server URL / Logto服务器URL
 * - LOGTO_APP_ID: Application ID / 应用ID
 * - LOGTO_APP_SECRET: Application secret / 应用密钥
 * - LOGTO_BASE_URL: Base URL for callbacks / 回调基础URL
 * - LOGTO_COOKIE_SECRET: Cookie encryption secret / Cookie加密密钥
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
