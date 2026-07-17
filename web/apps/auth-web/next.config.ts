import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  allowedDevOrigins: [".monkeycode-ai.online"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:9898/api/:path*" },
      { source: "/oauth/:path*", destination: "http://localhost:9898/oauth/:path*" },
      { source: "/userinfo", destination: "http://localhost:9898/userinfo" },
      { source: "/.well-known/:path*", destination: "http://localhost:9898/.well-known/:path*" },
    ]
  },
}

export default nextConfig