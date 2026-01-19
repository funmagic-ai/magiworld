/**
 * @fileoverview Admin Provider Server Actions
 * @fileoverview 管理员提供商服务器操作
 *
 * Server actions for managing admin provider credentials.
 * These providers are used by admin Magi tools (separate from web users).
 * 管理管理员提供商凭据的服务器操作。
 * 这些提供商由管理员Magi工具使用（与Web用户分开）。
 *
 * @module lib/actions/admin-providers
 */

'use server';

import { db, adminProviders, eq, asc } from '@magiworld/db';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { AdminProviderCreateInput, AdminProviderEditInput } from '@/lib/validations/admin-provider';

/**
 * Form data type for admin provider operations
 */
export type AdminProviderFormData = AdminProviderCreateInput | AdminProviderEditInput;

/**
 * Get all admin providers
 */
export async function getAdminProviders() {
  return db.select().from(adminProviders).orderBy(asc(adminProviders.name));
}

/**
 * Get admin provider by ID
 */
export async function getAdminProviderById(id: string) {
  const [provider] = await db
    .select()
    .from(adminProviders)
    .where(eq(adminProviders.id, id))
    .limit(1);

  if (!provider) {
    return null;
  }

  // Extract baseUrl from configJson
  const configJson = provider.configJson as Record<string, unknown> | null;
  const baseUrl = (configJson?.baseUrl as string) || '';

  return {
    id: provider.id,
    slug: provider.slug,
    name: provider.name,
    hasApiKey: !!provider.apiKeyEncrypted,
    baseUrl,
    status: provider.status as 'active' | 'inactive',
    isActive: provider.isActive,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

/**
 * Create a new admin provider
 */
export async function createAdminProvider(data: AdminProviderCreateInput) {
  const configJson = data.baseUrl ? { baseUrl: data.baseUrl } : {};

  await db.insert(adminProviders).values({
    slug: data.slug,
    name: data.name,
    apiKeyEncrypted: data.apiKey,
    configJson,
    status: data.status,
    isActive: data.isActive,
  });

  revalidatePath('/admin-providers');
  redirect('/admin-providers');
}

/**
 * Update an existing admin provider
 */
export async function updateAdminProvider(id: string, data: AdminProviderEditInput) {
  const configJson = data.baseUrl ? { baseUrl: data.baseUrl } : {};

  const updateData: Record<string, unknown> = {
    slug: data.slug,
    name: data.name,
    configJson,
    status: data.status,
    isActive: data.isActive,
    updatedAt: new Date(),
  };

  // Only update API key if provided
  if (data.apiKey) {
    updateData.apiKeyEncrypted = data.apiKey;
  }

  await db
    .update(adminProviders)
    .set(updateData)
    .where(eq(adminProviders.id, id));

  revalidatePath('/admin-providers');
  redirect('/admin-providers');
}

/**
 * Delete an admin provider
 */
export async function deleteAdminProvider(id: string) {
  await db.delete(adminProviders).where(eq(adminProviders.id, id));

  revalidatePath('/admin-providers');
  redirect('/admin-providers');
}
