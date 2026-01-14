import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  // Required for Docker deployment - creates standalone server.js
  output: 'standalone',
  // Exclude pino from bundling - it uses worker threads that don't bundle correctly
  serverExternalPackages: ['pino', 'pino-pretty'],
  // Force include pino's worker thread dependencies in standalone output
  // These are dynamically required by pino and not traced by Next.js
  // Path is relative to project root (where pnpm puts shared node_modules)
  outputFileTracingIncludes: {
    '/*': [
      '../../node_modules/pino/**/*',
      '../../node_modules/pino-abstract-transport/**/*',
      '../../node_modules/pino-pretty/**/*',
      '../../node_modules/thread-stream/**/*',
      '../../node_modules/sonic-boom/**/*',
    ],
  },
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
