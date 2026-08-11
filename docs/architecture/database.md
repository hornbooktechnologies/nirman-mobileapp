# Database Architecture

NirmanSite's database architecture is MySQL/MariaDB accessed through `mysql2/promise`.

Prisma should not be used for new NirmanSite work or active tooling. `packages/database/prisma` is archived inherited history only.

All runtime database access belongs inside `apps/api`, preferably through repository classes that use parameterized SQL and transactions where needed. Web and mobile must call API endpoints and must never connect to the database directly.

## Current Compatibility Tables

The inherited foundation may still contain singular or camel-style physical tables used by compatibility repositories:

- `user`
- `role`
- `permission`
- `refreshtoken`
- `systemsetting`

These names are not the pattern for new NirmanSite tables.

## Approved New Table Naming

All new NirmanSite SQL tables must use plural `snake_case` physical names, for example:

- `users`
- `roles`
- `permissions`
- `role_permissions`
- `refresh_tokens`
- `system_settings`
- `audit_logs`
- `file_assets`
- `organizations`
- `organization_members`
- `projects`
- `project_members`

## SQL Planning Rules

- Use SQL table proposals instead of Prisma model proposals.
- Use plural `snake_case` table names and `snake_case` column names for all new SQL work.
- Use UUID string primary keys unless a separate decision changes this.
- Keep human-facing numbers separate from primary keys.
- Use `created_at`, `updated_at`, `created_by`, and `updated_by` where useful.
- Use SQL migration files or documented SQL scripts after approval.
- Store active mysql2 migration files under `apps/api/src/database/sql/migrations`.
- Use `pnpm db:migrate:status` to inspect migration state after the target is approved for connection.
- Use `pnpm db:migrate` only for explicit migration execution against an approved safe target.
- Do not run production migrations without human approval.
- Model future access through `organization_members` and `project_members`; inherited global `users.roleId` compatibility is not the target access model.

See `docs/decisions/004-database-access-mysql2.md` for the Prisma removal and mysql2 implementation plan.

## Current Implementation

- `apps/api/src/database` owns the connection pool, typed query helpers, transaction helper, and Nest database module.
- `apps/api/src/database/migrations` owns the standalone mysql2 migration runner and status logic.
- `apps/api/src/database/sql/migrations` owns ordered SQL migration files.
- `apps/api/scripts/seed.ts` owns the mysql2 seed flow.
- `packages/database/prisma` is archived inherited history only.
