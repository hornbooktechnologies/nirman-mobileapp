import type { NextConfig } from "next";

// Older configurations used an absolute browser base path. Treat it as
// the proxy upstream so existing remote API configurations still work.
const configuredBasePath = process.env.NEXT_PUBLIC_API_BASE_PATH;
const API_URL = (
  configuredBasePath && /^https?:\/\//.test(configuredBasePath)
    ? configuredBasePath
    : process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/+$/, "").replace(/\/api\/v1$/, "");
const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_URL}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
