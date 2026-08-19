import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Default 1MB is too small for sponsor logo uploads (modules/tournaments
    // sponsor-logos, 0022_sponsors.sql).
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
