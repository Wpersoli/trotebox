import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@trotebox/contracts', '@trotebox/db'],
  serverExternalPackages: ['@prisma/client', 'prisma', 'twilio'],
  poweredByHeader: false
};

export default nextConfig;
