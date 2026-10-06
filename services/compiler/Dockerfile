FROM node:20-alpine
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages packages
COPY services/compiler services/compiler
RUN pnpm install --frozen-lockfile --filter @rehearse/compiler... --filter '!rehearse'
WORKDIR /app/services/compiler
EXPOSE 4002
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
