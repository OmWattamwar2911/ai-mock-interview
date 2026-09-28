FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/ai-engine/package.json services/ai-engine/package.json
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY services/ai-engine services/ai-engine
WORKDIR /app/services/ai-engine
EXPOSE 4001
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
