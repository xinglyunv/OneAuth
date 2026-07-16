import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://localhost:8080/api/:path*" },
      { source: "/oauth/:path*", destination: "http://localhost:8080/oauth/:path*" },
      { source: "/userinfo", destination: "http://localhost:8080/userinfo" },
      { source: "/.well-known/:path*", destination: "http://localhost:8080/.well-known/:path*" },
    ]
  },
}

export default nextConfig