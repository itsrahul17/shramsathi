import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for Firebase hosting
  output: 'export',
  // Disable image optimization for static export
  images: {
    unoptimized: true
  },
  // Optional: Add trailing slash for better compatibility
  trailingSlash: true
};

export default nextConfig;
