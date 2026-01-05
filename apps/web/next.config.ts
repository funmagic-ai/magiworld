import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: 'cdn.magiworld.ai' },
      { hostname: 'd1jmkr23cr2ayz.cloudfront.net' },
      { hostname: 'magiworld-cdn.s3.us-east-2.amazonaws.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
