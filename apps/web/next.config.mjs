import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), "../../.env") });
loadEnv({ path: resolve(process.cwd(), ".env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.DOCKER_BUILD === "1" ? "standalone" : undefined,
  transpilePackages: ["@rehearse/shared"],
  experimental: {
    serverComponentsExternalPackages: ["bcryptjs", "@prisma/client"],
  },
};

export default nextConfig;
