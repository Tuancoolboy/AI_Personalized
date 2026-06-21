import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel builder expects `.next` at repo root when Root Directory is unset.
  distDir: process.env.VERCEL ? "../../.next" : ".next",
};

export default nextConfig;
