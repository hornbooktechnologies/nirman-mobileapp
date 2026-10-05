# Site Expenses Status

## Current State

- Contract: approved on 2026-09-02.
- Shared/API source: implemented and statically verified.
- Migration: `018_site_expenses.sql` applied and schema-verified on the approved target.
- Seed role defaults: synchronized with `SEED_ROLE_USERS=false` and grant counts verified.
- Mobile: implemented and statically verified; authenticated physical-device acceptance pending.
- Web: implemented on 2026-09-18; 11 focused tests and scoped lint passed. Whole-Web baseline failures and pending browser/cross-client acceptance are recorded in [W4 Web parity](../../../tasks/web-w4-expenses-parity.md).
- Offline: deferred; no offline financial writes implemented.

## Owner approval correction - 2026-09-28

User authorized the API exception after confirming missing owner approval in Mobile/Web.
Eligible Builder Organization Owners and Independent Contractor Owners with effective
`expenses:approve` now receive `APPROVE` for their own pending expenses. Explicit approval
is required; creation/submission still follows the stored workflow snapshot. Other recorders
cannot self-approve and all self-rejection remains blocked. No migration is needed.

| Functionality | Existing API | Mobile / Web | Verification |
| --- | --- | --- | --- |
| Owner approval | Detail `availableActions` and `POST /:expenseId/approve` now allow eligible owner | Existing localized Mobile action and Web button reused; Web explanatory copy updated | Owner role/type/effective-permission tests; Web action tests |
| Approval integrity | Locked recorder check, expectedVersion, idempotency, audit actor and owner approval basis | Existing confirmation and server-result refresh preserved | Repository stale-version, self-rejection, non-owner denial and replay tests |
| Existing workflows | DIRECT and APPROVAL_REQUIRED snapshots unchanged | Existing submit/reject/cancel/adjust flows preserved | Existing Expenses tests retained |

Verification: all 258 API tests (37 suites), including 21 focused Expenses tests; 11 Web
Expenses tests; API/Mobile/Web type-checks; Web lint, scoped API lint, API build, Web production
build and git diff --check passed. Web build needed a network-enabled retry to fetch Google Fonts.
Authenticated API, browser, device and cross-client acceptance remain pending. Deploy/restart
the API before checking an existing own pending expense in either client; nothing was deployed
as part of this change.

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

## Mobile payment/form parity follow-up - 2026-10-05

Mobile retry, conflict review, unsaved-change handling and effective-permission parity implemented. Required payment date, bounded amount, duplicate-tap and 408 retry safeguards verified statically. Mobile typecheck, locale parity and focused recovery tests passed. Authenticated read-only checks show local ledger support and missing ledger fields on both deployed API origins; Record Payment remains unavailable there until the existing paid-spending API release is deployed. No financial writes, database mutations or deployment performed. Device and live payment acceptance remain pending. See current-task.md / PROGRESS_LEDGER.md for evidence.

## API payment safeguards follow-up - 2026-10-05

API expense detail now uses one consistent snapshot for cost/version/history/payment balances. Payment amount validation and strict expense calendar-date/reason validation align with the clients. Web payment error-status/408/duplicate-submit handling corrected. Verified: 45 API suites / 340 tests (12 isolated HTTP cases), API build/typecheck, client typechecks, scoped lint and eight Web expense tests. Authenticated read-only local API/report checks passed. Live API remains on pre-payment-support commit 49b3f5e; updated application deployment and physical-device acceptance remain pending. No database or real financial mutations performed.

## Cross-client audit follow-up - 2026-10-05

API inactive-project actions and database amount bounds fixed. Web/Mobile payment conflicts now require refreshed ledger review via shared recovery classification. Mobile workflow retries/permission checks, project/expense scope cleanup and Web-equivalent recorder/sort filters implemented with en/hi/gu parity. Verification: 354 API tests, 11 Web tests, two Mobile retry tests, shared/API/Web production builds, API/Web/Mobile typechecks, scoped lint and locale checks. Authenticated browser verified Record Payment enabled/open against updated local API via temporary browser-only request routing; zero-value rejection and 390x844 layout passed without financial writes. Production API/Web publishing awaits the user's asynchronous deployment choice. Physical-device/offline acceptance remains separate. See current task/ledger for evidence and remote-proxy diagnosis.
