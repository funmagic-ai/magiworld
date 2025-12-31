import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'ja', 'pt', 'zh'],
  defaultLocale: 'en',
});

export type Locale = (typeof routing.locales)[number];
