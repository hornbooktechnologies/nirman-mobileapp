# Site Expenses Status

## Current State

- Contract: approved on 2026-09-02.
- Shared/API source: implemented and statically verified.
- Migration: `018_site_expenses.sql` applied and schema-verified on the approved target.
- Seed role defaults: synchronized with `SEED_ROLE_USERS=false` and grant counts verified.
- Mobile: implemented and statically verified; authenticated physical-device acceptance pending.
- Web/offline: not implemented.

## Delivered Mobile

- permission-aware navigation and active-Project context;
- recognized/pending/adjustment summary, paginated list, search, filters, refresh, and CSV export;
- workflow settings plus create/draft/edit forms;
- detail, server-derived actions, approve/reject/submit/cancel, immutable adjustments, and timeline;
- localized API error recovery and complete English/Hindi/Gujarati copy;
- existing operational components, semantic tokens, locale-aware currency/date formatting, accessible
  labels, and touch-sized controls.

See `MOBILE_INTEGRATION_CONTRACT.md` for the client authority and acceptance boundary.

## Delivered API

Base route:

```text
/api/v1/organizations/:organizationId/projects/:projectId/expenses
```

- `GET|PUT /settings`;
- `GET /`, `/summary`, `/export`;
- `POST /`;
- `GET|PATCH /:expenseId`;
- `POST /:expenseId/submit|approve|reject|cancel`;
- `POST /:expenseId/adjustments`.

The API enforces active membership, effective Project permission, Project ownership, Direct versus
Approval-required workflow snapshots, reviewer separation, expected versions, 8-120 character
idempotency keys, immutable events/audit, transactional notifications, and non-negative recognised
cost after signed corrections.

## Verification Evidence

- shared build: passed;
- API type-check: passed;
- API production build: passed;
- focused Expenses lint: passed;
- focused Expenses tests: 2 suites, 10 tests passed;
- full API tests: 25 suites, 143 tests passed after the final test addition;
- `git diff --check`: passed;
- Mobile locale parity across 16 namespaces and three languages: passed;
- Mobile type-check: passed;
- Expo web production export: passed (1,075 modules);
- Expo Android production export: passed (1,444 modules);
- remote migration ledger: 19 local, 19 applied, 0 pending, 0 drafts, current;
- all five Expense tables and the applied `018_site_expenses.sql` ledger row: verified;
- expected Expense grants: Owner/Admin templates 8, Project Manager 7, Builder Supervisor 3,
  Contractor Member 3, Site Supervisor 3, Sales/Viewer/Platform Super Admin 0;
- duplicate permission groups: 0;
- Expense business/settings/history row counts after rollout: all 0;
- API/database health: `200`, app/database `ok`;
- current API listener restarted from the current `dist` build; health is `200`/`ok` and the
  unauthenticated Expenses route returns `401 AUTH_SESSION_REQUIRED`, so route registration passes.

## Pending Gates

- authenticated Direct/Approval role and Project/tenant matrix;
- live idempotency, stale-version, concurrent approval/adjustment, audit, notification, summary, and
  CSV parity checks;
- authenticated Mobile workflow, conflict/idempotency, timeout, physical-device, screen-reader,
  largest-text, landscape, and fluent Hindi/Gujarati acceptance;
- Web, offline sync, Files/Media receipts, and authenticated browser acceptance.
