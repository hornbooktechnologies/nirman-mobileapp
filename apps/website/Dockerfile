# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME/bin:$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.28.6 --activate
WORKDIR /workspace

FROM base AS pruner
RUN pnpm add --global turbo@2.11.10
COPY . .
RUN turbo prune @nirman-app/website --docker

FROM base AS builder
COPY --from=pruner /workspace/out/json/ ./
RUN --mount=type=cache,id=nirman-pnpm-store,target=/pnpm/store,sharing=locked \
  pnpm install --frozen-lockfile

COPY --from=pruner /workspace/out/full/ ./
COPY --from=pruner /workspace/scripts/load-root-env.cjs ./scripts/load-root-env.cjs

ARG API_INTERNAL_URL=https://api.nirmansite.com
ARG WEBSITE_PUBLIC_URL=https://nirmansite.com
ARG WEBSITE_INDEXING_ENABLED=true
ENV API_BASE_URL=$API_INTERNAL_URL/api/v1
ENV NEXT_PUBLIC_SITE_URL=$WEBSITE_PUBLIC_URL
ENV SITE_INDEXING_ENABLED=$WEBSITE_INDEXING_ENABLED

RUN --mount=type=cache,id=nirman-website-turbo,target=/workspace/.turbo \
  --mount=type=cache,id=nirman-website-next,target=/workspace/apps/website/.next/cache \
  pnpm exec turbo run build --filter=@nirman-app/website...

FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
WORKDIR /workspace

COPY --from=builder --chown=node:node /workspace/apps/website/.next/standalone /workspace
COPY --from=builder --chown=node:node /workspace/apps/website/.next/static /workspace/apps/website/.next/static
COPY --from=builder --chown=node:node /workspace/apps/website/public /workspace/apps/website/public

USER node
EXPOSE 3000
CMD ["node", "apps/website/server.js"]
