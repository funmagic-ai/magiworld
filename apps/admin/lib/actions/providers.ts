/**
 * @fileoverview Provider Management Server Actions
 * @fileoverview 提供商管理服务端操作
 *
 * Server actions for CRUD operations on AI providers.
 * Providers are external AI services (fal.ai, Google Gemini, OpenAI).
 * 用于AI提供商CRUD操作的服务端函数。
 * 提供商是外部AI服务（fal.ai、Google Gemini、OpenAI）。
 *
 * @module lib/actions/providers
 */

'use server';

import { db, providers, eq } from '@magiworld/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

/**
 * Provider form data structure / 提供商表单数据结构
 */
export type ProviderFormData = {
  slug: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  rateLimitMax: number;
  rateLimitWindow: number;
  defaultTimeout: number;
  status: 'active' | 'inactive' | 'degraded';
  isActive: boolean;
  // IAM-style credentials (for AWS/Tencent/etc.)
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
};

/**
 * Create a new provider / 创建新提供商
 *
 * @param data - Provider form data / 提供商表单数据
 */
export async function createProvider(data: ProviderFormData) {
  // Build configJson with baseUrl if provided
  const configJson: Record<string, unknown> = {};
  if (data.baseUrl) {
    configJson.baseUrl = data.baseUrl;
  }

  await db.insert(providers).values({
    slug: data.slug,
    name: data.name,
    apiKeyEncrypted: data.apiKey || null, // TODO: Encrypt API key before storing
    accessKeyIdEncrypted: data.accessKeyId || null, // TODO: Encrypt before storing
    secretAccessKeyEncrypted: data.secretAccessKey || null, // TODO: Encrypt before storing
    region: data.region || null,
    configJson: Object.keys(configJson).length > 0 ? configJson : null,
    rateLimitMax: data.rateLimitMax,
    rateLimitWindow: data.rateLimitWindow,
    defaultTimeout: data.defaultTimeout,
    status: data.status,
    isActive: data.isActive,
  });

  revalidatePath('/providers');
  redirect('/providers');
}

/**
 * Update an existing provider / 更新现有提供商
 *
 * @param id - Provider UUID / 提供商UUID
 * @param data - Updated provider form data / 更新后的提供商表单数据
 */
export async function updateProvider(id: string, data: ProviderFormData) {
  // Get existing provider to preserve configJson fields
  const [existing] = await db.select().from(providers).where(eq(providers.id, id)).limit(1);
  const existingConfig = (existing?.configJson as Record<string, unknown>) || {};

  // Build updated configJson
  const configJson: Record<string, unknown> = { ...existingConfig };
  if (data.baseUrl) {
    configJson.baseUrl = data.baseUrl;
  } else {
    delete configJson.baseUrl;
  }

  await db
    .update(providers)
    .set({
      slug: data.slug,
      name: data.name,
      // Only update credentials if a new value is provided (not empty)
      ...(data.apiKey && { apiKeyEncrypted: data.apiKey }), // TODO: Encrypt before storing
      ...(data.accessKeyId && { accessKeyIdEncrypted: data.accessKeyId }), // TODO: Encrypt before storing
      ...(data.secretAccessKey && { secretAccessKeyEncrypted: data.secretAccessKey }), // TODO: Encrypt before storing
      // Region is always updated (can be cleared)
      region: data.region || null,
      configJson: Object.keys(configJson).length > 0 ? configJson : null,
      rateLimitMax: data.rateLimitMax,
      rateLimitWindow: data.rateLimitWindow,
      defaultTimeout: data.defaultTimeout,
      status: data.status,
      isActive: data.isActive,
      updatedAt: new Date(),
    })
    .where(eq(providers.id, id));

  revalidatePath('/providers');
  redirect('/providers');
}

/**
 * Delete a provider / 删除提供商
 *
 * @param id - Provider UUID / 提供商UUID
 */
export async function deleteProvider(id: string) {
  await db.delete(providers).where(eq(providers.id, id));
  revalidatePath('/providers');
  redirect('/providers');
}

/**
 * Reset circuit breaker for a provider / 重置提供商的熔断器
 *
 * @param id - Provider UUID / 提供商UUID
 */
export async function resetCircuitBreaker(id: string) {
  await db
    .update(providers)
    .set({
      circuitState: 'closed',
      circuitOpenedAt: null,
      failureCount: 0,
      updatedAt: new Date(),
    })
    .where(eq(providers.id, id));

  revalidatePath('/providers');
}

/**
 * Get provider by ID / 按ID获取提供商
 *
 * @param id - Provider UUID / 提供商UUID
 * @returns Provider or null if not found / 提供商，未找到返回null
 */
export async function getProviderById(id: string) {
  const [provider] = await db
    .select()
    .from(providers)
    .where(eq(providers.id, id))
    .limit(1);

  if (!provider) return null;

  const configJson = provider.configJson as Record<string, unknown> | null;

  return {
    id: provider.id,
    slug: provider.slug,
    name: provider.name,
    hasApiKey: !!provider.apiKeyEncrypted,
    hasAccessKeyId: !!provider.accessKeyIdEncrypted,
    hasSecretAccessKey: !!provider.secretAccessKeyEncrypted,
    region: provider.region || '',
    baseUrl: (configJson?.baseUrl as string) || '',
    rateLimitMax: provider.rateLimitMax ?? 100,
    rateLimitWindow: provider.rateLimitWindow ?? 60000,
    defaultTimeout: provider.defaultTimeout ?? 120000,
    status: provider.status,
    circuitState: provider.circuitState,
    circuitOpenedAt: provider.circuitOpenedAt,
    failureCount: provider.failureCount ?? 0,
    isActive: provider.isActive,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

/**
 * Get all providers for list view / 获取所有提供商列表
 *
 * @returns Array of providers / 提供商数组
 */
export async function getProvidersList() {
  const providersList = await db
    .select()
    .from(providers)
    .orderBy(providers.name);

  return providersList.map((provider) => ({
    id: provider.id,
    slug: provider.slug,
    name: provider.name,
    rateLimitMax: provider.rateLimitMax ?? 100,
    rateLimitWindow: provider.rateLimitWindow ?? 60000,
    defaultTimeout: provider.defaultTimeout ?? 120000,
    status: provider.status,
    circuitState: provider.circuitState,
    circuitOpenedAt: provider.circuitOpenedAt,
    failureCount: provider.failureCount ?? 0,
    isActive: provider.isActive,
  }));
}
