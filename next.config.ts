import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/weekly-report",
  images: { unoptimized: true },
};

export default nextConfig;
