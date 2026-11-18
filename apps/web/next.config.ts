import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // В monorepo Next иначе может искать файлы не там.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  // Для Docker-образа (см. infra/docker/Dockerfile.web).
  output: "standalone",
};

export default nextConfig;
