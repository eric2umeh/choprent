import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
