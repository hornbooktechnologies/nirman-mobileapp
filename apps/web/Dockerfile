# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.28.6 --activate
WORKDIR /workspace

FROM base AS pruner
RUN pnpm add --global turbo@2.11.10
COPY . .
RUN turbo prune @nirman-app/web --docker

FROM base AS builder
COPY --from=pruner /workspace/out/json/ ./
RUN --mount=type=cache,id=nirman-pnpm-store,target=/pnpm/store,sharing=locked \
  pnpm install --frozen-lockfile

COPY --from=pruner /workspace/out/full/ ./
COPY --from=pruner /workspace/scripts/load-root-env.cjs ./scripts/load-root-env.cjs

ARG API_INTERNAL_URL=https://api.nirmansite.com
ENV NEXT_PUBLIC_API_URL=$API_INTERNAL_URL
ENV NEXT_PUBLIC_API_BASE_PATH=/api/v1

RUN --mount=type=cache,id=nirman-web-turbo,target=/workspace/.turbo \
  --mount=type=cache,id=nirman-web-next,target=/workspace/apps/web/.next/cache \
  pnpm exec turbo run build --filter=@nirman-app/web...

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /workspace

COPY --from=builder --chown=node:node /workspace/apps/web/.next/standalone /workspace
COPY --from=builder --chown=node:node /workspace/apps/web/.next/static /workspace/apps/web/.next/static
COPY --from=builder --chown=node:node /workspace/apps/web/public /workspace/apps/web/public

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
