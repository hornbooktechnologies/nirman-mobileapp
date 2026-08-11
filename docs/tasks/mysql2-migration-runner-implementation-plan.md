# mysql2 Migration Runner Implementation Plan

## 1. Status

- Draft / Approved / Superseded: Implemented, DB execution pending
- Module or phase: API-local database tooling foundation
- Last updated: 2026-07-31

## 2. Purpose

Plan a safe SQL migration system for NirmanSite using `mysql2/promise`, owned by `apps/api`, so future approved module work can create table and column changes as reviewed SQL files and execute them through explicit commands.

Expected final developer workflow:

```bash
pnpm db:migrate:status
pnpm db:migrate
pnpm db:seed
```

This plan was created as documentation first, then implemented after approval. Implementation added standalone runner code and package scripts, but did not execute SQL, run seed, or connect to any database.

## 3. Current Problem

NirmanSite has moved away from Prisma for active runtime and tooling. The API now uses `mysql2/promise`, and `apps/api/scripts/seed.ts` seeds inherited foundation data through mysql2. The current Phase 1 SQL file exists as a reviewed draft at:

```text
apps/api/src/database/sql/migrations/001_phase1_identity_project_setup_draft.sql
```

There is no approved mysql2 migration runner yet. That means future database changes can be drafted, but the repository does not yet have a standard way to:

- discover ordered SQL migration files;
- show applied versus pending migrations;
- record migration checksums;
- reject modified migrations after application;
- require explicit safe-target confirmation before mutation;
- keep seed execution clearly after schema migration.

Starting the backend must not create or alter tables. Database mutation must happen only through explicit approved commands.

## 4. Desired Migration Workflow

After implementation, the normal workflow should be:

```bash
pnpm db:migrate:status
pnpm db:migrate
pnpm db:seed
```

The intended behavior is:

- `pnpm db:migrate:status` connects read-only except for optional `schema_migrations` bootstrap if approved for Slice 1; it reports whether the migration table exists, which migrations are applied, pending, missing, or checksum-mismatched.
- `pnpm db:migrate` requires explicit safe-target confirmation before applying pending migrations.
- `pnpm db:seed` remains separate and should run only after migrations are current on a confirmed safe local or throwaway database.

Root scripts should delegate to `@nirman-app/api`. API scripts should run from `apps/api`, where `mysql2`, `dotenv`, `ts-node`, and database source files are already available.

## 5. Files To Create

Recommended implementation files:

```text
apps/api/scripts/migration-status.ts
apps/api/scripts/migrate.ts
apps/api/src/database/migrations/migration-runner.ts
apps/api/src/database/migrations/migration-types.ts
apps/api/src/database/migrations/migration-lock.ts
apps/api/src/database/migrations/migration-safety.ts
apps/api/src/database/sql/migrations/
```

`migration-lock.ts` is optional but recommended if concurrent execution against a shared database is possible.

No code files are created by this plan.

## 6. Files To Update

Recommended future updates after approval:

```text
package.json
apps/api/package.json
docs/ai-development/AI_DEVELOPMENT_PIPELINE.md
docs/ai-development/MODULE_AUTOMATION_RULES.md
docs/ai-development/CONTRACT_TO_IMPLEMENTATION_WORKFLOW.md
docs/architecture/database.md
docs/tasks/local-run-setup.md
docs/tasks/PROGRESS_LEDGER.md
docs/tasks/current-task.md
```

The package updates should add:

```json
{
  "db:migrate": "pnpm --filter @nirman-app/api db:migrate",
  "db:migrate:status": "pnpm --filter @nirman-app/api db:migrate:status"
}
```

and API-local equivalents such as:

```json
{
  "db:migrate": "ts-node scripts/migrate.ts",
  "db:migrate:status": "ts-node scripts/migration-status.ts"
}
```

Do not edit package scripts until the implementation slice is approved.

## 7. Proposed Folder Structure

Use the API-local database boundary because active database access already lives in `apps/api`:

```text
apps/api/src/database/
  database.module.ts
  database.service.ts
  database.types.ts
  migrations/
    migration-runner.ts
    migration-types.ts
    migration-lock.ts
    migration-safety.ts
  sql/
    migrations/
      001_phase1_identity_project_setup_draft.sql

apps/api/scripts/
  migrate.ts
  migration-status.ts
  seed.ts
```

This follows the current architecture decision that `packages/database/prisma` is archived inherited history only.

## 8. schema_migrations Table Design

Create a runner-owned table named `schema_migrations`:

```sql
CREATE TABLE IF NOT EXISTS schema_migrations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  filename VARCHAR(255) NOT NULL,
  checksum_sha256 CHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'applied',
  started_at DATETIME(3) NOT NULL,
  applied_at DATETIME(3) NULL,
  duration_ms INT UNSIGNED NULL,
  error_message TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_schema_migrations_filename (filename),
  KEY idx_schema_migrations_status (status),
  KEY idx_schema_migrations_applied_at (applied_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

Recommended statuses:

- `applied`
- `failed`

The runner should normally insert only successful `applied` rows when a full transaction is available. If a migration cannot be fully transactional because of MySQL DDL behavior, the runner may record a `failed` row only after carefully confirming the database state and surfacing manual recovery instructions.

## 9. Migration Filename Convention

Use monotonically ordered, human-readable filenames:

```text
NNN_short_description.sql
```

Examples:

```text
001_phase1_identity_project_setup.sql
002_add_project_invitation_tables.sql
003_add_task_assignment_tables.sql
```

Rules:

- Prefix must be zero-padded numeric order.
- Filename must be lowercase snake_case.
- Extension must be `.sql`.
- No spaces.
- Do not rename an applied migration.
- Do not edit an applied migration; add a new migration instead.
- New SQL tables use plural `snake_case`.
- Existing inherited physical tables such as `user`, `role`, `permission`, `refreshtoken`, and `systemsetting` must not be renamed without separate approval.

Before Slice 3, decide whether the existing `001_phase1_identity_project_setup_draft.sql` remains a draft or is renamed to remove `_draft` when it becomes executable.

## 10. Migration Execution Algorithm

The future runner should:

1. Load environment variables from the root `.env`.
2. Validate `DATABASE_URL` exists and uses `mysql://` or `mariadb://`.
3. Parse target host, port, database name, and user for display.
4. Refuse execution unless safe-target confirmation passes.
5. Create or verify `schema_migrations`.
6. Optionally acquire a database-level migration lock.
7. Discover local migration files.
8. Sort migrations by numeric prefix and filename.
9. Read each SQL file as UTF-8.
10. Compute SHA-256 checksum from exact file contents.
11. Read applied migration records.
12. Fail before applying anything if an applied filename has a different checksum.
13. Fail before applying anything if an applied migration file is missing locally, unless a documented override is approved.
14. For each pending migration, execute the SQL.
15. Record filename, checksum, timestamps, duration, and status.
16. Stop immediately on the first failure.
17. Release any lock and close the pool.

The runner should not be imported by Nest app startup code.

## 11. Migration Status Command Behavior

`pnpm db:migrate:status` should report:

- target database host, port, and database name, without printing credentials;
- whether `schema_migrations` exists;
- total local migrations;
- total applied migrations;
- pending migrations in order;
- checksum mismatches;
- applied records missing from local files;
- failed migration records;
- final status: current, pending, drifted, or blocked.

The status command should not apply user migrations. If Slice 1 bootstraps `schema_migrations`, that behavior must be documented clearly because it is still a schema mutation.

## 12. Transaction Behavior

Each migration should run inside a transaction where MySQL/MariaDB allows it:

```text
BEGIN
execute migration SQL
insert schema_migrations row
COMMIT
```

Important limitation: many MySQL DDL statements cause implicit commits. The runner must not pretend rollback is guaranteed for DDL. The plan should document that migrations are forward-only operational changes and require backups for remote, shared, staging, or production databases.

Guidance:

- Prefer one logical schema change per migration file.
- Keep migrations additive where possible.
- Use explicit `CREATE TABLE IF NOT EXISTS` only for reviewed bootstrap-style migrations.
- Avoid destructive DDL without a separate written rollback/recovery note and explicit approval.

## 13. Error Handling

The runner should fail loud and early:

- Missing `DATABASE_URL`: exit non-zero with setup guidance.
- Invalid database protocol: exit non-zero.
- Unsafe target without confirmation: exit non-zero before connecting or before mutation, depending on implementation.
- Duplicate migration prefix: exit non-zero before DB mutation.
- Invalid filename: exit non-zero before DB mutation.
- Checksum mismatch: exit non-zero before DB mutation.
- Missing local file for an applied migration: exit non-zero before DB mutation.
- SQL failure: rollback when possible, record or report failure, release lock, close pool, exit non-zero.

Error output must include the migration filename and safe recovery guidance, but must not print database passwords, full URLs, JWT secrets, or seed passwords.

## 14. Safety Checks For Remote/Non-Local DBs

Because the configured database may be remote or non-local, `db:migrate` must require explicit safe-target confirmation.

Recommended checks:

- Parse `DATABASE_URL`.
- Treat `localhost`, `127.0.0.1`, and `::1` as local.
- Treat any other host as remote/non-local.
- Require `DB_MIGRATION_CONFIRM=I_UNDERSTAND_THIS_MUTATES_THE_DATABASE` for all mutation runs.
- Require `DB_MIGRATION_ALLOW_REMOTE=true` for non-local hosts.
- Print a redacted target summary before applying migrations.
- Refuse known production indicators unless explicitly approved, for example `NODE_ENV=production`, database names containing `prod` or `production`, or hostnames containing `prod`, unless a separate production migration process is approved.
- Require a backup/recovery note before staging/production execution.

Status may be allowed without mutation confirmation, but it still connects to the database and should print that it is not executing migrations.

## 15. Required Environment Variables

Existing:

```text
DATABASE_URL
DB_CONNECTION_LIMIT
```

Recommended new migration variables:

```text
DB_MIGRATION_CONFIRM
DB_MIGRATION_ALLOW_REMOTE
DB_MIGRATION_LOCK_TIMEOUT_SECONDS
DB_MIGRATION_SQL_DIR
```

Suggested defaults:

- `DB_MIGRATION_LOCK_TIMEOUT_SECONDS=30`
- `DB_MIGRATION_SQL_DIR=apps/api/src/database/sql/migrations`

Do not introduce real credentials into docs or chat.

## 16. SQL File Discovery And Ordering

The runner should:

- read only `.sql` files from the configured migrations directory;
- ignore non-SQL files;
- require filenames to match `^\d{3}_[a-z0-9_]+\.sql$`;
- parse the numeric prefix;
- reject duplicate numeric prefixes;
- sort by numeric prefix, then filename;
- compute checksums after normal file read, before execution.

Ordering must be deterministic across Windows and CI.

## 17. Applied Migration Recording

For every successfully applied migration, insert:

- `filename`
- `checksum_sha256`
- `status='applied'`
- `started_at`
- `applied_at`
- `duration_ms`

The filename is the stable migration identity. Checksum protects against accidental edits to already-applied files.

## 18. Failed Migration Handling

On failure:

- stop at the first failed migration;
- rollback if the connection transaction can still be rolled back;
- release lock and close the pool;
- report the failed filename and database error;
- do not continue to later migrations;
- require manual inspection before rerun.

If a failed row is recorded, the next run should refuse to continue until the failed migration is resolved. Resolution should be manual and documented, because MySQL DDL may have partially applied.

## 19. Seed Relationship To Migrations

Seed must remain separate from migrations:

- migrations create or alter schema;
- seed inserts or updates baseline data such as roles, permissions, settings, and the development admin user;
- `pnpm db:seed` should assume migrations are current;
- seed should optionally check `schema_migrations` and warn or fail if pending migrations exist;
- seed must keep idempotent behavior where possible;
- seed must require the same safe-target thinking before remote or shared database mutation.

The current `apps/api/scripts/seed.ts` uses inherited compatibility tables (`role`, `permission`, `systemsetting`, `user`). Future migration work should not rename those inherited physical tables without approval.

## 20. Future AI Chat Usage

Future AI chats that add approved database changes should:

1. Read the approved module contract and current migration plan.
2. Add a new SQL migration file under `apps/api/src/database/sql/migrations/`.
3. Use plural `snake_case` names for new tables and columns.
4. Preserve inherited physical table names unless an explicit rename task is approved.
5. Keep SQL reviewed before execution.
6. Run `pnpm db:migrate:status` first.
7. Ask for explicit safe-target confirmation before `pnpm db:migrate`.
8. Run `pnpm db:seed` only after migrations are current and the target is approved.
9. Record commands run, commands not run, and database safety assumptions in task docs.

## 21. Verification Plan

Documentation-only verification for this plan:

```bash
git diff -- docs/tasks/mysql2-migration-runner-implementation-plan.md docs/tasks/current-task.md
```

Future implementation verification:

```bash
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
pnpm db:migrate:status
pnpm db:migrate
pnpm db:migrate:status
pnpm db:seed
git diff --check
```

`pnpm db:migrate` and `pnpm db:seed` must be run only against an explicitly approved safe local or throwaway database during implementation verification.

## 22. Commands To Run After Implementation

After the runner is implemented and a safe target is confirmed:

```bash
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
pnpm db:migrate:status
pnpm db:migrate
pnpm db:migrate:status
pnpm db:seed
```

Optional broader checks when package scripts or shared docs change:

```bash
pnpm type-check
git diff --check
```

## 23. Rollback Limitations

This runner should be forward-only at first. Do not implement automatic down migrations in the initial version.

Limitations:

- MySQL DDL may auto-commit and cannot always be rolled back.
- Rollback for remote/staging/production databases requires backup restore or a manually reviewed corrective migration.
- Destructive changes require explicit approval, recovery notes, and preferably a prior backup.
- Applied migration files must be immutable; fixes should be new migrations.

## 24. Open Decisions

Decisions needed before coding:

- Should `schema_migrations` bootstrap happen during status, migrate, or both?
- Should `DB_MIGRATION_CONFIRM` be required for local mutation too, or only remote mutation?
- What exact confirmation string should be required?
- Should `DB_MIGRATION_ALLOW_REMOTE=true` ever permit staging/production execution, or should production require a separate process?
- Should the initial runner record failed rows, or only record successful rows and rely on process output for failure?
- Should migration locking use MySQL `GET_LOCK()` / `RELEASE_LOCK()`?
- Should SQL be split on statement delimiters manually, or should migration files be executed as multi-statements with a carefully configured connection?
- Should the existing Phase 1 draft be renamed before execution?
- Should seed fail when pending migrations exist, or only warn?

## 25. Implementation Slices

| Slice | Goal | Areas | Verification | Approval Needed |
| --- | --- | --- | --- | --- |
| 1 | Add migration runner scripts and `schema_migrations` bootstrap logic; add `db:migrate:status`; no user migration execution yet | `apps/api/scripts`, `apps/api/src/database/migrations`, package scripts | API type-check/build, status command against approved safe DB only if available | Approval before any DB connection or schema bootstrap |
| 2 | Add `db:migrate`; add safe-target confirmation; test against local/throwaway DB only | Runner, safety checks, package scripts | API type-check/build, migrate/status on safe throwaway DB | Approval of safe target |
| 3 | Integrate existing Phase 1 SQL draft into migration workflow; confirm idempotency and ordering | SQL migration file, status/migrate behavior | Status/migrate on safe throwaway DB, rerun status, seed after migration | Approval to execute Phase 1 SQL |
| 4 | Update docs and AI development pipeline so future module implementation includes migration files where DB changes are needed | AI pipeline docs, architecture docs, task docs | Documentation review, `git diff --check` | Approval of workflow wording |

## 26. Exit Criteria

The migration runner foundation is complete when:

- `pnpm db:migrate:status` reports current/pending/drifted state clearly.
- `pnpm db:migrate` applies ordered pending SQL migrations only after safe-target confirmation.
- Applied migrations are recorded with immutable filename and checksum.
- Drift and failure states block further mutation until resolved.
- `pnpm db:seed` remains separate and is documented as post-migration.
- Future AI workflow docs require migration files for approved DB changes.
- No backend startup path auto-creates or alters tables.
