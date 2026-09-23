# Web UX redesign: design contract and phased implementation

Date: 2026-09-22
Owner direction: approved in the task conversation; implement incrementally.
Input: [role-based audit](web-role-based-ux-audit.md).

## Outcome

Make the first visit understandable and repeated daily use predictable. Preserve NirmanSite's current palette and Manrope font family. Modernize composition, hierarchy, spacing and interactions. Mobile is the reference for useful information, contextual actions and semantic meaning; Web uses desktop-appropriate layouts.

Scope: Web presentation and navigation using existing API contracts. Preserve permissions, organization/project isolation, calculation snapshots, validation, recovery and unsafe-write safeguards. No API/database changes, dependency additions, deployment or Mobile redesign are included. Record unsupported information/links as contract gaps instead of inventing data.

## Shared design contract

### Typography and surfaces

- Retain current brand colors and font family; use semantic tokens.
- Page title: 22px on narrow screens, 26px desktop, semibold. Section title: 16–18px semibold. Body/table content: 14px with comfortable line height. Field labels: 13px medium, sentence case. Supporting text: 12–13px. Avoid per-page size overrides.
- Use existing rounded surfaces with subtle borders/shadows. Avoid unnecessary cards inside cards and large decorative blank regions.
- Use 4px spacing increments; consistent 16–24px section/card padding. Align numeric values and use tabular numbers. Long names must wrap without collapsing the layout.
- Standard controls use consistent heights and typography. Narrow touch layouts need usable targets and 16px editable text where needed to avoid browser zoom.

### Collections

- Table/list toolbar contains search and a Filters trigger. All filtering fields belong inside a right-side drawer at every viewport.
- The trigger shows the applied filter count. A concise read-only scope summary may remain visible; it is not an inline filter form.
- Drawer has the same title/close location, labeled fields, Reset and Apply placement everywhere. Changes are drafts until Apply. Reset restores filter defaults in the draft; Apply commits them. Escape/close cancels drafts. Mandatory tenant/project scope is never silently cleared.
- Search remains immediate/debounced according to existing contracts; applying filters resets pagination. Preserve supported query state on refresh and list/detail/back navigation.
- Standard pagination, loading, empty, filtered-empty, denied, stale and error states. Never treat missing data as zero.
- Do not add a nonfunctional search to a dataset without searchable support. Document the smallest contract gap if necessary. Context-setting inputs for calculations/mutations are not table filters and stay with their task.

### Detail pages and actions

- Stable order: identity/context, current situation and key facts, relevant actions, related records/modules, history, administrative management.
- Default to readable information; editing is an explicit action. One visually dominant action per task group. Keep destructive actions away from routine work, retaining confirmations.
- Common action positions and vocabulary across modules. Hide unauthorized commands; explain state-based unavailability when it helps recovery.
- Related links preserve organization/project and supported worker/customer/date context. Return restores the originating list. Label project-wide destinations honestly when record filtering is unavailable.

### Status and contextual color

- Build explicit domain mappings rather than one generic enum-to-color guess. Keep lifecycle, assignment, urgency and availability separate.
- Worker context: working here / assigned here use success-family surfaces with distinct labels; elsewhere uses info; unassigned uses warning; inactive uses neutral. Unknown/loading is never unassigned.
- Subtle row/card tint or accent conveys meaning, backed by labels/icons. Maintain contrast and distinct hover/selection states. Do not introduce arbitrary module palettes.
- Sales available/booked, high-intent/cancelled and pending/completed must be distinguishable by meaning and text. Final mappings will be documented with the relevant module migration.

### Trust and interaction

- No sample operational dashboard values presented as real. Use supported scoped data or honest unavailable states; never aggregate one page into an organization total.
- Show project/date context before and during writes. Preserve draft input after recoverable errors. Distinguish saved, failed and uncertain outcomes.
- Keep historical wage rates from the calculation snapshot. Current/scheduled rates belong in worker context with effective dates. A multi-rate period shows its actual breakdown; it must not substitute today's rate.
- Accessible drawers: unique labels, initial focus, focus containment/restoration, Escape and background scroll lock. Respect reduced motion; avoid moving content during loading.

## Phases and gates

| Phase | Scope and deliverable | Acceptance gate | Initial state |
| --- | --- | --- | --- |
| 1A | Shared title/section/label hierarchy; prevent crowded headers and fixed-width selectors from collapsing/overlapping | Focused lint/type check; long-title layout browser check pending if unavailable | Implemented; static checks passed; visual acceptance pending |
| 1B | Accessible drawer, reusable collection toolbar with draft/apply/reset contract, search and shared states; unify remaining control/table typography | Keyboard, cancel/apply/reset, focus restoration, scroll and responsive checks on a reference screen | Implemented; focused tests and browser fixture verified; authenticated/native zoom acceptance pending |
| 2 | Workers listing/detail + Project workspace + Attendance as the reference journey; contextual colors, read-first details, permitted assignment/rate actions, quick access and return state | Working-here/elsewhere/unassigned/inactive/read-only cases; project/date consistency; attendance recovery | Implemented; final verification recorded below; authenticated acceptance pending |
| 3 | Builder dashboard and shared project navigation; remove misleading sample content, introduce supported real summaries/actions | Every displayed metric has a verified source/scope; no fabricated totals; permission-aware links | Implemented; verification below; authenticated acceptance pending |
| 4 | Wages and Kharchi; understandable earning/rate/day context, deductions, stage organization and linked history | Snapshot rates retained; multi-rate periods, payment/adjustment/cancellation/uncertain outcomes preserved | Implemented; static checks passed; browser/authenticated acceptance below |
| 5 | Materials and Expenses; next-action responsibility, quantities/costs, evidence and readable history | Direct/final approval modes and existing actions preserved; API-derived state and quantities | Implemented; focused and fixture checks below; authenticated acceptance pending |
| 6 | Progress, Gallery and Calendar; readable project activity and relevant quick access | Evidence links only where actual relationships exist; clear date and project scope | Implemented in Web; static checks passed; browser and authenticated acceptance pending |
| 7 | Sales leads/follow-ups/visits/inventory/bookings; action hierarchy, domain statuses, customer/unit relationships | Lead → visit/unit → booking → return; available/booked distinction and preserved safeguards | Implemented in Web; static checks passed; browser and authenticated acceptance pending |
| 8 | Organizations, Members, Users/Roles, Notifications, Profile, Settings, Subscriptions and all remaining forms/details | Same components and interaction conventions; effective-role checks and recovery | Implemented in Web; static checks passed; browser and authenticated acceptance pending |
| 9 | App-wide visual and role acceptance; remove obsolete duplicate patterns after consumer migration | Four persona journeys, responsive/zoom/keyboard, no mixed filter patterns or contextual regressions | Route/source and static checks complete; synthetic browser reflow verified; authenticated role acceptance pending |

Each phase gets its own bounded change set, evidence and status update. Do not begin all phases together. Within a phase, reuse existing features rather than reimplementing business logic. Shared component changes have app-wide reach, so review their consumers before widening scope. Phase 3 may be pulled forward if authenticated evidence confirms users currently see the sample dashboard; do not wait to call out that trust risk.

## Implementation and verification procedure

1. Recheck git state and current module source; preserve unrelated work, particularly the existing Materials changes.
2. Compare Mobile → API contract → Web for the specific journey. Record retained behavior and gaps.
3. Implement shared patterns and migrate one bounded journey. Do not wire a new universal pattern into every module in one pass.
4. Run focused lint/type checks and meaningful behavior checks. Browser checks must cover populated/empty/error/read-only states, long names, drawers and list/detail/back.
5. Check 1366px laptop, narrower tablet and 200% zoom; keyboard focus and reduced motion. Use authorized test data for mutations.
6. Record implemented, statically verified, browser verified and accepted separately. No claim of completion based on a build alone.

## Success criteria

- A first-time user can identify the record, its current situation and the next permitted action without explanation.
- Learning search/filter/details in Workers transfers to other modules.
- Experienced users recognize states and find actions in stable positions.
- Values answer adjacent questions: wages show their applicable rate/day context; materials distinguish approval from delivery.
- Users can move to related work and return without reconstructing context.
- Current brand identity remains intact while hierarchy, density and interaction quality become consistent.

## Progress

- Planning: recorded from the user's design direction and the role-based source audit.
- Authenticated browser access: unavailable in the audit session; deployed app presented login. Runtime acceptance remains pending.
- Phase 1A: initial code implemented in `components/ui/layout.tsx`, `components/ui/typography.tsx` and `features/projects/components/organization-context-select.tsx`. Shared headers use the typography primitives and wrap action groups; selector width is constrained to its container. No business workflow changes.
- Phase 1A checks: focused ESLint and scoped diff whitespace checks passed. Full Web type-check is blocked by pre-existing malformed `.next/dev/types/routes.d.ts` and `validator.ts`. A separate source-only TypeScript check passed with zero diagnostics, excluding generated Next files and their next-env import in memory without modifying either. This is not equivalent to a passing full Next build.
- React review: shared presentation primitives reused; no new effects, requests, state or dependencies. Authenticated long-title, zoom and responsive visual acceptance remains pending; this phase is not marked accepted. No app-wide design completion claim.
- Next bounded slice: Phase 1B collection/filter foundation, followed by its adoption and browser acceptance in the Phase 2 reference journey.

### Phase 1A validation pass — 2026-09-22

- Scope: re-audited the existing three-file foundation diff and production consumers. No additional application-code changes were justified by source inspection. Existing Materials/API/Mobile/shared work was preserved. Phase 1B was not started.
- EXISTING: `PageHeader` keeps title/context in a flexible 20rem-basis group and lets actions wrap; Project Detail supplies a wrapping inner action group. API project names permit up to 120 characters. `Heading` retains word wrapping, 22/26px sizing and an h1; `SectionHeader` uses the 16/18px h2 primitive. Description and field-label defaults match the 13px contract. The root layout still loads Manrope; palette tokens are unchanged.
- EXISTING: Workers is the only production `OrganizationContextSelect` consumer. Its desktop grid allocates 220px to the selector; the former 280px select override is gone, and both the select and its wrapper allow shrinking. Dashboard portfolio labels retain explicit `htmlFor`/control-id associations. Control/table typography and module navigation remain later-phase work.
- Fresh static evidence: focused ESLint passed for `layout.tsx`, `typography.tsx` and `organization-context-select.tsx`; source-only TypeScript passed with zero diagnostics using an in-memory config containing `src/**/*.ts` and `src/**/*.tsx`, with incremental output disabled and generated Next files excluded. Scoped `git diff --check` passed. Source-only verification is not a full Next build.
- Initial full Web type-check still failed on generated `.next/dev/types/routes.d.ts` lines 121–123 and `validator.ts` lines 620–623. No generated files were manually edited or deleted.
- Final full Web type-check (`pnpm --filter @nirman-app/web type-check`) passed after the local Next dev server regenerated its route types. The initial generated-type blocker is therefore resolved in this checkout; the earlier failure remains historical evidence. A production build was not run for this validation-only pass.
- Browser attempt: no reusable authorized browser session was available. Localhost initially refused connection. The sandbox prevented Next.js child-process startup (`spawn EPERM`); an approved retry started the local dev server. Browser navigation then timed out (`Page.navigate`), and subsequent tab inspection timed out (`Emulation.setFocusEmulationEnabled`) while `/workers` was compiling. No credentials or business mutations were submitted.
- Runtime evidence at shutdown: the server logged successful `/workers` and subsequent `/login` responses; authenticated Workers content was not inspected. The task-started dev server was stopped after verification. Completing visual acceptance requires a responsive browser with an authorized signed-in session.
- DEFERRED acceptance: actual long and unbroken 120-character project names, crowded project actions, Workers selector/search separation, heading/label readability at 1366px and tablet widths, and 200% browser zoom remain unverified. No authenticated, responsive, keyboard or role acceptance is claimed. Recheck these with a responsive browser and authorized session before Phase 1B adoption.

### Phase 1B — collection/filter foundation — 2026-09-22

Implementation:

- Reused `components/ui/drawer.tsx`, converting it to a native modal dialog with generated title/description ids, background inertness, initial close-button focus, explicit Tab/Shift+Tab boundary wrapping, focus restoration, Escape/backdrop cancellation, reference-counted body scroll locking and motion-safe entrance animation. Native focus behavior alone failed the browser boundary check; explicit wrapping fixed it. Header/body/footer remain separate so filter content scrolls without losing actions.
- Added `CollectionToolbar` and `CollectionPagination` beside the existing `DataTable`/states. Search is optional for future collections without a search contract. Filters copy applied values when opened, maintain an independent draft, discard it on close/Escape, and reset only that draft. Apply commits once; fields receive a unique id prefix. Scope is read-only and outside resettable filters. Consumers must key their workspace by user/organization/project and update draft objects immutably.
- Projects is the only migrated collection. Uses the existing organization-scoped GET endpoint, immediate search (name/code/city), status/type filters, 20-item pages and authoritative metadata. Applying filters/search resets to page 1. URL state is normalized and marked with the active organization; a scope change discards previous filters/page. Detail/back preserves a validated internal Projects return URL. No external return destination is navigated. Create visibility respects `projects:create`; list queries mount under `projects:read` and include user identity in their cache key while retaining invalidation prefixes.
- Existing response normalization remains compatible for other consumers, but now identifies legacy/incomplete pagination. Projects shows an unavailable/retry state instead of treating those fallback page lengths as reliable totals. Real server zero results, filtered-empty, out-of-range page recovery, fetching and failed-refresh states are distinct. Source trace: `QueryProjectDto` and `ProjectsRepository.list` apply the same organization/member/search/status/type constraints to both rows and total; no organization total is derived from one page.
- Shared Button/Input/Select/Textarea/Table typography now follows the recorded contract: 14px desktop content, 13px sentence-case table headings, 16px narrow editable controls and usable narrow targets. Palette and Manrope remain unchanged. Existing production primitives and reference previews remain; no module-wide filter migrations were performed.

Changed source groups:

- `components/ui/{drawer,collection-toolbar,index,button,input,select,textarea,table}`.
- Projects list/detail, list hook, response service/type, `project-list-query.ts`, `project-list-response.ts` and their focused tests.
- Development-only `/foundation-preview` route and `components/ui/__fixtures__/collection-preview.tsx`; synthetic state uses production primitives. The route returns not-found outside development and is not an alternative product design system.

Verification and acceptance:

- Seven Node tests passed (`node --test --test-isolation=none apps/web/src/features/projects/project-list-query.test.mjs apps/web/src/features/projects/project-list-response.test.mjs`): scoped return round trip, scope changes, hostile return destinations, malformed query inputs, server total vs page length, unavailable metadata and genuine empty results.
- Full Web TypeScript and focused ESLint passed in the final verification pass. Separate Project Detail lint still fails at its existing form-hydration effect (`setForm`, now line 44); the only changes there are reading and validating the return URL. That existing effect was not changed or suppressed. Scoped whitespace and UTF-8 checks passed. No production build or authenticated API acceptance is claimed.
- Browser fixture verified initial focus, forward/backward Tab containment after the fix, Escape/close draft cancellation, Reset without applying, Reset then Apply, applied count, Apply page reset, search page reset, focus restoration and body scroll lock/unlock. All observed ids were unique. No business records or credentials were submitted.
- Phase 1A fixture consumers rechecked at 1366×768 and 768×1024: long 120-character project title and eleven header actions wrap; the Workers 220px selector has a 12px gap before search at laptop width and stacks at tablet width. Computed Manrope, 26px desktop heading and 13px labels verified. At 360×740, heading is 22px and editable text is 16px. No document horizontal overflow in those fixtures.
- At 683×384 (the CSS layout dimensions corresponding to a 1366×768 window at 200%), the title remained wide enough to wrap and the drawer footer stayed inside the viewport with a scrollable body. This is a reflow approximation, not native browser zoom acceptance. Right-side drawer placement and footer visibility were also checked at tablet and 360px widths.
- Actual `/projects` loaded and redirected to `/login`; no reusable signed-in account was available. Real populated/empty/error/read-only Projects queries, refresh/detail/back behavior, organization switching and effective-role acceptance remain unexecuted. Runtime reduced-motion preference switching and native 200% zoom remain open; reduced-motion rules were reviewed in source. Fixture evidence is not authenticated product acceptance.

Next phase: Phase 2 Workers/Projects/Attendance. Reuse this foundation, complete the outstanding authenticated/native-zoom/reduced-motion gates, and migrate only the authorized Phase 2 surfaces. Phase 2 has not started. API/database/Mobile/dependencies and unrelated Materials changes were preserved; no commit, push or deployment.

- Verification cleanup: temporary browser tabs were closed, viewport overrides reset, and the task-started development server stopped.


## Phase 2 implementation and evidence — 2026-09-22

Status: implemented in Web only; authenticated acceptance remains open. Stop before Phase 3.

### Mobile → API → Web comparison

- EXISTING: Mobile distinguishes primary/working here, assigned here, assigned elsewhere and unassigned. API roster exposes `isPrimaryForDate` and assignment snapshots; `ALL_ACTIVE` includes scheduled assignments. Web already loads all roster pages. Keep that complete-roster lookup; add inactive, loading and unavailable as separate states. A failed/stale access request never proves a worker is unassigned.
- NEEDS_CHANGE, implemented: Workers search plus shared draft/apply/reset drawer; labeled semantic row tints and narrow cards; retry/error and page recovery; search/status/trade/project/assignment/page URL state; safe same-organization list/detail/create/back restoration. Assignment filtering remains explicitly **current-page only** because the API has no corresponding directory-wide state filter. Pagination and server directory totals remain visible even when no rows on that page match.
- NEEDS_CHANGE, implemented: Worker Detail opens as readable identity, current primary allocation, base/assignment-rate snapshots and active assignments. Separate navigation exposes existing Attendance, assignment/rate management, history and administrative management. The original ProjectWorkersPanel is reused with a focused worker; assignment dates, primary-period conflict checks, effective-date rate validation, mutation guards, dialogs and error handling remain intact. Archived projects and inactive focused workers cannot issue assignment/rate commands. Related attendance is worker-scoped; wages/Kharchi links are honestly labeled project-wide.
- NEEDS_CHANGE, implemented: Project Detail now separates identity/status, permission-aware workspace links, read-first project facts, deliberate editing and lifecycle commands. Restore requires both effective restore and view-all grants; lifecycle actions follow current status. Keyed editor initialization replaces the old setForm effect without overwriting drafts on refetch. Project detail query cache includes user identity; existing invalidation prefixes still work. Team supports `tab=workers` and preserves the originating Projects list context.
- NEEDS_CHANGE, implemented: Attendance summary uses the shared drawer for project/period/exception filters. Summary/daily/recovery navigation is separate from title/export actions, preserves supported project/date/return context, and explains automatic presence versus recorded full/half-day absences. Assignment recovery requires project-read, workers-read and assign permission; calendar uses its actual project/month deep link. Daily task date/roster editing controls and mutation semantics are retained. Existing callback dependency omissions were corrected so focused lint can verify this touched file.
- MISSING / DEFERRED contracts: no server-wide working-here/elsewhere directory filter, no detailed worker rate-change history, no invented financial filters. Current rates are never substituted into historical attendance/wage calculations. Restricted-role allocation/history results remain limited to API-accessible projects. Full role/data/mutation acceptance requires an authorized session and test data.

### Changed file groups

- Workers: `worker-list-query.ts` and five behavioral tests; production `worker-collection-rows.tsx`; list/detail/create pages; focused-worker support in existing `project-workers-panel.tsx`.
- Projects: detail and team pages, user-scoped detail query in `hooks/use-projects.ts`.
- Attendance: summary and marking pages; reusable permission-aware `attendance-navigation.tsx`.
- Development fixture: `foundation-preview?phase=2` uses production row/card and navigation components with clearly labeled synthetic data. The route remains unavailable outside development.
- This plan, current-task and progress ledger; earlier entries and unrelated Materials work are preserved. No API, Mobile, database, dependency, commit, push or deployment operations performed.

### Verification

- Twelve focused tests passed (five Workers state/return tests plus seven retained Projects query/pagination tests). Covers unknown/loading versus unassigned, primary/assigned distinction, inactive exclusions, worker list round trips, invalid/foreign redirects, Attendance period/search/page return preservation, and truthful server pagination metadata.
- Final full Web TypeScript passed with zero diagnostics. Focused ESLint passed for all 14 touched TypeScript/TSX files, including Project Detail and daily Attendance. The initial final-pass TypeScript run found a fixture-only generic inference issue; explicitly typing the filter payload fixed it, then both final checks passed.
- Scoped `git diff --check` passed; all 15 Phase 2 TypeScript/TSX/test source files decoded as strict UTF-8. No production build or app-wide lint claim.
- Browser: real `/workers` redirected to `/login`; no credentials were invented and no operational data was mutated. Browser-driven fixture checks used measured 1366x768, 768x1024, 360x740 and 683x384 CSS viewports. Long names wrapped; no document horizontal overflow; existing Manrope and semantic palette verified; narrow search uses 16px text. All seven assignment states rendered with distinct textual meaning, including neutral loading/unavailable.
- Fixture interactions verified: assignment Apply updates count and resets page, elsewhere/unassigned excludes inactive/unknown, Reset then Escape leaves the applied filter intact, Reset then Apply clears it, empty search results retain pagination, read-only navigation removes write/recovery links, Shift+Tab and Tab wrap inside the drawer, body scroll locks and restores, focus returns to the filter trigger. A browser automation empty-string fill did not clear the search; normal Select All/Backspace did, and the resulting populated tablet layout was verified.
- Remaining acceptance: authenticated Workers → Detail → assignments/rates → Attendance and Project/Team return journeys with actual roles (including CUSTOM), API loading/error/stale transitions, inactive/archived and rate mutation outcomes, native 200% zoom, runtime reduced-motion preference, and authenticated detail-page visual review. The 683px fixture check is only a reflow approximation, not native zoom. Fixture permission toggling is component evidence, not proof of server authorization.

Next: Phase 3 — Builder dashboard and shared project navigation, only after explicit instruction.


## Phase 3 implementation and evidence — 2026-09-22

Status: implemented, with final static/browser verification recorded below. Stop before Phase 4.

### Audit and bounded decisions

- EXISTING: Mobile consumes `GET /organizations/:organizationId/projects/:projectId/dashboard`, whose role profile changes priority while effective project grants control sections/actions. Current shared `RoleDashboardResponse`, DashboardService/Repository and the dashboard contract were inspected; prior Mobile acceptance is historical, not proof of this Web checkout.
- NEEDS_CHANGE, implemented: Web still shipped literal 146 workers, 8 approvals, 72% progress and sample Tower A/Villa Row/approval arrays. The live dashboard no longer imports or renders sample operational data. The retired sample data file contains no records; legacy types now re-export the real shared dashboard types.
- EXISTING but unsafe to present as current Attendance/finance: dashboard `site()` counts active project assignments and subtracts absence-day sums without primary-period/work-calendar eligibility. `finance().outstandingKharchi` combines month-window advances with all-time adjustments/deductions; `wageEstimate` is an overlapping-batch gross sum rather than a current earned/owed figure. Web does not display these values, change their calculations, or attempt client-side repairs. Users get an explicit unavailable state and permitted module navigation. API contract alignment is a separate backend slice.
- Project context is explicit and URL-backed. An inaccessible requested project never falls back to a different project's figures; a foreign organization marker requires switching organization or deliberately using current context. The project-access endpoint supplies selector options, not a fabricated organization portfolio total. No project list page length is reported as an organization total.

### Displayed values and exact source/scope

| Display | Source | Scope / meaning |
| --- | --- | --- |
| Materials awaiting approval | dashboard `workflow.pendingMaterialApprovals` | Selected project; PENDING_VERIFICATION + PENDING_FINAL count; not the current user's approval assignment |
| Overdue material requests | dashboard `workflow.overdueMaterialRequests` | Selected project; required date before server today; excludes DELIVERED/REJECTED/CANCELLED |
| Expenses awaiting approval | dashboard `workflow.pendingExpenses` | Selected project; PENDING_APPROVAL records |
| Average of reported stages | dashboard `progress.overallPercentage` | Mean of latest reported stage values, explicitly not overall project completion; zero reported stages is “No updates” |
| Recent approved gallery entries | dashboard `gallery.recentUpdates` | Selected project; approved entries since midnight seven days ago in server reporting timezone |
| Pending queue total | Materials/Expenses list `pagination.total` | Exact status and selected project, independently loaded; five returned records maximum per preview, never treated as the total |

All finite non-negative count zeros remain genuine zero. Null, missing or invalid counts render Unavailable. Failed requests hide stale metrics/records rather than falling back to zero. Dashboard timestamp and daily reporting timezone (Asia/Calcutta, from current API source) are visible. No organization-wide, combined approval, financial or attendance total is invented.

### Implementation

- Dashboard: shared PageHeader, explicit project selector, real pending queues first, safe live summary cards, server-provided shortcuts intersected with effective read/write grants, and loading/error/empty/denied/unavailable recovery. Pending verification, final approval and expense records link to actual existing detail routes; full-queue links use supported status query filters. List actions remain on each record's authorized detail page.
- Query keys include user, organization, project and effective permission signature. GET requests use abort signals, no cross-context placeholder data and no automatic retries. Dashboard and pending record responses are checked against the expected context. Overview refresh invalidates both aggregates and pending queues for only the selected scope.
- Shared `project-navigation.ts` and `ProjectWorkspaceNavigation` are consumed by Dashboard and the existing Phase 2 Project Detail. Project Detail's title, editor and lifecycle groups remain intact; Team return context is preserved. Read-only Sales links remain available with appropriate lead-read grants; archived project navigation retains record access while server-suggested creation shortcuts are hidden.
- Sidebar retains a validated explicit project when moving among operational modules, shows that project's name/archive context, respects its effective permissions, and highlights the operational destination without also highlighting Projects as a duplicate active item. It does not persist or mutate a user's default project. Suspense contains the new URL search-parameter consumer.
- Added development-only `foundation-preview?phase=3` with real presentation components and clearly labeled synthetic data for long names, nullable/zero metrics, partial queues, errors, empty queues, restricted grants and archived action checks. It has no operational writes and is unavailable outside development.
- No API/Mobile/database/dependencies, commits, pushes or deployments. Earlier phases and unrelated Materials changes are preserved.

### Verification and remaining gates

- Nineteen focused tests passed: seven Phase 3 tests plus twelve Workers/Projects regression tests. Covers missing-versus-zero values, hidden unsupported aggregates, permission ceilings, archived action suppression, tenant/project/user/cache isolation, wrong queue/status rejection, scoped navigation and read-only Sales routes.
- Final full Web TypeScript and focused ESLint: passed (exit 0). Initial verification caught a union-array generic inference issue in the shared queue validator and two lint issues; these were corrected without changing business behavior.
- Browser: development fixture verified at 360px and 1366px viewport widths without horizontal document overflow. Confirmed real zero versus unavailable presentation, server-total preview wording (1 of 31), empty/error queues, archived write-shortcut suppression, and restricted Materials-only navigation/metrics. Initial navigation timed out but the page subsequently loaded. These are synthetic presentation checks, not authenticated API acceptance. Actual /dashboard redirected to /login; authenticated role/data/switching/detail journeys remain pending. Earlier phase fixture checks are not claimed as Phase 3 evidence. Native zoom and runtime reduced-motion acceptance remain open.
- Still required: authenticated dashboard/API results and owner/supervisor/contractor/sales/CUSTOM matrices; project and organization switching/back/refresh; permission removal while requests are in flight; actual pending-record detail links, archived/read-only paths and authoritative module totals. No credentials or operational mutations are authorized by fixture verification.
- Backend gaps: primary/calendar-aware Attendance aggregates, aligned Kharchi outstanding and wage semantics, optional organization portfolio aggregation, and per-user actionable approval responsibility. API dashboard failure remains independently recoverable from the pending-record previews. No backend work was started.

Changed groups: `features/dashboard/`; shared Project navigation helper/component and Project Detail consumer; `components/common/sidebar.tsx`; Phase 3 development fixture/route; this plan/current-task/progress ledger. Next phase is Phase 4 (Wages and Kharchi), only on explicit instruction.


## Phase 4 implementation and evidence — 2026-09-23

Status: Web Phase 4 implemented. Existing API, shared financial contracts, Mobile, migrations and calculations remain unchanged. Stop before Phase 5.

- EXISTING: Wages API and Web already offered period preview, readiness, batch confirmation, saved multi-rate item breakdown, partial payments, adjustments, cancellation before payment, and uncertain-payment retry with original payload/key. Kharchi already represented paid advances, immutable signed corrections, allocation reversals and server-owned balances. These financial rules remain authoritative.
- NEEDS_CHANGE, implemented: Wages now labels its four stages clearly. Period dates are described as calculation inputs, not confirmed-batch filters. Preview table distinguishes payable days, period rates and readiness. Confirmation explains the saved snapshot; confirmed item detail labels saved rate periods and separates gross, deduction, adjustment, net payable, paid and remaining. Batch list/detail also distinguish net payable, paid and remaining. Current or scheduled Worker rates are never substituted for saved batch rates.
- NEEDS_CHANGE, implemented: Kharchi list uses the shared collection toolbar/filter drawer. Search and applied filters remain independent of financial writes; drawer Reset only changes the draft, Apply validates date order, and Clear all resets applied filters. Summary explicitly states that the API includes only worker/assignment/paid-date filters, while list and CSV also use search/status/method/sort. Correction and deduction reversal history remains visible on advance detail.
- NEEDS_CHANGE, implemented: permitted Worker context, Attendance, assignment Kharchi ledger, advance correction history and exact Wage batch/item links connect existing records. Wage direct links validate UUID parameters and still pass through effective project access. Kharchi only shows the Wage link with `wages:read`; Worker/Attendance links are separately gated. No new API relationship or computed allocation is inferred.
- EXISTING safeguards retained: workspace-scoped cache disposal, effective/CUSTOM project grants, archived read-only state, payment attempt retention, Kharchi idempotency and uncertain-result recovery, cancellation/payment history restrictions, immutable correction/reversal rows and paise-safe server balances. No real payment or database write was run.
- Verification: Web TypeScript and focused ESLint passed. Fourteen focused Wage/Kharchi tests passed, including multi-rate saved-label, payment-state and batch/item deep-link cases. The development-only synthetic fixture at `/foundation-preview?phase=4` covers period and saved financial detail plus the shared filter drawer. Browser checks passed at 360px and 1366px with no horizontal document overflow; the fixture showed separate net, paid and remaining values and multiple saved rates. Closing the drawer discarded a draft status, while Apply persisted it. The actual project Wages route redirected to `/login`. This is presentation evidence, not authenticated financial acceptance.
- Contract limit: saved rate breakdown items expose a rate, day counts and gross amount, but no effective date boundaries per rate. Web labels the ordered rate periods without inventing dates; a dated breakdown requires an API contract change.
- Acceptance still open: authenticated role/project data, actual batch/item deep links and corrections, cross-client parity, real financial write recovery, native zoom/keyboard and runtime reduced-motion checks. These need an authorized signed-in environment and approved test data; do not treat the synthetic fixture as financial runtime evidence.

Changed groups: `features/wages/`, `features/kharchi/`, shared `collection-toolbar.tsx`, Wages route, development fixture/route and task docs. Next is Phase 5 (Materials and Expenses), only on explicit instruction.

## Phase 5 implementation and evidence — 2026-09-23

Status: Web Phase 5 implemented. API, database, Mobile and shared business contracts remain unchanged. Stop before Phase 6.

- EXISTING: Materials already has request/purchase/delivery history, quantities and costs; the in-flight two-mode policy retains DIRECT and FINAL_APPROVAL plus historical statuses. Owner self-request and delegated final decisions remain API-owned. Expenses already has original amount, signed adjustments, recognized cost, immutable history and server-derived `availableActions`. Both modules use effective project permissions, idempotency/version checks and deliberate uncertain-write recovery. Phase 5 preserves those flows and the existing uncommitted Materials approval work.
- NEEDS_CHANGE, implemented: Materials and Expenses lists use the shared search plus draft/apply/reset filter drawer. Export and summary continue to receive applied queries. List detail links carry the applied search/filter/page state; detail back links validate same-project/module paths. The list labels status and next step without claiming that a list row exposes server `availableActions`.
- NEEDS_CHANGE, implemented: Materials detail leads with current state and API-permitted actions, then requested/ordered/delivered/outstanding quantities. Approval is explicitly separate from ordering and delivery. Expense detail leads with current state and API-permitted actions, while original/adjustment/recognized figures remain separate. Timeline, purchase/delivery and adjustment evidence remain visible. Revision IDs and timestamps move into secondary metadata.
- Supported contextual links go to the **project** Materials or Site Expenses listing only when the effective read permission is present; neither record exposes an automatic cross-module link. No receipt/challan attachment link exists in the current contracts. The UI does not imply that an order creates an expense or that payment evidence is available.
- Verification: Web TypeScript and scoped ESLint passed; sixteen focused Materials/Expenses/return-path tests passed; `git diff --check` exited 0 (line-ending warnings only). Development-only `/foundation-preview?phase=5` rendered both list patterns at 360px and 1366px without horizontal overflow. Closing the Materials filter drawer discarded its draft; applying the same status showed one active filter. The Expenses drawer showed its status/category/payment/date/sort controls. The real project Materials route redirected to `/login`; these are synthetic presentation checks, not authenticated API or financial-write acceptance.
- Acceptance still open: signed-in Owner/delegate/CUSTOM and read-only matrices; Direct versus Final request creation and pending responsibility; real purchase/delivery and expense adjustment histories; stale revision, uncertain-write and project/organization switching recovery; long content at native 200% zoom, full keyboard and reduced-motion checks. No production business record was mutated.

Changed groups: `features/materials/components/`, `features/expenses/components/`, financial return helper/tests, development fixture/route and task docs. Next is Phase 6 (Progress, Gallery and Calendar), only on explicit instruction.

## Phase 6 implementation and evidence — 2026-09-23

Status: Web Phase 6 implemented. API, database, Mobile and shared business contracts remain unchanged. Stop before Phase 7.

- EXISTING: Progress already has nine API-owned equal-weight stages, immutable update history, nullable first-update baseline, filtered history/export, and safe conflict/idempotency recovery. Gallery already has authenticated private media, month/day grouping, caption and stage tags, durable user/organization/project-scoped upload queue, explicit uncertain retry, and legacy review support. Calendar already has effective project/organization/weekly precedence, timezone/date-only handling, working-week setup, selected day, and guarded override editing. These behaviors remain intact.
- NEEDS_CHANGE, implemented: Progress history and Gallery collection fields use the shared drawer with draft/apply/reset semantics. Applying a filter resets pagination and retains unrelated URL context; existing deep links parse the same query keys. Progress stage cards are read-only current-state summaries with explicit Not updated/In progress/Complete labels. History keeps prior/current percentages, actor, date, correction note and immutable ordering. Gallery cards allow long captions to wrap, retain grouped capture dates and private media recovery, and move file/review metadata behind a disclosure in the photo dialog.
- NEEDS_CHANGE, implemented: a permission-gated project activity navigation connects Progress, project Gallery, Work Calendar and Attendance. Calendar's month/day navigation and all working-week/override editing inputs remain with the calendar task, outside collection filters. Cross-module navigation carries a same-project return destination; invalid/foreign destinations are ignored. A selected calendar date scopes the Attendance destination. Existing Attendance navigation also exposes permitted project Progress and Gallery destinations.
- Contract limits: Progress updates have no linked Gallery entry/evidence field; Gallery stage tags do not identify a specific Progress update. Links therefore say **project gallery** or **project progress** and do not claim record-level evidence. Active Gallery uploads publish immediately; pending-review count is labeled as legacy compatibility state. No new upload, image access, approval or attendance derivation contract was introduced.
- Verification: full Web TypeScript and scoped ESLint passed; 21 focused Progress/Gallery/queue/activity-query tests passed, including Asia/Kolkata capture-day grouping, filter page reset, same-project return validation, private-media access, queue isolation and uncertain retry. `git diff --check` exited 0 with line-ending warnings only. The development-only `/foundation-preview?phase=6` fixture was added for visual checks, but the local dev-server approval was rejected, so no Phase 6 browser result is claimed. Prior phase browser evidence is historical only.
- Acceptance still open: real signed-in Owner/Supervisor/Contractor/Viewer/CUSTOM project journeys; populated and empty/error Gallery and Progress lists; drawer keyboard/reflow/zoom and grouped media/long captions in browser; Calendar non-working and selected-date navigation; private media and upload queue recovery in a configured authenticated environment; cross-client acceptance. No production write was run.

Changed groups: `features/progress/components/progress-page.tsx`, `features/gallery/components/`, Calendar and Attendance navigation consumers, shared activity filters/query/navigation, development fixture/route and task docs. Next is Phase 7 (Sales workflows), only on explicit instruction.

## Phase 7 implementation and evidence — 2026-09-23

Status: Web Phase 7 implemented. API, database, Mobile and shared business contracts remain unchanged. Stop before Phase 8.

- EXISTING, preserved: project-effective and own/team/all visibility; lead stage and assignee permissions; API-owned visit outcomes, unit availability/expiry, interest and exclusive hold rules, booking conversion/cancellation, and exact uncertain mutation retry behavior.
- NEEDS_CHANGE, implemented: Leads, Follow-ups, Site Visits, Inventory and Bookings use the shared search/filter drawer with draft/apply/reset and visible project/date scope. Search and filter state stays in list URLs; applying filters resets pagination where present. Detail links and related record links carry validated same-project return context. Sales sibling navigation has a visible selected tab. Lead detail puts customer contact/owner and permitted next actions before preferences/history; unit and booking details separate current facts, related records and administrative actions. Visit detail retains matching-list filters.
- Status semantics: Available uses success; Booked/Sold uses purple; High Intent and Selected use active; pending/scheduled states use info; blocked/waitlisted/unavailable use warning; cancelled/lost/missed use danger. Text labels remain alongside color. No availability or stage is inferred by the client.
- Contract limits: Lead API has no next scheduled follow-up field on the lead detail response; the follow-up list exposes due time and API status. Site Visits have no standalone record route and use the existing `visit` query on the list. Inventory list has server search/status filtering; visit search is clearly labeled as applying to retrieved results. No new record-level relationship was invented.
- Verification: full Web TypeScript, scoped Sales ESLint, and 19 focused Sales behavior tests passed, including timezone conversion, ownership, conversion eligibility, exact uncertain retry, status meaning, filtered return, and rejection of foreign destinations. A development-only `/foundation-preview?phase=7` synthetic fixture was added for visual review. No local server listened on ports 3000–3002, and the earlier Phase 6 request to start one was rejected, so no current browser result is claimed.
- Acceptance still open: signed-in Owner/Sales User/CUSTOM project flows; list and detail populated/empty/error/read-only states; narrow/desktop/zoom/keyboard drawer and return behavior; real lead → visit/unit → booking → cancellation in an authorized test environment; cross-client/API concurrency behavior. No production Sales record was created.

Changed groups: `features/sales/components/`, Sales view helper/tests, development fixture/route and task docs. Next is Phase 8 (administration and remaining surfaces), only on explicit instruction.

## Phase 8 implementation and evidence — 2026-09-23

Status: Web Phase 8 implemented. API, database, Mobile and shared business contracts remain unchanged. Stop before Phase 9.

- EXISTING, preserved: Organization Owner invitation/activation, membership roles and project assignments with CUSTOM limits, platform-user versus customer-member distinction, system-role protection and custom grants, recipient-only notification inbox and target reauthorization, profile/password sign-out, application settings, manual subscription/capacity rules, and their existing mutation/permission guards.
- NEEDS_CHANGE, implemented: Organizations, Members, Roles, subscription plans and Notifications use the shared draft/apply/reset filter drawer; Organizations/Roles/Members/plans filter their retrieved lists and say so. The Users list now consumes existing API search, role filter and pagination instead of silently showing only the first page; it includes application identities, while new-user creation is specifically for platform accounts. List/detail and create/detail returns preserve supported URL filters through validated paths. Organization Detail exposes read-only identity/context before editing; a status change has a separate confirmation. Member role and project scope explanations are clearer. User/role, organization/invitation, subscription and shared Project forms have visible labels. Role permission changes, member deactivation and subscription provisioning stay separated from routine information. Subscription state labels distinguish active, pending, suspended and ended access. Settings saves general and outbound-email sections independently, retaining the other section's unsaved draft. Capacity loading/error states are explicit; notification target authorization remains unchanged. Login/activation fields retain their security flow and now have associated labels.
- Contract limits: Users API supports server search, role and page filters but not an active-status filter, so none was added. Organization, Member, Role and plan lists have no server filter/pagination contract in these Web clients; their filters apply to retrieved rows. Notification API supports unread-only and pagination, not search. Subscription date-to-instant interpretation remains the existing browser-local behavior; no billing/date contract was changed. The signed-in session exposes active organization ID/timezone but no display name; Members points to the global organization context rather than inventing one.
- Remaining outside this migration: `/design-system` intentionally remains a reference component gallery with sample cards and the old `FilterBar`; it is not an operational dashboard. Project, Worker, Sales import and account-recovery task fields retain their own workflow inputs, not collection filters. Phase 9 still needs route-wide visual/role acceptance and a consumer check before removing any obsolete primitive.
- Verification: full Web TypeScript, scoped administration/auth/project ESLint and focused administration, Settings, Notifications and project-return behavior tests passed. A development-only `/foundation-preview?phase=8` synthetic fixture was added. No local server listened on ports 3000–3002 and the earlier server-start approval was rejected, so no Phase 8 browser result is claimed.
- Acceptance still open: signed-in platform-admin and customer-role/CUSTOM journeys, creation and access-change safeguards against a configured test environment, list/detail/back and drawer keyboard/reflow/zoom checks, subscription date/timezone interpretation, notification target revocation at runtime, and cross-client behavior. No real role grants, billing, passwords, organizations or members were changed during verification.

Changed groups: `features/administration/`, Organizations/Members/User Management/Notifications/Profile/Settings/Subscriptions, shared Project form, auth labels, development fixture/route and task docs. Next is Phase 9 (app-wide acceptance and consolidation), only on explicit instruction.

## Phase 9 route audit and consolidation — 2026-09-23

The [Phase 9 acceptance record](web-ux-phase9-acceptance.md) accounts for all 54 protected app routes, four auth routes, the root redirect and two preview routes. Four persona paths were traced through source and behavior tests; they have not been executed with signed-in Builder, Contractor, Supervisor or Sales accounts. The unused `ResponsiveFilterBar` duplicate was removed after a consumer search; the design-system `FilterBar` retains its intentional gallery consumer. Three test-harness variable names were corrected so whole-Web lint passes.

Fresh verification: full Web type-check, lint, production build and all 119 Web behavior tests passed; `git diff --check` passed. A later local, API-isolated browser pass checked phase 2–8 synthetic fixtures across laptop, tablet and narrow reflow widths, shared filter interaction, read-only/restricted fixture states, and signed-out navigation. The Administration fixture now reflects applied filters; Worker Detail now passes the existing API-supported `workerId` filter to Kharchi. Real 200% zoom, reduced motion, live-role, organization/project isolation and mutation acceptance remain open without an authorized signed-in test environment. Preserve the phase as partially browser-verified, not role-accepted. No later phase was started.
