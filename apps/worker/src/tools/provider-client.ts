/**
 * @fileoverview Provider Client
 * @fileoverview 提供商客户端
 *
 * Utility to fetch provider credentials from database.
 * Automatically selects between providers (web) and adminProviders (admin)
 * based on the QUEUE_PREFIX environment variable.
 * 从数据库获取提供商凭据的工具。
 * 根据 QUEUE_PREFIX 环境变量自动选择 providers (web) 或 adminProviders (admin)。
 *
 * @module @magiworld/worker/tools/provider-client
 */

import { db, providers, adminProviders, eq } from '@magiworld/db';
import type { ProviderCredentials } from './types';

/**
 * Check if running in admin mode based on queue prefix
 * 根据队列前缀检查是否在管理员模式下运行
 */
function isAdminMode(): boolean {
  return process.env.QUEUE_PREFIX === 'admin';
}

/**
 * Error thrown when provider is not found or not available
 * 当提供商未找到或不可用时抛出的错误
 */
export class ProviderNotFoundError extends Error {
  constructor(slug: string, isAdmin: boolean) {
    const table = isAdmin ? 'adminProviders' : 'providers';
    super(`Provider not found or not active: ${slug} (table: ${table})`);
    this.name = 'ProviderNotFoundError';
  }
}

/**
 * Error thrown when provider has no API key configured
 * 当提供商没有配置 API 密钥时抛出的错误
 */
export class ProviderNoApiKeyError extends Error {
  constructor(slug: string, isAdmin: boolean) {
    const table = isAdmin ? 'adminProviders' : 'providers';
    super(`Provider ${slug} has no API key configured (table: ${table})`);
    this.name = 'ProviderNoApiKeyError';
  }
}

/**
 * Get provider credentials from database
 * 从数据库获取提供商凭据
 *
 * Automatically selects the correct table based on QUEUE_PREFIX:
 * - QUEUE_PREFIX=admin → uses adminProviders table
 * - Otherwise → uses providers table
 * 根据 QUEUE_PREFIX 自动选择正确的表：
 * - QUEUE_PREFIX=admin → 使用 adminProviders 表
 * - 其他情况 → 使用 providers 表
 *
 * @param providerSlug - Provider slug (e.g., 'fal_ai', 'openai', 'google')
 * @returns Provider credentials including API key
 * @throws ProviderNotFoundError if provider not found or not active
 * @throws ProviderNoApiKeyError if provider has no API key configured
 */
export async function getProviderCredentials(providerSlug: string): Promise<ProviderCredentials> {
  const isAdmin = isAdminMode();

  if (isAdmin) {
    // Fetch from adminProviders table
    const [provider] = await db
      .select({
        slug: adminProviders.slug,
        apiKeyEncrypted: adminProviders.apiKeyEncrypted,
        configJson: adminProviders.configJson,
        isActive: adminProviders.isActive,
        status: adminProviders.status,
      })
      .from(adminProviders)
      .where(eq(adminProviders.slug, providerSlug))
      .limit(1);

    if (!provider) {
      throw new ProviderNotFoundError(providerSlug, true);
    }

    if (!provider.isActive || provider.status === 'inactive') {
      throw new ProviderNotFoundError(providerSlug, true);
    }

    if (!provider.apiKeyEncrypted) {
      throw new ProviderNoApiKeyError(providerSlug, true);
    }

    const configJson = provider.configJson as Record<string, unknown> | null;
    const baseUrl = (configJson?.baseUrl as string) || undefined;

    return {
      slug: provider.slug,
      apiKey: provider.apiKeyEncrypted,
      baseUrl,
    };
  }

  // Fetch from providers table (web users)
  const [provider] = await db
    .select({
      slug: providers.slug,
      apiKeyEncrypted: providers.apiKeyEncrypted,
      configJson: providers.configJson,
      isActive: providers.isActive,
      status: providers.status,
    })
    .from(providers)
    .where(eq(providers.slug, providerSlug))
    .limit(1);

  if (!provider) {
    throw new ProviderNotFoundError(providerSlug, false);
  }

  if (!provider.isActive || provider.status === 'inactive') {
    throw new ProviderNotFoundError(providerSlug, false);
  }

  if (!provider.apiKeyEncrypted) {
    throw new ProviderNoApiKeyError(providerSlug, false);
  }

  // Extract baseUrl from configJson if present
  const configJson = provider.configJson as Record<string, unknown> | null;
  const baseUrl = (configJson?.baseUrl as string) || undefined;

  return {
    slug: provider.slug,
    apiKey: provider.apiKeyEncrypted,
    baseUrl,
  };
}

/**
 * Get multiple provider credentials at once
 * 一次获取多个提供商凭据
 *
 * Useful for multi-step tools that use multiple providers.
 * Throws on first error to fail fast and avoid partial work.
 * 对于使用多个提供商的多步骤工具很有用。
 * 在第一个错误时抛出，以快速失败并避免部分工作。
 *
 * @param providerSlugs - Array of provider slugs
 * @returns Map of slug to credentials
 */
export async function getMultipleProviderCredentials(
  providerSlugs: string[]
): Promise<Map<string, ProviderCredentials>> {
  const credentials = new Map<string, ProviderCredentials>();

  // Fetch sequentially to fail fast on first error
  for (const slug of providerSlugs) {
    const creds = await getProviderCredentials(slug);
    credentials.set(slug, creds);
  }

  return credentials;
}
