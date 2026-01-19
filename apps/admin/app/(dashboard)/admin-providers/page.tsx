/**
 * @fileoverview Admin Providers Management Page
 * @fileoverview 管理员提供商管理页面
 *
 * Page for managing admin-specific provider API keys.
 * These are separate from web user providers for cost isolation.
 * 管理管理员特定提供商API密钥的页面。
 * 这些与Web用户提供商分开以实现成本隔离。
 *
 * @module apps/admin/app/(dashboard)/admin-providers/page
 */

import { db, adminProviders, asc } from '@magiworld/db';
import Link from 'next/link';
import { AdminProviderList } from './admin-provider-list';

/**
 * Fetch all admin providers for list view.
 */
async function getAdminProvidersList() {
  return db.select().from(adminProviders).orderBy(asc(adminProviders.name));
}

export default async function AdminProvidersPage() {
  const providersList = await getAdminProvidersList();

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Providers</h1>
          <p className="text-muted-foreground">
            Configure API keys for admin Magi tools. These are separate from web user providers.
          </p>
        </div>
        <Link
          href="/admin-providers/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Provider
        </Link>
      </div>

      {/* Info Box */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
        <div className="flex items-start gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Cost Isolation
            </p>
            <p className="text-blue-700 dark:text-blue-300">
              Admin Magi tools use these provider keys, separate from web user keys.
              This allows tracking and billing admin usage independently.
              Required slugs: <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">fal_ai</code>, <code className="rounded bg-blue-100 px-1 dark:bg-blue-900">google</code>
            </p>
          </div>
        </div>
      </div>

      {/* Providers Table */}
      <AdminProviderList providers={providersList} />
    </div>
  );
}
