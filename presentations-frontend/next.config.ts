import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvConfig } from "@next/env";
import type { NextConfig } from "next";

const nextConfigDir = path.dirname(fileURLToPath(import.meta.url));
// Репозиторий: .env.local в корне (на уровень выше приложения). Next по умолчанию читает только presentations-frontend/.
loadEnvConfig(path.join(nextConfigDir, ".."));
loadEnvConfig(nextConfigDir);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
