/**
 * @fileoverview Homepage Banners Management Page
 *
 * Admin page for managing promotional banners displayed on the Magiworld homepage.
 * Supports both main carousel banners and sidebar banners.
 *
 * Features:
 * - Grid display of banner cards with image previews
 * - Banner type indicators (main/side)
 * - Active/inactive status badges
 * - Display order management
 * - Edit links for each banner
 * - Add new banner button
 *
 * @module apps/admin/app/banners/page
 */

import { db, homeBanners, homeBannerTranslations } from '@magiworld/db';
import { eq, asc, and } from 'drizzle-orm';
import Link from 'next/link';

/**
 * Banner list item for admin display.
 */
interface BannerListItem {
  /** Unique banner identifier */
  id: string;
  /** Banner type: 'main' for carousel, 'side' for sidebar */
  type: string;
  /** Direct URL to banner image (CDN) */
  imageUrl: string | null;
  /** Click-through link URL (if any) */
  link: string | null;
  /** Whether the banner is currently displayed */
  isActive: boolean;
  /** Display order (lower numbers appear first) */
  order: number;
  /** Localized banner title */
  title: string;
  /** Localized banner subtitle */
  subtitle: string | null;
}

/**
 * Fetch all banners with their translations.
 *
 * Joins banners with translation table for localized content.
 * Image URL is stored directly on the banner record.
 *
 * @returns Promise resolving to an array of banner list items
 */
async function getBannersList(): Promise<BannerListItem[]> {
  const result = await db
    .select({
      id: homeBanners.id,
      type: homeBanners.type,
      imageUrl: homeBanners.imageUrl,
      link: homeBanners.link,
      isActive: homeBanners.isActive,
      order: homeBanners.order,
      title: homeBannerTranslations.title,
      subtitle: homeBannerTranslations.subtitle,
    })
    .from(homeBanners)
    .innerJoin(
      homeBannerTranslations,
      and(
        eq(homeBannerTranslations.bannerId, homeBanners.id),
        eq(homeBannerTranslations.locale, 'en')
      )
    )
    .orderBy(asc(homeBanners.order));

  return result;
}

/**
 * Banners management page component.
 *
 * Renders a grid of banner cards with:
 * - Video/image aspect ratio preview
 * - Banner type badge (main/side)
 * - Active/inactive status badge
 * - Title and subtitle text
 * - Display order indicator
 * - Click-through to edit page
 *
 * @returns The rendered banners management page
 */
export default async function BannersPage() {
  const bannersList = await getBannersList();

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banners</h1>
          <p className="text-muted-foreground">Manage home page banners.</p>
        </div>
        <Link
          href="/banners/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Banner
        </Link>
      </div>

      {/* Banners Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bannersList.map((banner) => (
          <Link
            key={banner.id}
            href={`/banners/${banner.id}`}
            className="group rounded-lg border bg-card overflow-hidden shadow-sm transition-colors hover:bg-accent"
          >
            {/* Banner Image Preview */}
            <div className="aspect-video bg-muted relative">
              {banner.imageUrl ? (
                <img
                  src={banner.imageUrl}
                  alt={banner.title || 'Banner'}
                  className="w-full h-full object-cover"
                />
              ) : (
                /* Placeholder Icon */
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </div>
              )}

              {/* Status Badges */}
              <div className="absolute top-2 left-2 flex gap-2">
                {/* Type Badge */}
                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                  {banner.type}
                </span>

                {/* Active Status Badge */}
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    banner.isActive
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  }`}
                >
                  {banner.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Banner Content */}
            <div className="p-4">
              <h3 className="font-medium">{banner.title || 'Untitled'}</h3>
              {banner.subtitle && (
                <p className="text-sm text-muted-foreground line-clamp-1">{banner.subtitle}</p>
              )}
              <div className="mt-2 text-xs text-muted-foreground">Order: {banner.order}</div>
            </div>
          </Link>
        ))}

        {/* Empty State */}
        {bannersList.length === 0 && (
          <div className="col-span-full rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No banners found. Create your first banner to get started.
          </div>
        )}
      </div>
    </div>
  );
}
