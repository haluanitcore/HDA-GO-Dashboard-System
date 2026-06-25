import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false, // FINDING-06: hide X-Powered-By: Next.js header
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
