# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS workspace

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable && corepack prepare pnpm@11.10.0 --activate

WORKDIR /workspace
COPY . .
RUN pnpm install --frozen-lockfile

FROM workspace AS api-build
RUN pnpm --filter @nirman-app/api... build

FROM api-build AS api-deploy
RUN pnpm --filter @nirman-app/api deploy --prod --legacy /prod/api

FROM workspace AS web-build
ARG API_INTERNAL_URL=http://api:4000
ENV NEXT_PUBLIC_API_URL=$API_INTERNAL_URL
ENV NEXT_PUBLIC_API_BASE_PATH=/api/v1
RUN pnpm --filter @nirman-app/web... build

FROM workspace AS website-build
ARG WEBSITE_PUBLIC_URL=https://nirmansite.com
ARG WEBSITE_INDEXING_ENABLED=true
ENV NEXT_PUBLIC_SITE_URL=$WEBSITE_PUBLIC_URL
ENV SITE_INDEXING_ENABLED=$WEBSITE_INDEXING_ENABLED
RUN pnpm --filter @nirman-app/website build

FROM node:22-bookworm-slim AS runtime

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NODE_ENV=production

RUN corepack enable && corepack prepare pnpm@11.10.0 --activate
WORKDIR /workspace
USER node

FROM runtime AS api
WORKDIR /app
COPY --from=api-deploy --chown=node:node /prod/api /app
ENV PORT=4000
EXPOSE 4000
CMD ["node", "dist/src/main.js"]

FROM api AS tools
USER root
RUN apt-get update \
  && apt-get install -y --no-install-recommends default-mysql-client \
  && rm -rf /var/lib/apt/lists/*
ENV DB_MIGRATION_SQL_DIR=/app/src/database/sql/migrations
CMD ["node", "dist/scripts/migration-status.js"]

FROM runtime AS web
COPY --from=web-build --chown=node:node /workspace/apps/web/.next/standalone /workspace
COPY --from=web-build --chown=node:node /workspace/apps/web/.next/static /workspace/apps/web/.next/static
COPY --from=web-build --chown=node:node /workspace/apps/web/public /workspace/apps/web/public
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

FROM runtime AS website
COPY --from=website-build --chown=node:node /workspace/apps/website/.next/standalone /workspace
COPY --from=website-build --chown=node:node /workspace/apps/website/.next/static /workspace/apps/website/.next/static
COPY --from=website-build --chown=node:node /workspace/apps/website/public /workspace/apps/website/public
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "apps/website/server.js"]
