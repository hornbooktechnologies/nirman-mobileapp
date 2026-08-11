# NirmanSite

NirmanSite is an enterprise Builder SaaS platform for real estate builders.

The repository currently contains the inherited full-stack monorepo foundation for building the product with Next.js, NestJS, Expo, pnpm, and Turborepo.

NirmanSite uses MySQL/MariaDB through `mysql2` inside the NestJS API. Prisma remains inherited history only and should not be used for new NirmanSite work. See `docs/decisions/004-database-access-mysql2.md`.

## What Is Included

- `apps/web`: Next.js App Router admin and back-office portal foundation with protected layout, login, dashboard, users, roles, settings, and profile screens.
- `apps/api`: NestJS API with authentication, RBAC, users, roles, settings, upload storage utilities, health checks, and API-local mysql2 database access.
- `packages/database`: archived inherited Prisma database history; not active runtime/tooling.
- `packages/shared`: Shared constants, permission definitions, schemas, and types.
- `apps/mobile`: Expo / React Native mobile foundation with placeholder auth routing and protected dashboard shell.
- `docs`: NirmanSite AI context, architecture notes, decisions, task tracking, and module templates.

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

Do not run Prisma database commands for new NirmanSite work. Use the API-local mysql2 migration and seed commands only after confirming a safe local or throwaway database target:

```bash
pnpm db:migrate:status
pnpm db:migrate
pnpm db:seed
```

`pnpm db:migrate` requires explicit safe-target confirmation environment variables before it mutates the database. The backend does not auto-create or alter tables when it starts.

Default local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000/api/v1`

## Mobile Device Run

For Expo Go on a phone, start Metro with a QR code that the phone can reach:

```bash
pnpm mobile:lan
```

Use this when the computer and phone are on the same Wi-Fi network. If the phone still stays on the Expo loading screen after scanning, use tunnel mode:

```bash
pnpm mobile:tunnel
```

Tunnel mode is slower, but it avoids local network, VPN, and firewall issues.

Default admin credentials are defined in `.env.example`; change them before using NirmanSite for real work.

Package scopes use `@nirman-app/*`. Product-facing copy intentionally remains NirmanSite unless a separate branding decision changes it.
