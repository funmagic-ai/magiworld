/**
 * @fileoverview Admin Application Root Layout
 *
 * This is the root layout component for the Magiworld Admin dashboard.
 * It provides the application shell with a fixed sidebar navigation and
 * main content area. The layout is shared across all admin pages.
 *
 * Features:
 * - Fixed sidebar with navigation links
 * - Responsive layout with flex container
 * - Inter font with CSS variable for theming
 * - Dark mode support via CSS custom properties
 *
 * @module apps/admin/app/layout
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

/**
 * Inter font configuration.
 * Loaded as a CSS variable for use in Tailwind configuration.
 */
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

/**
 * Page metadata for the admin application.
 * Displayed in browser tabs and search results.
 */
export const metadata: Metadata = {
  title: 'Magiworld Admin',
  description: 'Content management for Magiworld',
};

/**
 * Root layout component for the admin application.
 *
 * Renders the application shell with:
 * - A fixed 256px sidebar with navigation links
 * - A scrollable main content area
 * - Consistent styling and typography
 *
 * @param props - Component props
 * @param props.children - Child components to render in the main content area
 * @returns The rendered layout component
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} min-h-screen bg-background font-sans antialiased`}>
        <div className="flex min-h-screen">
          {/* Sidebar Navigation */}
          <aside className="w-64 border-r bg-sidebar">
            {/* Logo and Brand */}
            <div className="flex h-16 items-center border-b px-6">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <span className="text-sm font-bold">M</span>
                </div>
                <span className="font-semibold">Admin</span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="p-4 space-y-1">
              {/* Dashboard Link */}
              <a
                href="/"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-sidebar-accent"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                Dashboard
              </a>

              {/* Tools Link */}
              <a
                href="/tools"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                </svg>
                Tools
              </a>

              {/* Tool Types Link */}
              <a
                href="/tool-types"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
                Tool Types
              </a>

              {/* Banners Link */}
              <a
                href="/banners"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                Banners
              </a>

              {/* Media Link */}
              <a
                href="/media"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                  <line x1="16" y1="5" x2="22" y2="5" />
                  <line x1="19" y1="2" x2="19" y2="8" />
                </svg>
                Media
              </a>
            </nav>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
