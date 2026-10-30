# Project Progress Status

> Last updated: 2026-10-30
>
> State: implementation complete; physical-device and authenticated write acceptance pending.

## Implemented

- 2026-09-18: Web W5 summary/stages, filtered history/pagination, append update/regression, conflict/retry, CSV and authorized portfolio implemented. Seven focused tests and scoped lint pass; whole-Web and authenticated acceptance limitations are tracked in [W5 Web parity](../../../tasks/web-w5-progress-parity.md). Existing API/Mobile verification below is historical evidence, not new Web acceptance.

- Approved contract and technical plan with documented equal-weight overall calculation.
- Shared nine-stage vocabulary, response types, permissions, audit action, and stable errors.
- Additive migration `019_project_progress.sql` with immutable history, scoped idempotency, actor identity, previous values, and Project/Organization foreign keys.
- NestJS Project summary, history, append update, CSV export, and accessible Organization portfolio APIs.
- Active Project enforcement, effective Project permission checks, concurrency expectation, regression-note rule, transactional Audit event, and retry fingerprinting.
- Guarded role synchronization without Platform Super Admin or Sales User operational grants.
- Expo route/navigation, Home dashboard consumption, overall/stage summary, stage filtering, paginated history, export, update sheet, success/error states, and English/Hindi/Gujarati copy/accessibility labels.

## Verified

- Remote migration ledger is 20/20 current; `project_progress_updates` exists.
- Expected eight customer role templates have Progress grants; Platform Super Admin and Sales User do not.
- Shared build, API/Mobile type-checks, 27 API suites/149 tests, API production build, locale parity across 17 namespaces, Android Expo export, and whitespace validation pass.
- Restarted current API reports health/database `ok`; unauthenticated Progress route returns `401 AUTH_SESSION_REQUIRED`.
- Read-only authenticated summary smoke returns `200`, nine canonical stages, and a valid computed overall value.

## Pending Acceptance Gates

- Authenticated create/idempotent replay/stale-write/regression workflow against deliberately created business test data.
- Physical-device layout, date picker, share sheet, pull-to-refresh, one-handed use, and slow-network checks.
- Screen reader, largest text, small-phone/landscape, dark-mode contrast, and fluent Hindi/Gujarati review.
- Files/Media evidence and offline queued writes remain deferred until their foundations are approved.

## 2026-10-30 — Mobile history layout correction

Moved Update history copy, date filters and export actions into separate layout rows. The old shared horizontal row squeezed the heading and stretched the CSV button to the filter card's height. Date fields and export groups now wrap within the available width, CSV/PDF use the same standard button size, and stage/history titles expose heading semantics. Invalid date ranges are visibly marked and both export controls reflect the existing invalid-range guard. Clear dates, permissions, stage filtering, pagination, refresh, update actions and export requests are preserved. Only this Mobile module's UI source changed; no shared component, Web/API or data change.

Verification: Mobile typecheck, locale parity and whitespace checks pass. Nine isolated React Native Web fixture previews (320/390/768 px, en/hi/gu) pass heading-width, overflow, export-height, invalid-range, clear and export-callback checks; CSV/PDF buttons measure 48 px in these previews. Fixtures use local callbacks and placeholder icons, so actual device layout, native date pickers and file sharing remain separate acceptance gates. The optional UI/UX companion skill was unavailable; existing components and theme tokens were used.
