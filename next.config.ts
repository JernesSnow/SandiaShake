import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 reactStrictMode: false,

 experimental: {
  serverComponentsExternalPackages: ["chartjs-node-canvas"],
 },
};

export default nextConfig;