import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ["prisma-adapter-sqlite"],
};

export default nextConfig;
