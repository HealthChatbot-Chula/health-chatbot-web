import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {},
  turbopack: {},
  allowedDevOrigins: [
    "thieving-reboot-detached.ngrok-free.dev",
    "192.168.1.186"
  ],
  devIndicators: false,
};

export default nextConfig;
