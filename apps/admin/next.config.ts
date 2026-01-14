import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for Docker deployment - creates standalone server.js
  output: 'standalone',
  transpilePackages: ['@magiworld/db', '@magiworld/types', '@magiworld/utils'],
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
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb', // Allow up to 25MB for server actions (20MB file + overhead)
    },
  },
};

export default nextConfig;
