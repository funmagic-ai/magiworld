/**
 * @fileoverview Root Layout
 * @fileoverview 根布局
 *
 * Application root layout with font configuration and global styles.
 * Applies to all routes in the admin application.
 * 应用根布局，包含字体配置和全局样式。
 * 应用于管理后台的所有路由。
 *
 * @module app/layout
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Magiworld Admin',
  description: 'Content management for Magiworld',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.variable} min-h-dvh bg-background font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
