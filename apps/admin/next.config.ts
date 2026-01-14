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
      // Pino core and transports
      '../../node_modules/pino/**/*',
      '../../node_modules/pino-abstract-transport/**/*',
      '../../node_modules/pino-pretty/**/*',
      '../../node_modules/pino-std-serializers/**/*',
      // Pino dependencies
      '../../node_modules/thread-stream/**/*',
      '../../node_modules/sonic-boom/**/*',
      '../../node_modules/split2/**/*',
      '../../node_modules/real-require/**/*',
      '../../node_modules/on-exit-leak-free/**/*',
      '../../node_modules/atomic-sleep/**/*',
      '../../node_modules/fast-copy/**/*',
      '../../node_modules/fast-safe-stringify/**/*',
      '../../node_modules/colorette/**/*',
      '../../node_modules/dateformat/**/*',
      '../../node_modules/pump/**/*',
      '../../node_modules/secure-json-parse/**/*',
      '../../node_modules/help-me/**/*',
      '../../node_modules/joycon/**/*',
      '../../node_modules/strip-json-comments/**/*',
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb', // Allow up to 25MB for server actions (20MB file + overhead)
    },
  },
};

export default nextConfig;
