import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@magiworld/db', '@magiworld/types', '@magiworld/utils'],
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb', // Allow up to 25MB for server actions (20MB file + overhead)
    },
  },
};

export default nextConfig;
