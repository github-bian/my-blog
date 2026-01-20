import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    turbopack: {
      root: process.cwd(),
    }
  },
  images: {
    domains: ['your-backend.railway.app'],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  // 生产环境优化
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
};

export default nextConfig;
