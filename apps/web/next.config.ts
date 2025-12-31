import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'cdn.magiworld.ai' },
      { hostname: 's3.ap-northeast-1.amazonaws.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
