# Kharchi API Technical Plan

## 1. Status

- Status: source implementation and approved migration/grant rollout complete; authenticated runtime verification pending.
- Module: Kharchi / Worker Advances.
- Last updated: 2026-09-01.

## 2. Purpose

Implement the approved direct-paid Kharchi contract as a project-scoped NestJS/mysql2 API, including financial idempotency, immutable adjustments, durable audit events, and automatic Wage deduction allocation.

## 3. Inputs

- `MVP_REQUIREMENTS.md` sections 13 and 14.
- `docs/modules/construction/kharchi/CONTRACTS.md`.
- `docs/modules/construction/wages/CONTRACTS.md`.
- `docs/modules/construction/workers/CONTRACT.md`.
- `docs/modules/MODULE_CONTRACT_STANDARD.md`.
- `docs/ai-development/AI_DEVELOPMENT_PIPELINE.md`.
- Existing Wages, Workers, Sales, Project Access, database, migration, and test source.

## 4. Scope

In scope:

- shared Kharchi permissions, constants, types, and errors;
- approved default role grants in guarded seed source;
- reusable internal audit repository/service/module;
- additive audit and Kharchi SQL migration drafts;
- Kharchi controller/service/repository/DTOs/module;
- list, summary, detail, create, adjustment, and export operations;
- mandatory idempotency on create and adjustment;
- automatic oldest-first Kharchi allocation inside Wage confirmation;
- Worker permanent-deletion dependency cleanup;
- focused service tests and existing Wages/Workers regression tests;
- documentation evidence updates.

Out of scope:

- Web and Mobile UI;
- actual offline queue/sync;
- approval/rejection/mark-paid/cancel/delete flows;
- notifications;
- migration status, migration execution, seed execution, or any database mutation;
- unrelated Auth/global-exception changes already present in the worktree.

## 5. Approved Decisions

- Create means money was already given and the record is immediately paid.
- Payment method is required; reference is optional.
- Corrections are immutable signed adjustments.
- Original advances cannot be edited, cancelled, or deleted through Kharchi APIs.
- Create and adjustment writes require idempotency keys.
- Wage confirmation automatically deducts oldest outstanding advances first without making net wages negative.
- New advances require an active Worker and an assignment covering the request date.
- Reusable audit persistence is required; audit failure rolls back the financial write.
- The approved role matrix in the Kharchi contract is authoritative.

## 6. Implementation Slices

| Slice | Goal | Areas | Verification | Approval Needed |
| --- | --- | --- | --- | --- |
| 0 | Contract and technical plan | docs | diff check | completed |
| 1 | Shared contracts and role defaults | `packages/shared`, guarded seed source | shared type-check/build, API type-check | completed; no execution |
| 2 | Audit and Kharchi SQL drafts | ordered SQL only | static review, diff check | completed; approval before any DB command |
| 3 | Kharchi API | DTOs, repository, service, controller, module | focused tests, API type-check/build | completed |
| 4 | Wages and Worker integration | Wages confirmation, Worker deletion | focused regression tests, full API tests | completed |
| 5 | Review and handoff | docs | final diff check | completed for source; runtime pending |

## 7. File Plan

Create:

- `packages/shared/src/constants/kharchi.ts`
- `packages/shared/src/types/kharchi.ts`
- `apps/api/src/database/sql/migrations/012_audit_foundation.sql`
- `apps/api/src/database/sql/migrations/013_kharchi.sql`
- `apps/api/src/modules/audit/*`
- `apps/api/src/modules/kharchi/*`

Update only for required integration:

- shared constant/type indexes, permissions, and errors;
- guarded seed role templates;
- API root module;
- Wages module/repository/service/tests;
- Workers deletion repository/types/tests;
- Kharchi and progress documentation.

## 8. Verification Plan

```text
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api test -- --runInBand
pnpm --filter @nirman-app/api build
git diff --check
```

No database command is part of this implementation pass.

## 9. Risks

- financial duplication without normalized idempotency comparison;
- concurrent adjustment or deduction overspend without row locking;
- cyclic module dependencies between Wages and Kharchi;
- Worker deletion foreign-key failure if Kharchi dependencies are not removed first;
- existing role rows not receiving source-only seed changes until a separately approved migration/seed action;
- mocked service tests not proving real MySQL locking or authenticated runtime behavior.

## 10. Rollback Notes

- Source changes remain additive and can be reverted by module/file boundary.
- SQL drafts are forward-only proposals and will not be executed in this pass.
- After a future migration is applied, financial rows must not be destructively rolled back without a separately reviewed data-retention plan.

## 11. Open Decisions

None for the API-first source implementation.

## 12. Verification Evidence

- Shared type-check and build passed.
- API type-check and build passed.
- Full API Jest run passed: 21 suites and 114 tests.
- Focused Kharchi/Audit lint passed with no errors; test mocks retain five unsafe-argument warnings.
- `git diff --check` passed.
- No migration-status, migration, seed, database, authenticated HTTP, browser, or device command was run.

Subsequent separately authorized rollout evidence:

- `012_audit_foundation.sql` and `013_kharchi.sql` were applied to the confirmed remote target;
- four expected Kharchi/Audit tables and both migration records were verified;
- 22 approved `kharchi:*` role grants were synchronized and verified;
- API/database health returned `200`/`ok` and the unauthenticated Kharchi route returned
  `401 AUTH_SESSION_REQUIRED` after rebuilding the stale API process;
- authenticated role/workflow, live concurrency, and device acceptance remain pending.

Mobile delivery and current acceptance boundaries are recorded in
`docs/modules/construction/kharchi/STATUS.md`.

## 13. Exit Criteria

- contract-aligned shared/API source is complete;
- audit events and financial writes share transaction boundaries;
- automatic deductions are traceable and idempotent;
- focused and full API tests, type-check, build, and diff check pass or exact inherited blockers are recorded;
- no database, seed, browser, or device result is claimed without execution evidence.
