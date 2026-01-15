import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Required for Docker deployment - creates standalone server.js
  output: 'standalone',
  images: {
    remotePatterns: [
      // CloudFront distributions (covers all *.cloudfront.net domains)
      { hostname: '*.cloudfront.net' },
      // Custom CDN domains (configure via DNS CNAME to CloudFront)
      { hostname: 'cdn.funmagic.ai' },
      { hostname: 'shared.funmagic.ai' },
      // S3 direct access (wildcard for any bucket in any region)
      { hostname: '*.s3.*.amazonaws.com' },
    ],
  },
};

export default withNextIntl(nextConfig);
