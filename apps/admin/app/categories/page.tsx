/**
 * @fileoverview Categories Management Page
 *
 * Admin page for managing tool categories on the Magiworld platform.
 * Categories are used to organize and filter tools into logical groups.
 *
 * Features:
 * - Tabular list of all categories with icons
 * - Display order management
 * - Edit links for each category
 * - Add new category button
 *
 * @module apps/admin/app/categories/page
 */

import { db, categories, categoryTranslations } from '@magiworld/db';
import { eq, asc } from 'drizzle-orm';
import Link from 'next/link';

/**
 * Category list item for admin display.
 */
interface CategoryListItem {
  /** Unique category identifier */
  id: string;
  /** URL-friendly slug */
  slug: string;
  /** Icon identifier (emoji or icon key) */
  icon: string | null;
  /** Display order (lower numbers appear first) */
  order: number;
  /** Localized category name */
  name: string;
}

/**
 * Fetch all categories with their English translations.
 *
 * @returns Promise resolving to an array of category list items
 */
async function getCategoriesList(): Promise<CategoryListItem[]> {
  const result = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      icon: categories.icon,
      order: categories.order,
      name: categoryTranslations.name,
    })
    .from(categories)
    .innerJoin(
      categoryTranslations,
      eq(categoryTranslations.categoryId, categories.id)
    )
    .where(eq(categoryTranslations.locale, 'en'))
    .orderBy(asc(categories.order));

  return result;
}

/**
 * Categories management page component.
 *
 * Renders a table view of all categories with:
 * - Category icon
 * - Localized name
 * - URL slug
 * - Display order
 * - Edit action link
 *
 * @returns The rendered categories management page
 */
export default async function CategoriesPage() {
  const categoriesList = await getCategoriesList();

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">Manage tool categories.</p>
        </div>
        <Link
          href="/categories/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Category
        </Link>
      </div>

      {/* Categories Table */}
      <div className="rounded-lg border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Icon</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Name</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Slug</th>
              <th className="p-4 text-left text-sm font-medium text-muted-foreground">Order</th>
              <th className="p-4 text-right text-sm font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categoriesList.map((category) => (
              <tr key={category.id} className="border-b last:border-0">
                {/* Icon */}
                <td className="p-4">
                  <span className="text-2xl">{category.icon}</span>
                </td>

                {/* Name */}
                <td className="p-4">
                  <div className="font-medium">{category.name}</div>
                </td>

                {/* Slug */}
                <td className="p-4 text-sm text-muted-foreground">{category.slug}</td>

                {/* Order */}
                <td className="p-4 text-sm text-muted-foreground">{category.order}</td>

                {/* Edit Action */}
                <td className="p-4 text-right">
                  <Link
                    href={`/categories/${category.id}`}
                    className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-accent"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}

            {/* Empty State */}
            {categoriesList.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  No categories found. Create your first category to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
