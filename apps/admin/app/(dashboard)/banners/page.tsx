/**
 * @fileoverview Homepage Banners Management Page
 *
 * Admin page for managing promotional banners displayed on the Magiworld homepage.
 * Supports both main carousel banners and sidebar banners.
 *
 * Features:
 * - Grid display of banner cards with image previews
 * - Search, filter, and sort toolbar
 * - Banner type indicators (main/side)
 * - Quick active toggle switches
 * - Display order management
 * - Edit links for each banner
 * - Add new banner button
 *
 * @module apps/admin/app/banners/page
 */

import {
  db,
  homeBanners,
  homeBannerTranslations,
  eq,
  asc,
  desc,
  and,
  isNull,
  ilike,
  or,
} from '@magiworld/db';
import Link from 'next/link';
import { RestoreBannerButton } from '@/components/restore-banner-button';
import { ListToolbar } from '@/components/list-toolbar';
import { BannerActiveToggle } from '@/components/banner-active-toggle';

/**
 * Banner list item for admin display.
 */
interface BannerListItem {
  id: string;
  type: string;
  imageUrl: string | null;
  link: string | null;
  isActive: boolean;
  order: number;
  title: string;
  subtitle: string | null;
  deletedAt: Date | null;
  updatedAt: Date;
}

interface QueryParams {
  search?: string;
  type?: string;
  sort?: string;
  showDeleted?: string;
}

/**
 * Fetch all banners with their translations.
 */
async function getBannersList(params: QueryParams): Promise<BannerListItem[]> {
  const { search, type, sort, showDeleted } = params;

  let query = db
    .select({
      id: homeBanners.id,
      type: homeBanners.type,
      imageUrl: homeBanners.imageUrl,
      link: homeBanners.link,
      isActive: homeBanners.isActive,
      order: homeBanners.order,
      title: homeBannerTranslations.title,
      subtitle: homeBannerTranslations.subtitle,
      deletedAt: homeBanners.deletedAt,
      updatedAt: homeBanners.updatedAt,
    })
    .from(homeBanners)
    .innerJoin(
      homeBannerTranslations,
      and(
        eq(homeBannerTranslations.bannerId, homeBanners.id),
        eq(homeBannerTranslations.locale, 'en')
      )
    )
    .$dynamic();

  // Build where conditions
  const conditions = [];

  if (showDeleted !== 'true') {
    conditions.push(isNull(homeBanners.deletedAt));
  }

  if (type && type !== 'all') {
    conditions.push(eq(homeBanners.type, type));
  }

  if (search) {
    conditions.push(
      or(
        ilike(homeBannerTranslations.title, `%${search}%`),
        ilike(homeBannerTranslations.subtitle, `%${search}%`)
      )
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  // Apply sorting
  switch (sort) {
    case 'title-asc':
      query = query.orderBy(asc(homeBannerTranslations.title));
      break;
    case 'title-desc':
      query = query.orderBy(desc(homeBannerTranslations.title));
      break;
    case 'date-asc':
      query = query.orderBy(asc(homeBanners.updatedAt));
      break;
    case 'date-desc':
      query = query.orderBy(desc(homeBanners.updatedAt));
      break;
    case 'order-desc':
      query = query.orderBy(desc(homeBanners.order));
      break;
    default:
      query = query.orderBy(asc(homeBanners.order));
  }

  return query;
}

const FILTER_OPTIONS = [
  { value: 'main', label: 'Main (Carousel)' },
  { value: 'side', label: 'Side (Sidebar)' },
];

const SORT_OPTIONS = [
  { value: 'title-asc', label: 'Title A-Z' },
  { value: 'title-desc', label: 'Title Z-A' },
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'order-desc', label: 'Order (High-Low)' },
];

interface PageProps {
  searchParams: Promise<QueryParams>;
}

export default async function BannersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const bannersList = await getBannersList(params);

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Banners</h1>
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

      {/* Toolbar */}
      <ListToolbar
        searchPlaceholder="Search banners..."
        filterOptions={FILTER_OPTIONS}
        filterLabel="Type"
        filterParamName="type"
        sortOptions={SORT_OPTIONS}
        currentSearch={params.search || ''}
        currentFilter={params.type || ''}
        currentSort={params.sort || ''}
        showDeleted={params.showDeleted === 'true'}
      />

      {/* Banners Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bannersList.map((banner) => {
          const isDeleted = banner.deletedAt !== null;
          return (
            <div
              key={banner.id}
              className={`group rounded-lg border bg-card overflow-hidden shadow-sm ${isDeleted ? 'opacity-60' : ''}`}
            >
              <Link href={`/banners/${banner.id}`}>
                {/* Banner Image Preview */}
                <div className="aspect-video bg-muted relative">
                  {banner.imageUrl ? (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title || 'Banner'}
                      className={`w-full h-full object-cover ${isDeleted ? 'grayscale' : ''}`}
                    />
                  ) : (
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
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">
                      {banner.type}
                    </span>
                    {isDeleted && (
                      <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2.5 py-0.5 text-xs font-medium">
                        Deleted
                      </span>
                    )}
                  </div>
                </div>

                {/* Banner Content */}
                <div className="p-4">
                  <h3 className={`font-medium ${isDeleted ? 'line-through text-muted-foreground' : ''}`}>
                    {banner.title || 'Untitled'}
                  </h3>
                  {banner.subtitle && (
                    <p className="text-sm text-muted-foreground line-clamp-1">{banner.subtitle}</p>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">Order: {banner.order}</div>
                </div>
              </Link>

              {/* Footer with Active Toggle or Restore Button */}
              <div className="px-4 pb-4 flex items-center justify-between">
                {isDeleted ? (
                  <RestoreBannerButton id={banner.id} />
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground">Active</span>
                    <BannerActiveToggle id={banner.id} isActive={banner.isActive} />
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {bannersList.length === 0 && (
          <div className="col-span-full rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No banners found. {params.search || params.type ? 'Try adjusting your filters.' : 'Create your first banner to get started.'}
          </div>
        )}
      </div>
    </div>
  );
}
