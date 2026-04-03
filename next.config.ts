import type { NextConfig } from "next";

const nextConfig: NextConfig = {
 reactStrictMode: false,
 serverExternalPackages: ["chartjs-node-canvas"],
};

export default nextConfig;