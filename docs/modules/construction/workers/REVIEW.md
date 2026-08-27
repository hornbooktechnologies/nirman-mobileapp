# Workers Module Review

## 1. Status

- Result: `PARTIAL — REQUIRES OWNER DECISION`
- Module: Workers / Labour Management
- Last updated: 2026-08-11
- Database mutation: none

## 2. Scope Reviewed

The review reconciled `MVP_REQUIREMENTS.md`, the Workers contract/decisions/plan, repository architecture and RBAC/project-access contracts, the active Workers migration, shared contracts, API repository/service/controller/error handling, web routes/data/UI, mobile roster/quick-create flow, tests, and current handoff documents.

The starting checkout already contained a substantial Workers vertical slice, while its contract and plan still said implementation had not started. The review treated executable source as implementation evidence and the approved contract as desired behavior, then recorded and corrected independent gaps without inventing downstream foundations.

## 3. Implemented Work

- Hardened worker and route validation, stable errors, worker-code collision handling, active/current roster filtering, assignment concurrency, assignment update/end behavior, and the pre-Attendance rate rule.
- Repaired the API Jest/ts-jest mismatch and added Workers service, repository, global-error-filter, controller-health, and DB-isolated E2E coverage.
- Completed web pagination, permission-aware worker actions, existing-worker assignment, assignment editing, current-rate updates, assignment ending, and deactivation confirmation.
- Corrected mobile connectivity behavior: reads may retain an already-loaded in-memory roster after a network failure, while all writes remain online-only and are never claimed as queued.
- Updated the API client error contract compatibly: canonical nested `error` is available while legacy top-level fields remain during transition.
- Reconciled module status, decisions, plan, index, progress ledger, current task, and architecture summaries.

## 4. Contract Coverage

| Contract area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Shared contracts | Implemented | `packages/shared/src`, shared build/type-check | No new runtime-schema framework introduced |
| SQL/database | Existing Worker schema plus applied RBAC backfill | `002_workers.sql`, `010_backfill_worker_delete_owner_permission.sql`, migration status | Remote target reports migration `010` applied on 2026-08-27; grants verified read-only |
| API | Implemented | `apps/api/src/modules/workers`, filter/controller changes | Live DB concurrency and role matrix remain unrun |
| Web | Implemented | `apps/web/src/features/workers` | Authenticated browser workflow remains unrun |
| Mobile | Implemented for approved quick flow | `apps/mobile/src/features/workers` | No persisted offline cache or write queue exists |
| Tests | Implemented and passing | Workers service/repository/filter tests plus health E2E | E2E intentionally mocks DB to avoid remote mutation |
| Audit | Deferred foundation | Explicit no-op boundary | No persistence claim |
| Deactivation lifecycle | Decision required | Contract and `STATUS.md` | Active-assignment policy is not approved |

## 5. Authorization And Scope

- API operations require the appropriate `workers:*` permission and organization membership/project access.
- Platform Super Admin has no normal Workers permission bypass.
- Organization-wide users and assigned-project users remain separated by `ProjectAccessService` and worker visibility rules.
- Web/mobile action visibility follows resolved session permissions, but the server remains authoritative.

## 6. Verification

Passed checks:

```text
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
pnpm --filter @nirman-app/api test --runInBand
pnpm --filter @nirman-app/api test:e2e --runInBand
pnpm --filter @nirman-app/web type-check
NEXT_DIST_DIR=.next-workers-verification pnpm --filter @nirman-app/web build
pnpm --filter @nirman-app/mobile type-check
```

The API unit result was 5 suites and 32 tests passed. The health E2E was 1 suite and 1 test passed with `DatabaseService` overridden by a mock. Focused lint for changed API files passed with one unsafe-argument warning in the E2E bootstrap; Workers/API-client focused web lint passed.

Package-wide lint was also run honestly: API reports 883 inherited Prettier errors plus the E2E warning; web reports six unrelated `set-state-in-effect` errors plus one login-image warning. No Workers-focused lint error remains.

## 7. Runtime Smoke

Migration `010_backfill_worker_delete_owner_permission.sql` was applied to the configured remote target on 2026-08-27. Read-only verification confirmed one `workers:delete` grant for each approved owner/admin role. No actual worker deletion, authenticated browser workflow, or physical-device flow was run. The web production build generated the Workers routes successfully, but a build is not a substitute for authenticated UI or device confirmation.

## 8. Open Risks

- Deactivating a worker currently preserves active assignment rows while the default active roster filters the inactive worker. The owner must approve or replace this rule.
- The `MAX + 1` worker-code allocator is protected by the unique key and bounded retry, but was not tested under live database concurrency.
- Audit persistence, Attendance-aware rate rules, Wages rate history, and persisted offline behavior do not exist yet and must remain owned by their generic/downstream modules.

## 9. Required Fix Before Verification

Approve and implement exactly one active-assignment deactivation policy: block, atomically end after confirmation, or allow assignments to remain active while excluding the inactive worker from active rosters.

## 10. Recommendation

Pause Workers acceptance at `PARTIAL — REQUIRES OWNER DECISION`. After the lifecycle decision, rerun the automated gates and use approved disposable data for the live organization/project permission matrix and representative web/mobile flows.

## 11. 2026-08-25 Permanent Delete Addendum

- Added non-Project-delegatable `workers:delete`, granted in seed source to Organization Owner/Builder Admin/Independent Contractor Owner templates.
- Added and applied idempotent migration `010_backfill_worker_delete_owner_permission.sql` so the configured remote instance receives the same owner/admin grant.
- Added `DELETE /organizations/:organizationId/workers/:workerId` with organization-wide access enforcement.
- Added one transaction that locks the organization-scoped Worker and deletes Wage payments, Wage items, newly empty Wage batches, Attendance exceptions, legacy Attendance records, primary-Project periods, Project assignments, then the Worker.
- Added a Web **Delete Permanently** action and confirmation dialog that warns the user that all related records will be erased and cannot be restored.
- Added repository/service tests for transaction coverage, organization scope, missing Worker behavior, and rollback-oriented ordering.
- Verification passed: shared type-check/build, API type-check/build, web type-check, focused Workers web lint, isolated web production build, and the full API unit run with 18 suites/98 tests.
- The implementation addendum initially executed no mutation. On 2026-08-27, migration `010` and the updated guarded seed were separately approved and completed; no worker deletion or authenticated browser deletion was run.
