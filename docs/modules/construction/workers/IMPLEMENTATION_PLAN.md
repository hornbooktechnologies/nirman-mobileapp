# Workers Implementation Plan

> Status: execution completed for independent Workers MVP slices on 2026-08-11; final acceptance is blocked on the deactivation lifecycle owner decision.
>
> Scope: Workers / Labour Management only.

## Execution Summary

| Slice | Result |
| --- | --- |
| 1. Shared contracts and permissions | Implemented; shared type-check/build passed |
| 2. Database migration | `010_backfill_worker_delete_owner_permission.sql` applied to the approved remote target on 2026-08-27; grants verified |
| 3. Permission seed | Owner/admin role templates include `workers:delete`; updated guarded seed completed on 2026-08-27 |
| 4-5. API repository, service, endpoints | Implemented and corrected; service/repository/filter tests pass |
| 6-7. Web data layer and screens | Implemented; focused lint, type-check, and production build pass |
| 8-9. Mobile data layer and screen | Approved current-project roster/quick-create flow implemented; type-check passes |
| 10. Offline boundary | Online-only writes and truthful stale/unavailable states implemented; persisted offline capability deferred to the generic foundation |
| 11. Audit integration | Explicit no-op boundary retained; persistence deferred to Audit Foundation |
| 12. Reports and summaries | Deferred optional scope; no new dashboard/report foundation invented |
| 13. Verification and handoff | Automated gates pass as recorded in `STATUS.md` and `REVIEW.md`; owner decision remains |

## Slice 1: Shared Contracts And Permissions

Objective:

- Add worker statuses, permission keys, worker-code fields, error codes, input/response types, filters, and schema exports to `packages/shared`.

Files/packages affected:

- `packages/shared/src/constants/permissions.ts`
- `packages/shared/src/constants/statuses.ts`
- `packages/shared/src/constants/errors.ts`
- `packages/shared/src/schemas`
- `packages/shared/src/types`
- `packages/shared/src/index.ts`

Dependencies:

- Approved Workers contract.

Implementation details:

- Add `workers` to permission resources.
- Add Project-delegatable actions: `read`, `create`, `update`, `deactivate`, `assign-project`, `update-rate`, `export`; add organization-wide `workers:delete` separately.
- Add worker and assignment status constants.
- Add worker-code response fields, search filters, and server-owned field exclusions from create/update inputs.
- Add framework-neutral TypeScript types and validation schemas.
- Add warning-only duplicate-candidate response types.

Tests:

- Shared type-check.
- Schema unit tests if a shared test harness exists; otherwise defer until test harness slice.

Verification command:

```bash
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/shared build
```

Completion condition:

- Shared package builds and exports worker contracts without app-specific imports.

## Slice 2: Database Migration Draft

Objective:

- Create reviewed SQL migration for `workers` and `worker_project_assignments`.

Files/packages affected:

- `apps/api/src/database/sql/migrations/002_workers.sql`

Dependencies:

- Slice 1 contract names approved.
- Current DB migration status is current.

Implementation details:

- Use plural snake_case table names.
- Use UUID varchar primary keys.
- Add `organization_id`, `project_id`, lifecycle, actor, and timestamp columns.
- Add generated, immutable, organization-scoped `worker_code` on `workers`.
- Add unique index on `(organization_id, worker_code)`.
- Add indexes for organization/status, project/status, worker/status, search fields.
- Add search indexes for worker code, name, and mobile number.
- Do not add a unique index on mobile number.
- No schema cascade is required; the approved organization-owner permanent delete uses an explicit dependency-ordered application transaction.
- Implement duplicate active assignment protection through service transaction unless safe DB generated-column uniqueness is approved.

Tests:

- SQL review.
- Migration filename validation by migration runner.

Verification command:

```bash
pnpm db:migrate:status
git diff --check
```

Completion condition:

- Migration is reviewed and status still shows no drift before execution.

## Slice 3: Permission Seed Update

Preparation status:

- RBAC preparation Slices B-C now define the worker permission group and organization role-template defaults in source.
- Platform Super Admin receives no `workers:*` permission through the prepared seed.
- The RBAC seed was later executed on 2026-08-10 after explicit approval. It synchronized Workers defaults for organization role templates and removed Workers permissions from Platform Super Admin. This did not add or change Workers domain records.

Objective:

- Seed worker permissions idempotently for approved default roles.

Files/packages affected:

- `apps/api/scripts/seed.ts`
- possibly `packages/shared/src/constants/permissions.ts`

Dependencies:

- Slice 1.
- Approved Workers permission matrix.

Implementation details:

- Use `WORKER_PERMISSIONS` from shared.
- Keep seed idempotent.
- Builder/Admin: grant full worker management in own organization according to existing role/tenant model.
- Organization Owner and Independent Contractor Owner: grant full worker management in own organization according to the organization role template.
- Supervisor: grant `workers:read`, `workers:create`, and `workers:update` for assigned-project workflows only.
- Contractor: grant `workers:read` by default for assigned projects; do not grant create/update/assign/update-rate/deactivate/delete/export automatically.
- Platform Super Admin: do not grant `workers:*` as normal operational permissions. Support access, if later approved, must use separate platform support permissions and audited support flow.
- Do not grant worker permissions to Sales by default.

Tests:

- Static type-check.
- Seed dry review; do not mutate remote DB without approval.

Verification command:

```bash
pnpm --filter @nirman-app/api type-check
```

Completion condition:

- Seed code compiles and permission grant policy is documented.

## Slice 4: Backend Repository And Domain Service

Objective:

- Implement worker persistence and business rules in API.

Files/packages affected:

- `apps/api/src/modules/workers/workers.module.ts`
- `apps/api/src/modules/workers/workers.repository.ts`
- `apps/api/src/modules/workers/workers.service.ts`
- `apps/api/src/modules/workers/dto`
- `apps/api/src/modules/workers/types`
- `apps/api/src/app.module.ts`

Dependencies:

- Slices 1 and 2.

Implementation details:

- Use `DatabaseService`.
- Use parameterized SQL.
- Use explicit row types.
- Use transactions for create worker plus assignment.
- Generate `worker_code` server-side using established repository ID/code-generation conventions where available.
- Enforce organization-scoped worker-code uniqueness and immutability.
- Reject or ignore client-supplied `worker_code`.
- Normalize mobile number before duplicate comparison where supported.
- Return warning-only duplicate candidates for normalized mobile and probable duplicate names.
- Reuse `ProjectAccessService`.
- Enforce active organization membership and project access.
- Enforce contractor/supervisor project restrictions through permissions plus project access; no implicit Contractor management rights.
- Do not add a Platform Super Admin bypass for Workers operations.
- Block inactive-worker assignment.
- Enforce daily-rate rules: normal authorized update before attendance exists, `workers:update-rate` plus effective date after attendance exists.
- Never silently change historical attendance or financial meaning.
- Document rate-history handoff to Wages in service comments or module docs, not as a Workers-owned final model.
- Preserve history on deactivate/end assignment.
- Permanently delete all current Worker dependencies only through organization-wide `workers:delete` and one rollback-safe transaction.

Tests:

- Service tests for business rules where test harness works.
- If Jest remains broken, record as blocker and still run type-check/build.

Verification command:

```bash
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
```

Completion condition:

- API compiles and service/repository follow established layering.

## Slice 5: API Endpoints

Objective:

- Expose Workers API routes.

Files/packages affected:

- `apps/api/src/modules/workers/workers.controller.ts`
- `apps/api/src/modules/workers/dto`

Dependencies:

- Slice 4.

Implementation details:

- Implement routes from contract.
- Use `PermissionsGuard` where needed.
- Return existing API success envelope.
- Use stable errors from shared where practical.
- Add rate-change endpoint with `workers:update-rate` enforcement when attendance exists.
- Include `workerCode` in worker responses and search/filter support.

Tests:

- API integration tests once Jest is fixed.
- Permission and tenant-isolation tests.

Verification command:

```bash
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
pnpm --filter @nirman-app/api test
```

Completion condition:

- Endpoints compile and are covered or test blocker is documented.

## Slice 6: Web Data Layer

Objective:

- Add web service and hooks for workers.

Files/packages affected:

- `apps/web/src/features/workers/services`
- `apps/web/src/features/workers/hooks`
- `apps/web/src/features/workers/types`
- `apps/web/src/features/workers/index.ts`

Dependencies:

- Slice 5.

Implementation details:

- Use existing Axios `api` wrapper.
- Reuse shared types where possible.
- Handle API envelope unwrap through existing client.

Tests:

- Web type-check.

Verification command:

```bash
pnpm --filter @nirman-app/web type-check
```

Completion condition:

- Web data access compiles.

## Slice 7: Web Screens And Navigation

Objective:

- Add web worker management routes and project worker panel.

Files/packages affected:

- `apps/web/src/app/(app)/workers`
- `apps/web/src/features/workers/components`
- `apps/web/src/config/navigation.ts`
- `apps/web/src/features/projects/components/project-detail-page.tsx`

Dependencies:

- Slice 6.

Implementation details:

- Add permission-gated Workers navigation.
- Add list, create, detail/edit, deactivate, permanent-delete confirmation, and assign/end assignment UI.
- Display read-only worker code after creation.
- Support worker-code search.
- Show warning-only duplicate mobile/name panel with explicit acknowledgement before continuing.
- Add daily-rate change UI with effective date and elevated-permission handling.
- Use established web UI components.
- Do not copy mobile UI patterns into desktop tables.

Tests:

- Web type-check.
- Web lint if existing lint blockers are fixed.

Verification command:

```bash
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/web build
```

Completion condition:

- Routes build and permission states are implemented.

## Slice 8: Mobile Data Layer

Objective:

- Add mobile worker API helpers and local roster state.

Files/packages affected:

- `apps/mobile/src/features/workers`
- `apps/mobile/src/lib/api`

Dependencies:

- Slice 5.
- Mobile session/project context exists.

Implementation details:

- Use current mobile `apiRequest`.
- Require active project for project roster and create-assignment flow.
- Treat writes as online-only for Workers MVP.
- Expose cached/read-only state only where existing infrastructure supports it.

Tests:

- Mobile type-check.

Verification command:

```bash
pnpm --filter @nirman-app/mobile type-check
```

Completion condition:

- Mobile worker data layer compiles and uses active project context.

## Slice 9: Mobile Worker Screens

Objective:

- Implement field-friendly Workers roster and add-worker flow.

Files/packages affected:

- `apps/mobile/app/(app)`
- `apps/mobile/src/features/workers/components`
- `apps/mobile/src/components/ui` only if a reusable primitive is missing

Dependencies:

- Slice 8.

Implementation details:

- Add project roster screen/card list.
- Add quick create worker and assign to current project.
- Show generated worker code on worker cards/details where useful.
- Use free-text trade input with common suggestions such as Mason, Helper, Carpenter, Plumber, Electrician, and Painter.
- Show duplicate warning acknowledgement before create continues.
- Disable create, edit, assign, deactivate, and rate-change actions while offline with a clear user-facing message.
- Show loading, empty, error, forbidden, and offline read-only states.
- Use large controls and mobile tokens.

Tests:

- Mobile type-check.
- Manual Expo smoke on a real device/emulator.

Verification command:

```bash
pnpm --filter @nirman-app/mobile type-check
pnpm mobile:lan
```

Completion condition:

- Mobile user can visually list and add workers for active project.

## Slice 10: Workers Offline Read-Only MVP Behavior

Objective:

- Implement the approved online-only write boundary and offline read-only behavior for Workers MVP.

Files/packages affected:

- `apps/mobile/src/lib/storage`
- `apps/mobile/src/features/workers`

Dependencies:

- Slices 8 and 9.

Implementation details:

- Do not select or introduce a sync library solely for Workers.
- Cached/synced workers may be viewed offline only where existing repository infrastructure supports this.
- Create, edit, assign, deactivate, and rate-change actions require connectivity.
- Offline write actions are disabled with a clear user-facing message.
- Attendance and broader offline-sync architecture own the final mobile write strategy.

Tests:

- Offline roster view renders when cached data is available.
- Offline write actions are disabled.
- User-facing offline message is shown for create/edit/assign/deactivate/rate-change attempts.

Verification command:

```bash
pnpm --filter @nirman-app/mobile type-check
```

Completion condition:

- Workers MVP has verified offline read-only behavior and no offline write queue.

## Slice 11: Audit Integration

Objective:

- Persist or prepare audit events for worker lifecycle, assignment, and rate changes.

Files/packages affected:

- `apps/api/src/modules/audit` if created
- `apps/api/src/modules/workers`
- SQL migration if audit table is introduced

Dependencies:

- Audit foundation decision.

Implementation details:

- Prefer minimal reusable audit writer before module-specific ad hoc logging.
- Redact sensitive values.
- Audit worker create/update/deactivate.
- Audit assignment create/update/end.
- Audit every rate change with old rate, new rate, effective date, reason when provided, actor, organization, project, and assignment.

Tests:

- Audit event written for create/update/deactivate/assignment/rate changes.

Verification command:

```bash
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
```

Completion condition:

- Audit behavior matches contract or is explicitly deferred before acceptance.

## Slice 12: Reports And Summaries

Objective:

- Provide worker counts and project roster summaries for dashboard/report consumers.

Files/packages affected:

- `apps/api/src/modules/workers`
- `apps/web/src/features/workers`
- possibly `apps/mobile/src/features/workers`

Dependencies:

- Slices 4 through 9.

Implementation details:

- Add counts by project, active/inactive status, and missing-rate readiness.
- Include worker-code search/report references.
- Keep exports permission-gated.

Tests:

- Scope and permission tests.

Verification command:

```bash
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/mobile type-check
```

Completion condition:

- Summaries are project/organization scoped and ready for Attendance/Wages.

## Slice 13: Full Verification And Documentation Update

Objective:

- Verify full repository and record handoff.

Files/packages affected:

- `docs/tasks/current-task.md`
- `docs/tasks/PROGRESS_LEDGER.md`
- `docs/modules/MODULE_INDEX.md`
- `docs/modules/construction/workers`

Dependencies:

- All approved implementation slices.

Implementation details:

- Update module status and evidence.
- Record commands run and known gaps.
- Do not claim tests that did not run.

Verification command:

```bash
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/web build
pnpm --filter @nirman-app/mobile type-check
git diff --check
```

Completion condition:

- Workers module is verified, documented, and ready for Attendance contract/implementation.

## Verification Gate Results

- The API Jest major was aligned with `ts-jest`; unit and E2E suites now execute and pass.
- Focused lint for changed API files passes with one pre-existing E2E warning; focused changed-file web lint passes.
- Shared/API/web/mobile static gates and the isolated web production build pass.
- No database mutation or live authenticated role/scope smoke was authorized or run.
- Workers remains `PARTIAL — REQUIRES OWNER DECISION` until deactivation behavior with active assignments is approved.

These should be fixed before claiming release-ready quality, but they do not prevent drafting or reviewing the Workers contract.
