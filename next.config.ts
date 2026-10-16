import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 다른 기기(예: Tailscale)에서 개발 서버에 접속할 때 허용할 호스트. 쉼표로 구분한다.
  allowedDevOrigins: process.env.ALLOWED_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
