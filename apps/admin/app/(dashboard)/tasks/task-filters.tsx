/**
 * @fileoverview Task Filters Component
 * @fileoverview 任务过滤组件
 *
 * Client component for filtering tasks by status, tool, and search term.
 * 按状态、工具和搜索词过滤任务的客户端组件。
 *
 * @module apps/admin/app/tasks/task-filters
 */

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';

interface Tool {
  id: string;
  slug: string;
}

interface TaskFiltersProps {
  tools: Tool[];
  currentFilters: {
    status?: string;
    toolId?: string;
    search?: string;
  };
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
];

export function TaskFilters({ tools, currentFilters }: TaskFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(currentFilters.search || '');

  const updateFilters = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }

      // Reset to page 1 when filters change
      params.delete('page');

      startTransition(() => {
        router.push(`/tasks?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters('search', search);
  };

  const clearFilters = () => {
    setSearch('');
    startTransition(() => {
      router.push('/tasks');
    });
  };

  const hasActiveFilters =
    currentFilters.status || currentFilters.toolId || currentFilters.search;

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px]">
        <div className="relative">
          <input
            type="text"
            placeholder="Search by task ID, job ID, or input..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {isPending && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          )}
        </div>
      </form>

      {/* Status Filter */}
      <select
        value={currentFilters.status || ''}
        onChange={(e) => updateFilters('status', e.target.value)}
        className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {STATUS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* Tool Filter */}
      <select
        value={currentFilters.toolId || ''}
        onChange={(e) => updateFilters('toolId', e.target.value)}
        className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All Tools</option>
        {tools.map((tool) => (
          <option key={tool.id} value={tool.id}>
            {tool.slug}
          </option>
        ))}
      </select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearFilters}
          className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/**
 * Skeleton fallback for TaskFilters while loading.
 */
export function TaskFiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
      <div className="flex-1 min-w-[200px] h-9 bg-muted rounded animate-pulse" />
      <div className="h-9 w-32 bg-muted rounded animate-pulse" />
      <div className="h-9 w-32 bg-muted rounded animate-pulse" />
    </div>
  );
}
