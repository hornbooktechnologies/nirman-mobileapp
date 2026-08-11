# System Architecture

The template uses a pnpm and Turborepo monorepo.

## Apps

- `apps/web`: Next.js App Router frontend.
- `apps/api`: NestJS API.
- `apps/mobile`: Expo / React Native mobile app.

## Packages

- `packages/shared`: Shared constants, types, and validation contracts.
- `packages/database`: Archived inherited Prisma workspace. Active database runtime and seed tooling live in `apps/api`.

## Runtime Flow

The web frontend calls the API through `NEXT_PUBLIC_API_BASE_PATH`. The mobile app calls the API through its mobile API client. The API uses JWT access tokens and refresh-token flows.

NirmanSite's database architecture is MySQL/MariaDB access through `mysql2/promise` inside `apps/api` repositories. Web, mobile, and shared packages must not import database drivers or execute SQL.

## Extension Pattern

New product modules should add:

- SQL table planning and migration scripts only after approval.
- API module in `apps/api/src/modules`.
- Repository methods using parameterized `mysql2` queries.
- Frontend feature in `apps/web/src/features`.
- Mobile feature in `apps/mobile/src/features` only when the workflow is approved for field users.
- Navigation entries in `apps/web/src/config/navigation.ts`.
- Permissions in `packages/shared/src/constants/permissions.ts`.

Do not use Prisma for new NirmanSite work. Follow `docs/decisions/004-database-access-mysql2.md`.
