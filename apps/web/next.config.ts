import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Public CDN (banners, tool images)
      { hostname: 'cdn.funmagic.ai' },
      // Shared files CDN
      { hostname: 'shared.funmagic.ai' },
      // CloudFront distributions (fallback domains)
      { hostname: '*.cloudfront.net' },
      // S3 direct access (development fallback)
      { hostname: 'funmagic-web-public-assets.s3.us-east-2.amazonaws.com' },
      { hostname: 'funmagic-web-users-assets-shared.s3.us-east-2.amazonaws.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
