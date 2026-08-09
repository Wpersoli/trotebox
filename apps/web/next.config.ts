import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ['@trotebox/contracts'],
  poweredByHeader: false,
  reactStrictMode: true
};

export default nextConfig;
