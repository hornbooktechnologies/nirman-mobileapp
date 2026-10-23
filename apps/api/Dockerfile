# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.28.6 --activate
WORKDIR /workspace

FROM base AS pruner
RUN pnpm add --global turbo@2.11.10
COPY . .
RUN turbo prune @nirman-app/api --docker

FROM base AS builder
COPY --from=pruner /workspace/out/json/ ./
RUN --mount=type=cache,id=nirman-pnpm-store,target=/pnpm/store,sharing=locked \
  pnpm install --frozen-lockfile

COPY --from=pruner /workspace/out/full/ ./
RUN --mount=type=cache,id=nirman-api-turbo,target=/workspace/.turbo \
  pnpm exec turbo run build --filter=@nirman-app/api...
RUN --mount=type=cache,id=nirman-pnpm-store,target=/pnpm/store,sharing=locked \
  pnpm --filter @nirman-app/api deploy --prod /prod/api

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder --chown=node:node /prod/api /app
COPY --from=builder --chown=node:node /workspace/apps/api/dist /app/dist
COPY --from=builder --chown=node:node /workspace/apps/api/src/database/sql/migrations /app/src/database/sql/migrations

USER node
ENV PORT=4000
EXPOSE 4000
CMD ["node", "dist/src/main.js"]

FROM runtime AS tools

USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends default-mysql-client \
  && rm -rf /var/lib/apt/lists/*
COPY --chmod=755 deploy/coolify-migrate.sh /app/deploy/coolify-migrate.sh
ENV DB_MIGRATION_SQL_DIR=/app/src/database/sql/migrations
CMD ["node", "dist/scripts/migration-status.js"]
