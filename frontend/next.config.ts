import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    turbopack: {
      root: process.cwd(),
    }
  }
};

export default nextConfig;
