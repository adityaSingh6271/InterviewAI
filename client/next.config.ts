import type { NextConfig } from "next";

const rawApiOrigin = process.env.API_ORIGIN?.trim();
const API_ORIGIN = (rawApiOrigin || "http://localhost:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    // Proxy API calls to the Express server so the browser only ever sees
    // same-origin /api/v1/* requests. This keeps the httpOnly refresh cookie
    // (Path=/api/v1/auth) working without any CORS configuration.
    return [
      {
        source: "/api/v1/:path*",
        destination: `${API_ORIGIN}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
