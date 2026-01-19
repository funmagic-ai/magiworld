/**
 * @fileoverview Providers Management Page
 * @fileoverview 提供商管理页面
 *
 * Admin page for managing AI providers with expandable rows for details.
 * 管理AI提供商的管理页面，带有可展开的行显示详细信息。
 *
 * @module apps/admin/app/providers/page
 */

import { db, providers, asc } from '@magiworld/db';
import Link from 'next/link';
import { ProviderList } from './provider-list';

/**
 * Fetch all providers for list view.
 */
async function getProvidersList() {
  return db.select().from(providers).orderBy(asc(providers.name));
}

export default async function ProvidersPage() {
  const providersList = await getProvidersList();

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Providers</h1>
          <p className="text-muted-foreground">
            Manage AI provider configurations, rate limits, and health status.
          </p>
        </div>
        <Link
          href="/providers/new"
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

      {/* Providers Table with Expandable Rows */}
      <ProviderList providers={providersList} />
    </div>
  );
}
