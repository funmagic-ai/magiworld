import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@magiworld/db', '@magiworld/types', '@magiworld/utils'],
};

export default nextConfig;
