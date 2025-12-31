import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - API routes
  // - Static files
  // - _next internal paths
  matcher: ['/', '/(en|ja|pt|zh)/:path*'],
};
