FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY services/compiler/package.json services/compiler/package.json
RUN pnpm install --frozen-lockfile
COPY packages/shared packages/shared
COPY services/compiler services/compiler
WORKDIR /app/services/compiler
EXPOSE 4002
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
