FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

COPY services/ai-engine services/ai-engine
COPY apps/web/prisma prisma
RUN pnpm install --frozen-lockfile --filter @rehearse/ai-engine... --filter '!rehearse' && pnpm add -D -w prisma && pnpm exec prisma generate
# Removed redundant generate (already executed above)
WORKDIR /app/services/ai-engine
EXPOSE 4001
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
