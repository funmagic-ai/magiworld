/**
 * @fileoverview Tools Management Page
 *
 * Admin page for managing AI tools available on the Magiworld platform.
 * Displays a table of all tools with their metadata and provides
 * navigation to create or edit tools.
 *
 * Features:
 * - Tabular list of all tools with localized names
 * - Search, filter, and sort toolbar
 * - Tool type badges for visual classification
 * - Quick active toggle switches
 * - Edit links for each tool
 * - Add new tool button
 *
 * @module apps/admin/app/tools/page
 */

import {
  db,
  tools,
  toolTypes,
  toolTranslations,
  toolTypeTranslations,
  eq,
  and,
  asc,
  desc,
  isNull,
  ilike,
  or,
} from '@magiworld/db';
import Link from 'next/link';
import { RestoreToolButton } from '@/components/restore-tool-button';
import { ListToolbar } from '@/components/list-toolbar';
import { ToolActiveToggle } from '@/components/tool-active-toggle';

/**
 * Tool list item for admin display.
 */
interface ToolListItem {
  id: string;
  slug: string;
  isActive: boolean;
  order: number;
  toolTypeName: string;
  toolTypeSlug: string;
  name: string;
  description: string | null;
  deletedAt: Date | null;
  updatedAt: Date;
}

interface QueryParams {
  search?: string;
  toolType?: string;
  sort?: string;
  showDeleted?: string;
}

/**
 * Fetch all tool types for filter options.
 */
async function getToolTypeOptions() {
  const result = await db
    .select({
      slug: toolTypes.slug,
      name: toolTypeTranslations.name,
    })
    .from(toolTypes)
    .innerJoin(
      toolTypeTranslations,
      and(
        eq(toolTypeTranslations.toolTypeId, toolTypes.id),
        eq(toolTypeTranslations.locale, 'en')
      )
    )
    .where(eq(toolTypes.isActive, true))
    .orderBy(asc(toolTypes.order));

  return result.map((t) => ({ value: t.slug, label: t.name }));
}

/**
 * Fetch all tools with their translations and type information.
 */
async function getToolsList(params: QueryParams): Promise<ToolListItem[]> {
  const { search, toolType, sort, showDeleted } = params;

  let query = db
    .select({
      id: tools.id,
      slug: tools.slug,
      isActive: tools.isActive,
      order: tools.order,
      toolTypeName: toolTypeTranslations.name,
      toolTypeSlug: toolTypes.slug,
      name: toolTranslations.title,
      description: toolTranslations.description,
      deletedAt: tools.deletedAt,
      updatedAt: tools.updatedAt,
    })
    .from(tools)
    .innerJoin(toolTypes, eq(tools.toolTypeId, toolTypes.id))
    .innerJoin(
      toolTypeTranslations,
      and(
        eq(toolTypeTranslations.toolTypeId, toolTypes.id),
        eq(toolTypeTranslations.locale, 'en')
      )
    )
    .innerJoin(
      toolTranslations,
      and(
        eq(toolTranslations.toolId, tools.id),
        eq(toolTranslations.locale, 'en')
      )
    )
    .$dynamic();

  // Build where conditions
  const conditions = [];

  if (showDeleted !== 'true') {
    conditions.push(isNull(tools.deletedAt));
  }

  if (toolType && toolType !== 'all') {
    conditions.push(eq(toolTypes.slug, toolType));
  }

  if (search) {
    conditions.push(
      or(
        ilike(toolTranslations.title, `%${search}%`),
        ilike(toolTranslations.description, `%${search}%`),
        ilike(tools.slug, `%${search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  // Apply sorting
  switch (sort) {
    case 'name-asc':
      query = query.orderBy(asc(toolTranslations.title));
      break;
    case 'name-desc':
      query = query.orderBy(desc(toolTranslations.title));
      break;
    case 'date-asc':
      query = query.orderBy(asc(tools.updatedAt));
      break;
    case 'date-desc':
      query = query.orderBy(desc(tools.updatedAt));
      break;
    case 'order-desc':
      query = query.orderBy(desc(tools.order));
      break;
    default:
      query = query.orderBy(asc(tools.order));
  }

  return query;
}

const SORT_OPTIONS = [
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'order-desc', label: 'Order (High-Low)' },
];

interface PageProps {
  searchParams: Promise<QueryParams>;
}

export default async function ToolsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [toolsList, toolTypeOptions] = await Promise.all([
    getToolsList(params),
    getToolTypeOptions(),
  ]);

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tools</h1>
          <p className="text-muted-foreground">Manage AI tools available on the platform.</p>
        </div>
        <Link
          href="/tools/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Tool
        </Link>
      </div>

      {/* Toolbar */}
      <ListToolbar
        searchPlaceholder="Search tools..."
        filterOptions={toolTypeOptions}
        filterLabel="Type"
        filterParamName="toolType"
        sortOptions={SORT_OPTIONS}
        currentSearch={params.search || ''}
        currentFilter={params.toolType || ''}
        currentSort={params.sort || ''}
        showDeleted={params.showDeleted === 'true'}
      />

      {/* Tools Table */}
      <div className="rounded-lg border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Slug</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Type</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Order</th>
              <th className="p-4 text-center text-sm font-medium text-muted-foreground">Active</th>
              <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {toolsList.map((tool) => {
              const isDeleted = tool.deletedAt !== null;
              return (
                <tr key={tool.id} className={`border-b last:border-0 ${isDeleted ? 'opacity-60 bg-muted/30' : ''}`}>
                  {/* Name and Description */}
                  <td className="p-4">
                    <div className={`font-medium ${isDeleted ? 'line-through text-muted-foreground' : ''}`}>
                      {tool.name}
                    </div>
                    <div className="text-sm text-muted-foreground line-clamp-1">{tool.description}</div>
                  </td>

                  {/* Slug */}
                  <td className="p-4 text-sm text-muted-foreground">{tool.slug}</td>

                  {/* Tool Type Badge */}
                  <td className="p-4">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                      {tool.toolTypeName}
                    </span>
                  </td>

                  {/* Order */}
                  <td className="p-4 text-sm text-muted-foreground">{tool.order}</td>

                  {/* Active Toggle */}
                  <td className="p-4 text-center">
                    {isDeleted ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2.5 py-0.5 text-xs font-medium">
                        Deleted
                      </span>
                    ) : (
                      <ToolActiveToggle id={tool.id} isActive={tool.isActive} />
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-4 text-right">
                    {isDeleted ? (
                      <RestoreToolButton id={tool.id} />
                    ) : (
                      <Link
                        href={`/tools/${tool.id}`}
                        className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent"
                      >
                        Edit
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}

            {/* Empty State */}
            {toolsList.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No tools found. {params.search || params.toolType ? 'Try adjusting your filters.' : 'Create your first tool to get started.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
