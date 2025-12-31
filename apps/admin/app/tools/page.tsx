/**
 * @fileoverview Tools Management Page
 *
 * Admin page for managing AI tools available on the Magiworld platform.
 * Displays a table of all tools with their metadata and provides
 * navigation to create or edit tools.
 *
 * Features:
 * - Tabular list of all tools with localized names
 * - Tool type badges for visual classification
 * - Active/inactive status indicators
 * - Edit links for each tool
 * - Add new tool button
 *
 * @module apps/admin/app/tools/page
 */

import { db, tools, toolTypes, toolTranslations, toolTypeTranslations } from '@magiworld/db';
import { eq, and, asc } from 'drizzle-orm';
import Link from 'next/link';

/**
 * Tool list item for admin display.
 */
interface ToolListItem {
  /** Unique tool identifier */
  id: string;
  /** URL-friendly slug */
  slug: string;
  /** Whether the tool is currently active */
  isActive: boolean;
  /** Display order within the category */
  order: number;
  /** Localized tool type name */
  toolTypeName: string;
  /** Localized tool name */
  name: string;
  /** Localized tool description */
  description: string | null;
}

/**
 * Fetch all tools with their translations and type information.
 *
 * Joins tools with tool types and translation tables to get
 * localized content in English for the admin interface.
 *
 * @returns Promise resolving to an array of tool list items
 */
async function getToolsList(): Promise<ToolListItem[]> {
  const result = await db
    .select({
      id: tools.id,
      slug: tools.slug,
      isActive: tools.isActive,
      order: tools.order,
      toolTypeName: toolTypeTranslations.name,
      name: toolTranslations.title,
      description: toolTranslations.description,
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
    .orderBy(asc(tools.order));

  return result;
}

/**
 * Tools management page component.
 *
 * Renders a table view of all tools with:
 * - Tool name and description
 * - URL slug
 * - Tool type badge
 * - Active/inactive status
 * - Display order
 * - Edit action link
 *
 * @returns The rendered tools management page
 */
export default async function ToolsPage() {
  const toolsList = await getToolsList();

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
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

      {/* Tools Table */}
      <div className="rounded-lg border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Slug</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Type</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Status</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Order</th>
              <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {toolsList.map((tool) => (
              <tr key={tool.id} className="border-b last:border-0">
                {/* Name and Description */}
                <td className="p-4">
                  <div className="font-medium">{tool.name}</div>
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

                {/* Status Badge */}
                <td className="p-4">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      tool.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {tool.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>

                {/* Order */}
                <td className="p-4 text-sm text-muted-foreground">{tool.order}</td>

                {/* Edit Action */}
                <td className="p-4 text-right">
                  <Link
                    href={`/tools/${tool.id}`}
                    className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}

            {/* Empty State */}
            {toolsList.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No tools found. Create your first tool to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
