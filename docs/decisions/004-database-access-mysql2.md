# 004. Database Access With mysql2

## Status

Approved and implemented for the inherited foundation runtime.

## Date

2026-07-28

## Context

NirmanSite moved away from Prisma before product database work begins. The product uses plain MySQL/MariaDB access through `mysql2`, with database logic kept inside the NestJS API boundary.

This decision exists so future AI chats can follow the current architecture without continuing the earlier Prisma-based Phase 1 plan.

## Decision

Remove Prisma from NirmanSite's active runtime/tooling architecture and use `mysql2/promise` for backend persistence.

The target architecture is:

```txt
apps/web     -> Next.js admin and back-office portal
apps/mobile  -> Expo / React Native field app
apps/api     -> NestJS backend, repositories, SQL, transactions
database     -> MySQL/MariaDB accessed through mysql2
```

Web and mobile must never access the database directly. They should call API endpoints only.

## Why mysql2

- No Prisma client generation step.
- No Prisma engine binaries or generated runtime packages.
- Fewer deployment surprises on Vercel or serverless-style hosting.
- Direct SQL control for joins, reports, dashboards, ledgers, and complex builder workflows.
- Smaller backend dependency surface.
- Same app architecture remains: only the API data-access layer changes.

## New Backend Data Access Shape

All runtime database access should live in `apps/api`.

Recommended structure:

```txt
apps/api/src/database/
  database.module.ts
  database.service.ts
  database.types.ts
  transaction.ts

apps/api/src/modules/<module>/
  <module>.controller.ts
  <module>.service.ts
  <module>.repository.ts
  dto/
  types/
```

Repository rules:

- Use `mysql2/promise`.
- Use parameterized queries for every user-provided value.
- Keep dynamic identifiers behind repository-owned whitelists.
- Keep controllers thin.
- Keep business rules in services.
- Keep SQL persistence in repositories.
- Return API/service-compatible DTO shapes from repository methods.
- Use explicit row interfaces for query results.
- Use transactions for multi-table writes, permission updates, booking/payment flows, and seed setup.

## Migration And Schema Strategy

Prisma migrations should not be used for new NirmanSite work.

Use plain SQL migration files or documented SQL scripts. Recommended location:

```txt
packages/database/sql/
  migrations/
  seeds/
```

If the team decides to remove `packages/database` completely, move these to:

```txt
apps/api/src/database/sql/
```

Do not decide this during implementation without human approval.

Migration rules:

- SQL files should be reviewed before execution.
- Production migration execution requires explicit human approval.
- Seeds must be safe to rerun where possible.
- Prefer stable names and natural unique constraints for permissions, roles, and settings.
- Keep financial/legal data immutable unless a separate deletion policy is approved.

## Package Responsibilities

`apps/api` owns:

- MySQL connection pool.
- Database health checks.
- Repositories.
- Transactions.
- SQL execution.
- Seed command wiring if kept inside API.
- Authentication, RBAC, audit logging, and business workflows.

`apps/web` owns:

- Admin and back-office screens.
- API calls through feature service files.
- Permission-aware navigation.
- No database imports.

`apps/mobile` owns:

- Field and quick-action mobile screens.
- API calls through mobile API client.
- Secure token/session storage.
- No database imports.

`packages/shared` owns:

- Permission constants.
- Role/status constants.
- Shared labels and enums.
- Zod schemas or API contract types that are platform-neutral.
- Theme tokens.
- No database pool, SQL, `mysql2`, or server-only code.

`packages/database` is undecided:

- Option A: keep it as SQL-only migration/seed documentation package.
- Option B: remove it after Prisma removal and keep database runtime plus SQL files inside `apps/api`.

Human approval is required before choosing A or B.

## Prisma Removal Plan

### Phase 0: Documentation Alignment

- Mark Prisma-specific planning as superseded.
- Update AI context to say mysql2 is the forward path.
- Replace "Prisma model proposal" language with "SQL table proposal".
- Preserve old Prisma docs only as historical context where useful.

### Phase 1: Audit Current Prisma Usage

Implementation result:

- Active API runtime references were found in `app.module.ts`, auth/JWT, users, roles, and settings.
- Upload storage had no active Prisma-backed file asset repository.
- Audit logs had inherited schema history but no active runtime module.
- `packages/database/prisma/schema.prisma` and the inherited Prisma seed are retained as archived history.

Before code edits, scan for:

- `@prisma/client`
- `PrismaService`
- `prisma.`
- `schema.prisma`
- `prisma migrate`
- `prisma generate`
- Prisma package scripts.
- Prisma-generated output imports.

Create a checklist of every affected file before removing anything.

### Phase 2: Introduce mysql2 Foundation

Implementation result:

- `apps/api/src/database` owns the Nest database module, service, typed query helpers, and transaction helper.
- `DATABASE_URL` is validated for `mysql://` or `mariadb://`.
- The health check now verifies the mysql2 pool with `ping()`.

After approval:

- Add `mysql2`.
- Add NestJS database module.
- Add pool creation and shutdown handling.
- Add a typed query/transaction helper.
- Add a database health check.
- Add safe environment validation for MySQL connection settings.

No product modules should be implemented in this phase.

### Phase 3: Replace Foundation Repositories

Migrate one module at a time:

1. Auth/session repository.
2. Users repository.
3. Roles/permissions repository.
4. Settings repository.
5. Upload/file asset repository.
6. Audit log repository.

Each module must preserve existing API response shapes.

Implementation result:

- Auth/session, JWT validation, users, roles/permissions, and settings use API-local repository SQL.
- Parameterized SQL is used for values.
- Permission replacement and settings upserts use transactions.
- Upload/file asset and audit log repositories were not migrated because they are not active runtime modules yet.

### Phase 4: Replace Seed Data

Create SQL or repository-backed seeds for:

- Super admin user.
- Base roles.
- Base permissions.
- Role-permission links.
- System settings.

Seeds should use idempotent inserts where possible.

Implementation result:

- `pnpm db:seed` now routes to `apps/api/scripts/seed.ts`.
- The seed uses `mysql2`, bcrypt, transactions, idempotent role/permission/settings setup, and super-admin upsert.

### Phase 5: Remove Prisma Tooling

Only after all runtime imports are gone:

- Remove Prisma runtime dependencies.
- Remove Prisma generation scripts.
- Remove Prisma references from docs and setup files.
- Decide whether to delete, archive, or replace `packages/database/prisma`.

Do not delete old Prisma schema/migrations without explicit human approval.

Implementation result:

- Active Prisma package scripts were removed.
- API Prisma dependencies and imports were removed.
- `packages/database` is archived and no longer exports generated Prisma as active runtime.
- `packages/database/prisma` is retained for history only.

## Phase 1 SQL Table Proposal

The earlier domain model remains useful, but table planning should now be SQL-first.

Initial foundation tables:

- `users`
- `roles`
- `permissions`
- `role_permissions`
- `refresh_tokens`
- `system_settings`
- `audit_logs`
- `file_assets`

Initial NirmanSite product tables to plan, not implement yet:

- `organizations`
- `organization_members`
- `projects`
- `project_phases`
- `towers`
- `floors`
- `units`
- `leads`
- `customers`
- `bookings`
- `booking_buyers`
- `payment_schedules`
- `payment_demands`
- `payment_receipts`
- `document_types`
- `document_records`
- `approval_requests`
- `tasks`
- `issues`
- `checklist_templates`
- `checklist_runs`
- `site_progress_updates`
- `contractors`
- `work_packages`
- `notifications`

Naming assumptions:

- Use snake_case table and column names in SQL.
- Use UUID string primary keys unless human approval changes this.
- Use `created_at`, `updated_at`, `created_by`, and `updated_by` where useful.
- Keep business numbers separate from primary keys.
- Model organization tenancy before adding product workflows.

## Verification Plan

For implemented foundation verification:

- `pnpm --filter @nirman-app/api type-check`
- `pnpm --filter @nirman-app/api build`
- Focused import scan for Prisma references.
- Focused import scan to ensure web/mobile do not import `mysql2`.
- API health check.
- Auth login, refresh, logout, and `/auth/me` flow checks.
- Repository-level checks against a local or throwaway database.

Do not run mutating seed or migration commands against production.

## Open Questions Requiring Human Approval

- Should the production database be MySQL or MariaDB?
- Should connection config use one `DATABASE_URL` or separate `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` variables?
- Should SQL migration files live in `packages/database/sql` or inside `apps/api/src/database/sql`?
- Should `packages/database` remain as a SQL-only package or be removed completely?
- Should IDs be UUID strings, ULIDs, or numeric auto-increment IDs?
- Should migrations be run manually, through a custom Node script, or through a lightweight migration tool?
- Which module should be migrated first after the mysql2 foundation: Auth, Users/Roles, or Settings?
