import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "3mb",
    },
  },
  async redirects() {
    return [
      {
        source: "/sign-in",
        destination: "/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
