# NirmanSite

NirmanSite is an enterprise Builder SaaS platform for real estate builders.

The repository currently contains the inherited full-stack monorepo foundation for building the product with Next.js, NestJS, Expo, pnpm, and Turborepo.

NirmanSite uses MySQL/MariaDB through `mysql2` inside the NestJS API. Prisma remains inherited history only and should not be used for new NirmanSite work. See `docs/decisions/004-database-access-mysql2.md`.

## What Is Included

- `apps/web`: Next.js App Router administration and back-office portal with protected organization/project flows and Workers management.
- `apps/website`: Public Next.js marketing website for `nirmansite.com`, including contact and account-activation flows.
- `apps/api`: NestJS API with authentication, RBAC, organizations, projects, Workers, platform administration, health checks, and API-local mysql2 database access.
- `packages/database`: archived inherited Prisma database history; not active runtime/tooling.
- `packages/shared`: Shared constants, permission definitions, schemas, and types.
- `apps/mobile`: Expo / React Native field app with session and active-project context plus an online-write Workers roster/quick-create flow.
- `docs`: NirmanSite AI context, architecture notes, decisions, task tracking, and module templates.

Workers currently has a reconciled vertical slice and passing automated static/API checks, but remains pending an owner decision for active assignments during worker deactivation. Persisted offline cache/sync is not implemented.

## Product Direction

NirmanSite will include:

- Builder organization and team management.
- Projects, phases, towers, floors, units, and inventory.
- Leads, customers, bookings, documents, payments, approvals, tasks, issues, and site progress.
- Shared contracts, permissions, statuses, and schemas across API, web, and mobile apps.
- An Expo / React Native mobile app for site and field workflows.

## First Run

```bash
pnpm install
cp .env.example .env
pnpm --filter @nirman-app/shared build
pnpm dev
```

All four local apps read one root `.env`. Fill its credentials before starting.
For the separate API/Web/Website/Mobile startup commands, phone configuration,
and activation/email checks, follow [Local environment setup](docs/development/local-environment.md).
Do not create app-level environment overrides. Existing local files were backed
up to the ignored `.env-backups/` directory during consolidation.

Do not run Prisma database commands for new NirmanSite work. Use the API-local mysql2 migration and seed commands only after confirming a safe local or throwaway database target:

```bash
pnpm db:migrate:status
pnpm db:migrate
pnpm db:seed
```

`pnpm db:migrate` requires explicit safe-target confirmation environment variables before it mutates the database. The backend does not auto-create or alter tables when it starts.

Default local URLs:

- Web: `http://localhost:3000`
- Website: `http://localhost:3001`
- API: `http://localhost:4000/api/v1`

## Production Deployment

The repository includes Docker Compose deployment for these public hosts:

- `nirmansite.com` -> `apps/website`
- `app.nirmansite.com` -> `apps/web`
- `api.nirmansite.com` -> `apps/api`

See [`docs/deployment/docker-production.md`](docs/deployment/docker-production.md) for DNS, server, environment, migration, launch, backup, and update steps.

## Mobile Device Run

Use Node 22 LTS for local Mobile and EAS work (the repository pins `22.13.0`
in `.nvmrc`). Starting every Web/API application at the same time is not
required for Metro and can exhaust memory on development machines.

For Expo Go on a phone, start Metro with a QR code that the phone can reach:

```bash
pnpm mobile:lan
```

Use this when the computer and phone are on the same Wi-Fi network. If the phone still stays on the Expo loading screen after scanning, use tunnel mode:

```bash
pnpm mobile:tunnel
```

Tunnel mode is slower, but it avoids local network, VPN, and firewall issues.

## Android Play Store Release

The Expo/EAS project is rooted at `apps/mobile`. Run release commands from
that directory so EAS uses the published Android package
`com.hornbook.nirmansite` and the correct Expo project.

```bash
pnpm mobile:release:check
cd apps/mobile
eas build --platform android --profile production
eas submit --platform android --profile production
```

Production builds generate an Android App Bundle (`.aab`). EAS remotely owns
and automatically increments `versionCode`; `app.json` owns the public store
version. Before the first build made from a machine/account that did not create
the Play Store release, sync EAS to the latest published Play `versionCode`
with `eas build:version:set`.

Default admin credentials are defined in `.env.example`; change them before using NirmanSite for real work.

Package scopes use `@nirman-app/*`. Product-facing copy intentionally remains NirmanSite unless a separate branding decision changes it.
