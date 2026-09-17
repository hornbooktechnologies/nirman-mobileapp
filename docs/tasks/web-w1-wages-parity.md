# W1: Wages functional parity — 2026-09-17

Status: implemented; authenticated browser and cross-client acceptance pending. Scope is the Wages portion of W1 only, not Workers, Calendar/Attendance, Subscriptions, or all of W0.

## Source audit and preserved behavior

Extended the existing `/projects/[id]/wages` page, service, and React Query hooks. Preserved preview and confirmation, organization working-timezone date limits, batch selection, partial/full payments, manual adjustments/notes, and authenticated CSV download. Preserved the existing uncommitted future-period changes. No Mobile, API, shared-contract, migration, seed, dependency, or marketing-site files were changed by this slice.

Current sources checked: Wages Mobile screens/services, API controller/DTOs/service/repository, shared Wages/Kharchi types, project-access summary, Web auth/query infrastructure, existing route/UI components, Wages contract and Web implementation plan.

Mandatory dependencies are the existing Calendar/Attendance/rate calculations, effective project access, and backend Kharchi allocation/reversal implementation. W2's full Web Kharchi feature is not required. No dependency on Materials, Expenses, Progress, Gallery, or Sales was introduced.

## Parity checklist

Paths below share `/organizations/:organizationId/projects/:projectId`. Amounts and rate breakdowns are displayed from API responses; only input validation and remaining-payment convenience use client arithmetic.

| Mobile functionality | Existing API and fields | Web implementation / permission | Verification |
| --- | --- | --- | --- |
| Period preview and readiness | `GET /wages/preview?start=&end=`; items, readinessIssue, attendance, rateBreakdown, totals | Existing date inputs and preview preserved; added expandable calculation details, gross/deductions/adjustments, empty state and retry; effective `wages:read` | Type-check; targeted lint; date/readiness source regression review; authenticated comparison pending |
| Confirm snapshot | `POST /wages/batches`, periodStart/periodEnd; WageBatchDetail | Existing confirmation retained, ready-preview guard, duplicate-submit lock, server error text and refresh; `wages:generate` | Source review; no automatic mutation retries; authenticated overlap/create checks pending |
| Batches and details | `GET /wages/batches`, `GET /wages/batches/:id`; items, totals, cancellation metadata, payments | Existing selection retained; all statuses readable, read-only users can inspect worker details; failures have retry | Static checks; authenticated list/detail pending |
| Rate and financial breakdown | WageItem dailyRate, rateBreakdown, attendance counts, grossAmount, kharchiDeduction, adjustmentAmount, netAmount, paidAmount, notes | Per-day rate in worker row; full server snapshot in worker detail; Kharchi-settled explanation | Static checks; no client wage recalculation; multi-rate runtime comparison pending |
| Partial/full payment and history | `POST /wages/items/:id/payments`; amount, paymentDate, paymentMethod, reference, idempotencyKey; detail.payments | `wages:mark-paid`; positive two-decimal/remaining-due validation, same frozen payload/key on uncertain retry, input lock; immutable payment date/method/reference/actor/recorded time | Focused paise, invalid-input and retry lifecycle tests; timeout/concurrent browser acceptance pending |
| Adjust wage item | `PATCH /wages/items/:id`; adjustmentAmount, notes | `wages:update`; retained existing fields, decimal/length validation, stale snapshot warning and fresh-read comparison before save; API result replaces cached detail | Static checks; below-paid/negative-net API errors remain authoritative; concurrent runtime pending |
| Unpaid batch cancellation | `POST /wages/batches/:id/cancel`, reason 2–500 characters; refreshed cancellation metadata | Effective `wages:cancel`; focus-managed confirmation dialog, mandatory reason, any-payment blocking, cancelled read-only snapshot; payment/edit forms hidden | Focused payment-history/totals cancellation guard test; authenticated cancellation/reversal pending |
| Kharchi allocation/reversal history | `GET /kharchi?workerId=&page=&pageSize=20`, `GET /kharchi/:id`; deductionAllocations, reversedAt/By/Reason | Effective `kharchi:read`; on-demand worker advance selector with API pagination, selected advance's allocations filtered to wage item | Static endpoint/type alignment; no per-row eager requests; runtime permission/reversal pending |
| CSV | `GET /wages/batches/:id/export` | Existing authenticated download retained; effective `wages:export`, busy/error states and object-URL cleanup | Static regression review; authenticated download pending |
| Effective access and context isolation | `GET /organizations/:id/project-access/me`; target project's effective permissions, including CUSTOM | Wages shortcut uses effective project permissions; gate before mounting Wages data hooks; no extra `projects:read` requirement; separate disposable cache/state per user/organization/project, archived read-only UI | Focused target-project/denied/unknown-project tests; runtime switch/revocation pending |

Wages list/preview/detail APIs are unpaginated and Mobile has no server-backed Wages list filtering. Web does not invent pagination or silently truncate Wages results. Kharchi source browsing uses the existing paginated API. Large Wages datasets remain a volume acceptance check.

## Integrity and API boundaries

- Wages does not expose `availableActions`, `expectedVersion`, or workflow settings. Existing endpoint permissions/status checks and repository transactions remain authoritative. No unsupported fields are sent. The fresh-read adjustment comparison catches already-visible changes but cannot provide atomic optimistic concurrency without a backend version contract.
- Cancellation is naturally retry-safe in the existing API. Confirming overlapping batches is rejected by the server. Financial mutations have no automatic retry.
- Web retains the original payment key and payload on network, timeout, and server failures and blocks other financial actions until resolved. Inputs cannot mutate an uncertain request. The journal is in-memory for the mounted workspace; navigation/reload warns, but forced reload/session loss is not durable recovery. Review server payment history before entering a new payment after losing the workspace.
- Mobile currently constructs a fresh payment key per click. Web intentionally fixes this unsafe retry behavior rather than reproducing it. Mobile remains unchanged.
- Kharchi history is exposed by source advance, not by a batch-specific endpoint. The paginated advance selector makes that existing API usable without requesting every source detail eagerly.
- No backend change is required for the implemented parity. Atomic version-based adjustment conflict detection or durable cross-session payment recovery would require separately scoped work, not an invented client contract.

## Verification and remaining acceptance

- Focused Node tests cover cancellation, payment paise boundaries/invalid input, uncertain failure classification, stable retry payload/key lifecycle, and effective project permission denial.
- `pnpm --filter @nirman-app/web type-check`: passed.
- `pnpm --filter @nirman-app/web exec eslint src/features/wages`: passed; final full lint also reports zero Wages errors.
- `node --experimental-strip-types --test apps/web/src/features/wages/wage-rules.test.mjs`: 6/6 passed (outside sandbox because Node test subprocess spawning was blocked).
- `git diff --check`: passed.
- Whole-Web lint has three pre-existing `react-hooks/set-state-in-effect` errors in Organization Detail, Project Detail, and Settings. These unrelated W0 fixes are not included.
- `pnpm --filter @nirman-app/web build`: passed after an authorized retry outside the sandbox to fetch existing Manrope/Inter Google Fonts. All 25 static pages generated; the dynamic Wages route compiled.
- Production-server browser smoke: opening the Wages direct route without a session redirected to `/login` and rendered the sign-in form. No authenticated session was available, and the configured local API at `localhost:4000` refused the session-refresh connection. The temporary production Web server was stopped after the smoke check. No authenticated financial mutation, database action, Mobile/device check, responsive Wages visual review, or cross-client verification was performed.
- After final form/navigation refinements, the local TypeScript and ESLint CLIs were rerun against Web and the Wages feature respectively.
- Acceptance still requires an authorized test account/project: read-only and CUSTOM direct URLs; project/user/organization switching; multi-rate preview; batch confirmation; partial/full payment; uncertain timeout recovery; stale/below-paid adjustment; paid cancellation rejection; unpaid cancellation/reversal/regeneration; CSV; 375/768/1024/1440/1920px, 200% zoom, keyboard and screen-reader review. Existing auth/member/project flows need authenticated regression acceptance as well.
