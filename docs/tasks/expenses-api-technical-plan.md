# Site Expenses API Technical Plan

## 1. Status

- Status: API/database baseline verified; authenticated runtime acceptance pending
- Module or phase: Site Expenses API foundation
- Last updated: 2026-09-02

## 2. Purpose

Implement the approved API foundation for `docs/modules/construction/expenses/CONTRACTS.md` without
executing database migrations or seeds and without starting Mobile/Web before the API contract is
stable.

## 3. Inputs

- `MVP_REQUIREMENTS.md` sections 6, 7, 16, 24, 26, and 27;
- `CODEX.md`;
- `docs/modules/MODULE_CONTRACT_STANDARD.md`;
- `docs/ai-development/CONTRACT_TO_IMPLEMENTATION_WORKFLOW.md`;
- `docs/modules/construction/expenses/CONTRACTS.md`;
- Materials, Kharchi, Project Access, Audit, and Notifications source/contracts;
- current shared permissions/errors/types, migration runner, seed role templates, and progress docs.

## 4. Scope

In scope after contract approval:

- shared Expenses contracts, permissions, descriptions, errors, and exports;
- guarded default customer-role grants;
- additive `018_site_expenses.sql` migration draft;
- NestJS controller/service/repository/DTO module;
- Project Access, Audit, and Notifications integration;
- settings/list/summary/export/create/detail/update/submit/approve/reject/cancel/adjust endpoints;
- focused repository/service tests and documentation evidence.

Out of scope:

- migration or seed execution;
- receipt media, offline queue/storage, accounting/GST/reimbursement, Materials auto-link;
- Mobile and Web implementation until the API slice is verified;
- authenticated runtime, browser, or physical-device acceptance without separate execution gates.

## 5. Dependencies

Mandatory now:

- Authentication, active Organization membership, Project Access/Team, RBAC;
- reusable Audit Foundation and Notifications Foundation;
- idempotency, transaction, and database migration patterns.

Required for full MVP acceptance:

- Mobile en/hi/gu field workflow;
- Offline Sync creation replay;
- Files/Media receipt ownership if receipts remain an MVP acceptance requirement.

Future integration:

- Project dashboards/reports and optional Materials purchase linkage.

No direct dependency:

- Workers, Attendance, Wages, Kharchi, Sales, Progress, and Gallery.

## 6. Implementation Slices

| Slice | Goal | Areas | Verification | Approval Needed |
| --- | --- | --- | --- | --- |
| A | Approve contract decisions | docs | owner review | yes |
| B | Shared contracts and role defaults | `packages/shared`, seed source | shared/API type-check | no after A |
| C | Additive SQL draft | migration file only | static review | yes before execution only |
| D | API module | `apps/api` | focused tests, API type-check/build | no after A |
| E | Source review/docs | docs | full API tests, diff check | no |
| F | Database/runtime rollout | approved target only | status/schema/authenticated matrix | separate approval |
| G | Mobile integration | `apps/mobile` | locales/type-check/export/device gates | separate staged slice |
| H | Web integration | `apps/web` | type-check/build/browser gates | deferred unless requested |

## 7. File Plan

Likely new files:

- `packages/shared/src/constants/expenses.ts`;
- `packages/shared/src/types/expenses.ts`;
- `apps/api/src/database/sql/migrations/018_site_expenses.sql`;
- `apps/api/src/modules/expenses/expenses.module.ts`;
- `apps/api/src/modules/expenses/expenses.controller.ts`;
- `apps/api/src/modules/expenses/expenses.service.ts`;
- `apps/api/src/modules/expenses/expenses.repository.ts`;
- `apps/api/src/modules/expenses/dto/expenses.dto.ts`;
- focused service and repository specifications.

Likely narrow updates:

- shared constants/type barrels, permissions, errors;
- `apps/api/scripts/seed.ts` and `apps/api/src/app.module.ts`;
- module index, current task, progress ledger, and review evidence.

## 8. Verification Plan

- shared and API type-check/build commands from workspace manifests;
- focused Expenses repository/service tests;
- full API test suite;
- `git diff --check`;
- SQL static review for composite tenant/Project foreign keys, restrictive deletes, decimal checks,
  idempotency uniqueness, indexes, and immutable history;
- explicitly record database, authenticated runtime, Mobile, Web, and device gates as unrun.

## 9. Risks

- Financial history can be corrupted by mutable approved records or blind concurrency.
- Incorrect role defaults may grant commercial approval to field roles.
- Summary/export drift can misstate recognised Project cost.
- Receipt IDs are unsafe before media ownership and authorization are defined.
- Existing uncommitted Materials/Kharchi/Sales/Mobile work must be preserved.

## 10. Rollback Notes

Before database execution, source rollback is limited to the Expenses-specific additive files and
narrow registrations. After database execution, use a separately reviewed forward migration; do not
drop financial tables or history casually.

## 11. Open Decisions

No product decisions remain for the API baseline. Migration `018` and guarded role synchronization
are complete on the approved target. Authenticated runtime acceptance and later Mobile/Web slices
remain independent gates.

## 12. Exit Criteria

API source is implemented only when the approved contract is reflected in shared contracts, SQL,
authorization, transactional workflows, audit/notifications, tests, and synchronized docs. It is
runtime-verified only after separately approved database rollout and authenticated acceptance.

## 13. Implementation Evidence

Implemented on 2026-09-02:

- shared statuses, categories, payment methods, permissions, types, errors, and action vocabulary;
- guarded customer-role defaults without Platform Super Admin customer access;
- additive `018_site_expenses.sql` draft with settings history, expenses, events, and adjustments;
- settings/list/summary/export/create/detail/update/submit/approve/reject/cancel/adjust API routes;
- Project Access, immutable Audit, in-app Notifications, scoped idempotency, row locking, version
  conflicts, self-approval denial, and signed adjustment lower-bound enforcement;
- 10 focused Expenses tests plus the full API test suite.

After separate exact-target approval, migration `018` and the full guarded seed were executed with
`SEED_ROLE_USERS=false`. The 19/19 migration ledger, five Expense tables, expected role grants, zero
duplicate grants, and zero Expense business rows were verified. Authenticated runtime workflow,
Mobile, and Web acceptance were not run.
