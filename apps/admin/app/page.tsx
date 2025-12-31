/**
 * @fileoverview Admin Dashboard Page
 *
 * The main dashboard page for the Magiworld Admin application.
 * Displays an overview of content statistics with quick links to
 * manage each content type.
 *
 * Features:
 * - Real-time statistics from the database
 * - Clickable stat cards linking to management pages
 * - Server-side rendering for fresh data
 *
 * @module apps/admin/app/page
 */

import { db, tools, toolTypes, categories, media, homeBanners } from '@magiworld/db';
import { count } from 'drizzle-orm';

/**
 * Dashboard statistics object.
 * Contains counts for all major content types.
 */
interface DashboardStats {
  /** Total number of AI tools */
  tools: number;
  /** Total number of tool type classifications */
  toolTypes: number;
  /** Total number of categories */
  categories: number;
  /** Total number of uploaded media files */
  media: number;
  /** Total number of homepage banners */
  banners: number;
}

/**
 * Fetch aggregate statistics from the database.
 *
 * Performs COUNT queries on all major tables to get
 * an overview of content in the system.
 *
 * @returns Promise resolving to dashboard statistics
 */
async function getStats(): Promise<DashboardStats> {
  const [toolCount] = await db.select({ count: count() }).from(tools);
  const [toolTypeCount] = await db.select({ count: count() }).from(toolTypes);
  const [categoryCount] = await db.select({ count: count() }).from(categories);
  const [mediaCount] = await db.select({ count: count() }).from(media);
  const [bannerCount] = await db.select({ count: count() }).from(homeBanners);

  return {
    tools: toolCount.count,
    toolTypes: toolTypeCount.count,
    categories: categoryCount.count,
    media: mediaCount.count,
    banners: bannerCount.count,
  };
}

/**
 * Dashboard page component.
 *
 * Renders the admin dashboard with:
 * - Welcome message and description
 * - Grid of statistic cards with live counts
 * - Quick navigation to content management sections
 *
 * @returns The rendered dashboard page
 */
export default async function DashboardPage() {
  const stats = await getStats();

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Magiworld Admin. Manage your content here.
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Tools"
          value={stats.tools}
          href="/tools"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          }
        />
        <StatCard
          title="Tool Types"
          value={stats.toolTypes}
          href="/tool-types"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          }
        />
        <StatCard
          title="Categories"
          value={stats.categories}
          href="/categories"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          }
        />
        <StatCard
          title="Banners"
          value={stats.banners}
          href="/banners"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          }
        />
        <StatCard
          title="Media"
          value={stats.media}
          href="/media"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
              <line x1="16" y1="5" x2="22" y2="5" />
              <line x1="19" y1="2" x2="19" y2="8" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

/**
 * Statistic card component props.
 */
interface StatCardProps {
  /** Card title displayed above the value */
  title: string;
  /** Numeric value to display prominently */
  value: number;
  /** Navigation URL when card is clicked */
  href: string;
  /** Icon element displayed in the card header */
  icon: React.ReactNode;
}

/**
 * Statistic card component.
 *
 * Displays a single statistic with:
 * - Title and icon in the header
 * - Large numeric value
 * - Click-through navigation to management page
 * - Hover state for interactivity
 *
 * @param props - Component props
 * @returns The rendered stat card
 */
function StatCard({ title, value, href, icon }: StatCardProps) {
  return (
    <a
      href={href}
      className="rounded-lg border bg-card p-6 shadow-sm transition-colors hover:bg-accent"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
    </a>
  );
}
