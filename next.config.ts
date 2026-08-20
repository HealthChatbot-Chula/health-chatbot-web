import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {},
  turbopack: {},
  allowedDevOrigins: ["thieving-reboot-detached.ngrok-free.dev"],
  devIndicators: false,
};

export default nextConfig;
