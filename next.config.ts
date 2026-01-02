import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker deployment
  output: 'standalone',

  // External packages for server-side
  serverExternalPackages: ['better-sqlite3', '@napi-rs/canvas', 'sharp', 'pdfjs-dist'],

  // Empty turbopack config to silence warning
  turbopack: {},

  // Disable strict mode to avoid double-fetching single-use nonces in dev
  reactStrictMode: false,
};

export default nextConfig;
