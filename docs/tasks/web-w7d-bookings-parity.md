# W7d Web Bookings parity and review

Date: 2026-09-21. Status: implemented; focused verification passed; authenticated acceptance pending.

Scope: `apps/web` and documentation only. Preserved concurrent Mobile/EAS, Site Visits, Inventory and Sales changes. No API, database, migration, seed or Mobile changes; no commit, push or deployment.

## Audit and foundations

EXISTING: approved Sales contract; shared booking statuses, lead stages and permissions; Mobile list/conversion/detail/cancellation; API controllers/DTOs/repository transactions; Sales effective-project workspace, isolated React Query caches, lead ownership checks, inventory adapter and accessible form/dialog primitives. MISSING -> IMPLEMENTED: Web booking routes, adapter, hooks, list/detail, conversion/cancellation, navigation and focused tests. No substantial Web prerequisite is missing.

Reused English-only Manrope/semantic tokens, responsive cards and metadata grids, labelled fields, inline validation, first-invalid focus, dialog focus management, discard confirmation and loading/error/retry feedback. No invented financial calculations: amount, customer snapshot, statuses and restoration history come from the API. Dates remain date-only; timestamps use organization timezone. ui-ux-pro-max validation/error guidance applied within the existing NestJS client architecture.

## Mobile action -> API -> Web checklist

Paths below are relative to `/organizations/:organizationId/projects/:projectId/sales`.

| Mobile action | API / fields | Web / permission | Evidence |
| --- | --- | --- | --- |
| Sales -> Bookings; search/status filter | GET `/bookings`; search, status, bookedFrom, bookedTo | `/sales/bookings` project chooser; `/projects/[id]/sales/bookings`; effective lead read-own/team/all; URL search/status/date filters; responsive list and local 25-row pages | Adapter filter/signal/scope test; browser acceptance pending |
| Lead -> Confirm booking without unit | POST `/bookings`; leadId, bookingDate, optional bookingAmount/reference, idempotencyKey | Lead detail action; active project, effective leads:convert, read visibility/ownership; date, finite non-negative amount, reference max 120 | Amount, permission and retry tests |
| Confirm booking with unit | Same POST plus unitId; server snapshots customer/mobile/source | Named searchable inventory choices: available or blocked for the same lead; additional inventory:book; inventory:read needed for picker | Unit eligibility and permission tests |
| Retry confirmation | Same POST and exact logical request/key | Key/payload retained across uncertain retries and form reopen on the same mounted lead page; changed unresolved payload rejected; explicit refresh/review before retry; no automatic mutation retry | Exact replay/key, changed input, rejection/uncertainty and transport tests |
| Booking detail/linkage | GET `/bookings/:bookingId` | Stable detail route; amount/reference/date, actors, immutable first conversion, previous/current Lead/Unit states, customer/source, created/updated; authorized Lead history/Unit links | Typed adapter; runtime pending |
| Cancel and explicitly restore | POST `/bookings/:bookingId/cancel`; cancellationReason (1–2000), restoredLeadStage excluding BOOKED, linked unit restoredUnitStatus AVAILABLE/UNAVAILABLE | Confirmed only; active/effective leads:convert and ownership, plus inventory:book for linked unit; refreshed snapshot preflight; error preserves inputs; explicit confirmation dialog | Permission tests; API DTO/source audit; runtime pending |
| Cancellation and activity history | Detail fields + GET `/leads/:leadId/activities` | Cancellation reason/actor/time/restored states; existing lead activity timeline link; cancelled record read-only | Source parity; cross-client pending |

All Sales queries use organization/project/filter keys inside user/org/project-scoped cache lifetimes; permission/status changes reset child state. Successful writes invalidate Sales data. Reads carry abort signals; obsolete mutation completions cannot navigate or update a new workspace. Query errors suppress stale record rendering. Archived projects are read-only.

## API discrepancies and exact backend requirements

1. **Effective CUSTOM read grants (existing Sales defect, also affects bookings):** `SalesService.resolveLeadRead` chooses read-all/team/own from organization grants, then demands that exact project permission. An organization read-all user restricted to CUSTOM project read-own can receive 403 from GET `/bookings`, GET `/bookings/:id`, cancellation and lead reads. Web uses effective project grants and displays API denial. Smallest backend correction: derive visibility from resolved effective project permissions, with own/team/all/CUSTOM isolation tests. This needs explicit backend authorization; no backend was changed.
2. **TEAM visibility:** booking list/detail constrain OWN only, while lead lists filter active-team assignees. Writable-lead checks likewise special-case OWN. The API remains authoritative; Web does not invent an alternative TEAM contract. Reuse an approved team-visibility predicate across booking/lead reads and writes for consistent team restrictions. Requires backend authorization and cross-project/team tests.
3. **No atomic expected revision or cancellation idempotency:** booking responses/DTOs expose neither availableActions nor expectedVersion. Web checks current status/linkage before cancellation and refreshes after errors; repository locks and terminal guards remain the authority. A preflight cannot close the read/write race. If strict stale rejection is required, minimally accept an expected booking revision with transactional comparison. Confirmation already supports idempotency and needs no new API.
4. **Volume/export capability:** GET `/bookings` returns the full matching array, with no server pagination; Web pages that returned set locally and does not fabricate server totals. No booking CSV/export endpoint exists in Mobile/API. Server pagination is a future large-volume requirement; no export action is advertised.

Mobile cancellation shows an action from permissions/status alone; Web additionally checks effective ownership against the current lead, matching API enforcement. Customer fields remain server-derived. Mobile can show unit choices without inventory:book and then be rejected by the API; Web offers unit-linked conversion only with that grant. Uncertain retry state is in memory, survives form reopen on the same lead page, and is not an offline/reload recovery queue. After navigation/reload, reconcile Bookings before creating again.

## Verification and remaining acceptance

- 13 focused Node tests passed: eight new booking tests plus five Sales permission/context regressions. Node test workers initially hit sandbox EPERM; approved retry passed.
- Bookings, touched Sales components/navigation and adapter/hooks/rules scoped ESLint passed. Final route/filter ESLint also passed using the installed workspace ESLint binary.
- Whole-Web type-check ran: existing Workers `use-workers.ts:214,223,237,238` errors; no Bookings diagnostics in either run, including the final URL-filter changes.
- Whole-Web lint ran: existing Attendance memoization and Organization Detail/Project Detail/Settings effect-state errors. Initial Bookings ref reads were replaced with state; focused lint passed afterward.
- Production build attempted, including an approved retry after sandbox font fetch failures. The retry fetched fonts and failed on existing Attendance invalid UTF-8 at byte 7088 and Workers non-async await parsing. No integrated build success claimed.
- Browser smoke attempted on a temporary local port-3012 dev server. Next reported ready, but the Bookings route remained compiling while browser CDP navigation/focus timed out; no successful render or redirect is claimed. The temporary server was stopped.
- `git diff --check` passed (line-ending warnings only).
- No authenticated browser session or disposable cross-client test fixtures were available. Live create/replay/cancel, API permission matrix, cross-client outcomes and concurrent transactions remain unverified. No live business records were changed.
- Pending acceptance: Owner/Sales/Viewer/CUSTOM direct-route and action matrix, expired session, lost response/replay, concurrent unit booking and cancellation, Web -> Mobile -> Web and reverse flows, responsive widths/200% zoom/keyboard/screen reader and representative volume.

Review outcome: Web functionality implemented against the existing API; not marked fully accepted. The API access defects and unrelated whole-Web build blockers remain explicit.
