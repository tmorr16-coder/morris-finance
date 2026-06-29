import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // All traffic redirects to the hub — finance is now at morrisai.family/finance/
  async redirects() {
    return [
      { source: "/", destination: "https://morrisai.family/finance/dashboard", permanent: true },
      { source: "/dashboard", destination: "https://morrisai.family/finance/dashboard", permanent: true },
      { source: "/dashboard/:path*", destination: "https://morrisai.family/finance/dashboard/:path*", permanent: true },
      { source: "/:path*", destination: "https://morrisai.family/finance/:path*", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.googleusercontent.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
    ],
  },
};

export default nextConfig;
