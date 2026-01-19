/**
 * @fileoverview Admin Provider List Component
 * @fileoverview 管理员提供商列表组件
 *
 * Client component for displaying admin providers with expandable rows.
 * Simplified version without rate limiting or circuit breaker fields.
 * 显示管理员提供商的客户端组件，带有可展开的行。
 * 简化版本，没有速率限制或断路器字段。
 *
 * @module apps/admin/app/(dashboard)/admin-providers/admin-provider-list
 */

'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import type { AdminProvider } from '@magiworld/db';

/**
 * Status badge styles
 */
const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
};

interface AdminProviderListProps {
  providers: AdminProvider[];
}

/**
 * Mask API key for display.
 */
function maskApiKey(key: string | null): string {
  if (!key) return 'Not configured';
  if (key.length <= 8) return '********';
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

/**
 * Format date for display.
 */
function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Chevron icon component
 */
function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`h-4 w-4 motion-safe:transition-transform motion-safe:duration-200 ${expanded ? 'rotate-90' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function AdminProviderList({ providers }: AdminProviderListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="rounded-lg border bg-card">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="w-8 p-4"></th>
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Name</th>
            <th className="p-4 text-left text-sm font-medium text-muted-foreground">Slug</th>
            <th className="p-4 text-center text-sm font-medium text-muted-foreground">Status</th>
            <th className="p-4 text-center text-sm font-medium text-muted-foreground">Active</th>
            <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((provider) => {
            const isExpanded = expandedIds.has(provider.id);
            const configJson = provider.configJson as Record<string, unknown> | null;

            return (
              <Fragment key={provider.id}>
                {/* Parent Row */}
                <tr
                  className={`border-b cursor-pointer hover:bg-muted/30 transition-colors ${
                    isExpanded ? 'bg-muted/20' : ''
                  }`}
                  onClick={() => toggleExpanded(provider.id)}
                >
                  {/* Expand Icon */}
                  <td className="p-4 text-muted-foreground">
                    <ChevronIcon expanded={isExpanded} />
                  </td>

                  {/* Name */}
                  <td className="p-4">
                    <div className="font-medium">{provider.name}</div>
                  </td>

                  {/* Slug */}
                  <td className="p-4">
                    <code className="rounded bg-muted px-2 py-1 text-sm">{provider.slug}</code>
                  </td>

                  {/* Status Badge */}
                  <td className="p-4 text-center">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[provider.status] || STATUS_STYLES.inactive
                      }`}
                    >
                      {provider.status}
                    </span>
                  </td>

                  {/* Active Toggle */}
                  <td className="p-4 text-center">
                    {provider.isActive ? (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : (
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-3 w-3"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        >
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/admin-providers/${provider.id}`}
                      className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>

                {/* Child Row (Expanded Details) */}
                {isExpanded && (
                  <tr className="border-b bg-muted/10">
                    <td colSpan={6} className="p-0">
                      <div className="px-12 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                          {/* API Key */}
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              API Key
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                              <code className="rounded bg-muted px-2 py-1 text-sm font-mono">
                                {maskApiKey(provider.apiKeyEncrypted)}
                              </code>
                              {provider.apiKeyEncrypted && (
                                <span className="inline-flex items-center rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700 dark:bg-green-900 dark:text-green-300">
                                  Configured
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Base URL */}
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Base URL
                            </label>
                            <div className="mt-1">
                              <code className="rounded bg-muted px-2 py-1 text-sm font-mono break-all">
                                {(configJson?.baseUrl as string) || 'Default'}
                              </code>
                            </div>
                          </div>

                          {/* Created At */}
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Created
                            </label>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {formatDate(provider.createdAt)}
                            </div>
                          </div>

                          {/* Updated At */}
                          <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Last Updated
                            </label>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {formatDate(provider.updatedAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}

          {/* Empty State */}
          {providers.length === 0 && (
            <tr>
              <td colSpan={6} className="p-8 text-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 text-muted-foreground/50"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                  >
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 7V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v3" />
                  </svg>
                  <p>No admin providers configured.</p>
                  <p className="text-sm">
                    Add <code className="rounded bg-muted px-1">fal_ai</code> and <code className="rounded bg-muted px-1">google</code> providers to enable Magi tools.
                  </p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
