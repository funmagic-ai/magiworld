/**
 * @fileoverview Tool Types Management Page
 *
 * Admin page for managing tool type classifications on the Magiworld platform.
 * Tool types define categories of AI tools (e.g., stylize, edit, 3d_gen) and
 * map to specific React components for the tool interface.
 *
 * Features:
 * - Grid display of tool type cards
 * - Badge color preview for each type
 * - Component key reference
 * - Edit links for each tool type
 * - Add new tool type button
 *
 * @module apps/admin/app/tool-types/page
 */

import { db, toolTypes, toolTypeTranslations } from '@magiworld/db';
import { eq, asc } from 'drizzle-orm';
import Link from 'next/link';

/**
 * Tool type list item for admin display.
 */
interface ToolTypeListItem {
  /** Unique tool type identifier */
  id: string;
  /** URL-friendly slug */
  slug: string;
  /** Badge color key for UI display */
  badgeColor: string;
  /** Localized tool type name */
  name: string;
  /** Localized tool type description */
  description: string | null;
}

/**
 * Fetch all tool types with their English translations.
 *
 * @returns Promise resolving to an array of tool type list items
 */
async function getToolTypesList(): Promise<ToolTypeListItem[]> {
  const result = await db
    .select({
      id: toolTypes.id,
      slug: toolTypes.slug,
      badgeColor: toolTypes.badgeColor,
      name: toolTypeTranslations.name,
      description: toolTypeTranslations.description,
    })
    .from(toolTypes)
    .innerJoin(
      toolTypeTranslations,
      eq(toolTypeTranslations.toolTypeId, toolTypes.id)
    )
    .where(eq(toolTypeTranslations.locale, 'en'))
    .orderBy(asc(toolTypes.slug));

  return result;
}

/**
 * Badge color CSS class mappings.
 * Maps badge color keys to Tailwind CSS classes.
 */
const badgeColorStyles: Record<string, string> = {
  default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
};

/**
 * Tool Types management page component.
 *
 * Renders a grid of tool type cards with:
 * - Name displayed as a colored badge
 * - Description text
 * - Slug metadata
 * - Click-through to edit page
 *
 * @returns The rendered tool types management page
 */
export default async function ToolTypesPage() {
  const toolTypesList = await getToolTypesList();

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tool Types</h1>
          <p className="text-muted-foreground">Manage tool type classifications.</p>
        </div>
        <Link
          href="/tool-types/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Tool Type
        </Link>
      </div>

      {/* Tool Types Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {toolTypesList.map((toolType) => (
          <Link
            key={toolType.id}
            href={`/tool-types/${toolType.id}`}
            className="rounded-lg border bg-card p-6 shadow-sm transition-colors hover:bg-accent"
          >
            <div className="flex items-start justify-between">
              <div>
                {/* Badge with Tool Type Name */}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    badgeColorStyles[toolType.badgeColor] || badgeColorStyles.default
                  }`}
                >
                  {toolType.name}
                </span>

                {/* Description */}
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {toolType.description}
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div className="mt-4 text-xs text-muted-foreground">
              <span>Slug: {toolType.slug}</span>
            </div>
          </Link>
        ))}

        {/* Empty State */}
        {toolTypesList.length === 0 && (
          <div className="col-span-full rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No tool types found. Create your first tool type to get started.
          </div>
        )}
      </div>
    </div>
  );
}
