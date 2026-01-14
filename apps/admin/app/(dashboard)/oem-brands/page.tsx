/**
 * @fileoverview OEM Brands Management Page
 * @fileoverview OEM品牌管理页面
 *
 * Admin page for managing OEM partner brands (white-label software).
 * Each brand has custom theming, branding, and tool type filtering.
 * 管理OEM合作伙伴品牌（白标软件）的管理页面。
 * 每个品牌可配置主题、品牌标识和工具类型过滤。
 *
 * Features / 功能:
 * - Grid display of brand cards / 品牌卡片的网格显示
 * - Theme color preview / 主题颜色预览
 * - Software ID reference / 软件ID引用
 * - Active status indicator
 * - Edit links for each brand
 * - Add new brand button
 *
 * @module apps/admin/app/oem-brands/page
 */

import { getOemBrandsList } from '@/lib/actions/oem-brands';
import { brandPalettes } from '@/lib/brand-palettes';
import Link from 'next/link';

/**
 * OEM Brands management page component.
 *
 * Renders a grid of brand cards with:
 * - Name and primary color swatch
 * - Software ID for identification
 * - Active status badge
 * - Click-through to edit page
 *
 * @returns The rendered OEM brands management page
 */
export default async function OemBrandsPage() {
  const brands = await getOemBrandsList();

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OEM Brands</h1>
          <p className="text-muted-foreground">Manage OEM software brand configurations.</p>
        </div>
        <Link
          href="/oem-brands/new"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Brand
        </Link>
      </div>

      {/* Brands Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {brands.map((brand) => (
          <Link
            key={brand.id}
            href={`/oem-brands/${brand.id}`}
            className="rounded-lg border bg-card p-6 shadow-sm transition-colors hover:bg-accent"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {/* Logo or Color Swatch */}
                <div
                  className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border"
                  style={{
                    backgroundColor: brand.themeConfig?.logo
                      ? undefined
                      : (brandPalettes[brand.themeConfig?.palette || 'blue']?.previewColor || '#3B82F6'),
                  }}
                >
                  {brand.themeConfig?.logo && (
                    <img
                      src={brand.themeConfig.logo}
                      alt={brand.name}
                      
                      className="object-contain p-1"
                    />
                  )}
                </div>
                <div>
                  {/* Brand Name */}
                  <h3 className="font-semibold">{brand.name}</h3>
                  {/* Software ID */}
                  <p className="text-xs text-muted-foreground font-mono">
                    {brand.softwareId}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                  brand.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                }`}
              >
                {brand.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Brand Display Name & Palette */}
            <div className="mt-3 flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor: brandPalettes[brand.themeConfig?.palette || 'blue']?.previewColor || '#3B82F6',
                }}
              />
              <span className="text-xs text-muted-foreground">
                {brandPalettes[brand.themeConfig?.palette || 'blue']?.name || 'Blue'}
              </span>
              {brand.themeConfig?.brandName && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">{brand.themeConfig.brandName}</span>
                </>
              )}
            </div>

            {/* Metadata */}
            <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <span>Slug: {brand.slug}</span>
              {brand.allowedToolTypeIds.length > 0 && (
                <span>{brand.allowedToolTypeIds.length} tool types</span>
              )}
            </div>
          </Link>
        ))}

        {/* Empty State */}
        {brands.length === 0 && (
          <div className="col-span-full rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No OEM brands found. Create your first brand to get started.
          </div>
        )}
      </div>
    </div>
  );
}
