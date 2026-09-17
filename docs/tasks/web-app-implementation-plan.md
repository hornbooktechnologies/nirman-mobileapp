# Web App Module Completion Plan

## 1. Status and objective

- W3 Materials: implemented in source; focused verification and whole-Web baseline blockers are recorded in [W3 Materials parity](web-w3-materials-parity.md). Authenticated/browser/cross-client acceptance remains pending.

- W2 Kharchi: implemented in source; focused tests passed, whole-Web and authenticated acceptance limitations are recorded in [W2 Kharchi parity](web-w2-kharchi-parity.md).

- Status: W1 Wages implementation completed in source; verification and pending acceptance are tracked in [W1 Wages parity](web-w1-wages-parity.md). Other slices retain their recorded status.
- Workers W1: implemented in source with a detailed rate-history API limitation; see [W1 Workers parity](web-w1-workers-parity.md). All verification was explicitly skipped for this task.
- Calendar/Attendance W1: parity additions implemented in source; see [W1 Calendar and Attendance parity](web-w1-calendar-attendance-parity.md). Verification was explicitly not run; modules are not verified or accepted. Current API locked-period correction remains unsupported.
- Date: 2026-09-17.
- Target: `apps/web` in the application monorepo, not the separate marketing website.
- Objective: bring Web to functional parity with implemented Mobile workflows using the same backend, with a modern, readable, reusable desktop interface.
- Baseline: current working tree, including existing uncommitted work. Recheck each module at the start of its slice.

## 2. Product Owner directions

1. Web is English-only. Do not introduce translation resources, language selectors, or localization dependencies.
2. Existing API endpoints, DTOs, shared types/constants, and current Mobile behavior provide the integration specification. Do not create new business contracts or repeat contract approval for API-ready modules.
3. Preserve identical business functionality across clients: allowed actions, required inputs, permissions, statuses, calculations, validation rules, history, and results. Desktop composition and interactions may differ.
4. Use `ui-ux-pro-max` throughout UI planning and implementation, filtered through NirmanSite's existing design rules and tokens.
5. Default implementation scope is Web and its documentation. Do not change API/backend, database, migrations, seeds, or Mobile for convenience. A demonstrated Web requirement that cannot be met by the current API must be recorded with the exact endpoint/behavior, user impact, and smallest proposed change before backend work is explicitly authorized.
6. This request authorizes preparation of the plan. It does not mark its implementation slices complete.

These directions supersede older recommendations to limit Web to a subset of Mobile actions or to add Web localization. Existing business rules remain authoritative; if Mobile contradicts the API, document the discrepancy and resolve it instead of reproducing a client bug.

## 3. Inputs and verified baseline

Inputs: `MVP_REQUIREMENTS.md`, `CODEX.md`, `docs/architecture/frontend.md`, `docs/architecture/auth-rbac.md`, `docs/decisions/003-design-system-direction.md`, the existing technical-plan template, module index/current-task/progress records, API controllers and module registration, shared contracts, Mobile feature services/screens, Web routes/features/navigation/auth provider/theme.

| Area | Source baseline | Planned treatment |
| --- | --- | --- |
| Auth, account security, organizations, members, projects, team | Existing Web UI and API integration | Preserve and regression-test; improve shared context and permission presentation where required |
| Workers, Calendar, Attendance | Existing Web integration | Close Mobile parity gaps, especially primary-project periods and onboarding dates |
| Wages | Existing preview, batches, payments, adjustments, export | Add cancellation and current financial detail/history parity |
| Subscriptions | Plan creation and organization assignment exist | Complete existing plan-edit endpoint integration and action permissions |
| Dashboard | Sample metrics and project/approval fixtures | Replace production fixtures with the existing role dashboard API |
| Kharchi, Materials, Expenses, Progress, Gallery | API and Mobile exist; Web features absent | Implement Web services, hooks, routes, pages, actions, and acceptance coverage |
| Sales | API/Mobile cover leads, activities, follow-ups, visits, inventory/import, interests/holds/blocks, bookings | Implement as one Sales feature with bounded sub-slices |
| Notifications | In-app API and Mobile exist | Implement Web inbox, badge, read operations, and authorized navigation |
| Reports/audit/bulk Worker import | No complete general API/UI flow established by audit | Keep separate from API-ready delivery; do not fabricate endpoints or block core modules |

Fresh checks from the initial audit: Web type-check passed; lint reported three `react-hooks/set-state-in-effect` errors in Organization Detail, Project Detail, and Settings. No Web test files were found. Browser workflows and API runtime acceptance were not performed by this audit. Endpoint existence means source-ready, not runtime-accepted.

The module index contains stale statuses, including Materials and some foundation modules. Source verification takes precedence when identifying what needs implementation.

## 4. Meaning of functional parity

For every slice, record a compact checklist in its implementation/review notes with: Mobile screen/action, API method/path, request fields, response fields used, required effective permissions, Web route/action, and test evidence. This is a traceability checklist, not a new contract.

Required parity:

- List/filter/search and supported pagination, detail views, create/edit/actions, configured workflow settings, immutable history, and API-supported exports.
- Same server-calculated money, balances, derived attendance, rates, progress, and status transitions. No independent financial formulas in Web.
- Same date boundaries and organization working timezone; use `en-IN` formatting and INR presentation without converting date-only values through UTC accidentally.
- Same authorization, assignment eligibility, self-approval restrictions, correction/cancellation reasons, conflict handling, and retry semantics.
- Creation in Web is visible in Mobile after refresh, and vice versa; transitions performed in either client yield the same server state.
- Server-derived `availableActions`, versions, and permissions drive actions where supplied. Preserve idempotency keys through uncertain retries; do not automatically retry unsafe mutations.

Platform adaptations:

- CSV sharing becomes an authenticated browser download.
- Gallery uses browser file selection and camera capture where supported. Validate the current API's supported media types and limits; do not promise unsupported video or file types.
- Gallery queue parity includes queue status, retry, and restart recovery using browser storage for supported files. Keep queued media scoped to user/organization/project, handle storage quota failures, and clear sensitive queue state on sign-out. Offline capture/queueing must not imply server approval or successful upload.
- Notifications inbox behavior is in scope. Expo push registration supports Android/iOS only; browser push requires a separate backend capability and is an explicit platform gap, not a completion claim.
- General offline financial/operational writes remain deferred wherever Mobile/API also defer them.

## 5. UI design rules

Use the existing Manrope font, semantic theme from `packages/shared/src/theme`, Web token adapter, NirmanSite logos, warm surfaces, olive/coffee text, and restrained copper/saffron actions. Prefer soft panels, clear spacing, subtle borders, and one primary action per task. No new brand palette, decorative dashboard hero, fabricated metrics, or chart without useful available data.

The `ui-ux-pro-max` design-system search returned useful minimal/functional styling but mismatched marketing-hero and decorative typography recommendations. Those were rejected. A narrower `data dense dashboard` style search confirmed efficient grids, filters, summaries, clear row highlighting, and operational data visibility; its tiny text and compressed rows are not adopted. Next.js guidance on file routes and reserved loading space fits the repository; its generic Server Actions recommendation does not replace the established NestJS API client.

Readability and accessibility requirements:

- Default body/form text 16px, operational table text 14px minimum, secondary metadata 12px minimum; line-height about 1.5. Never shrink key financial or workflow information to fit.
- Consistent headings, visible field labels, required asterisks, no routine Optional suffix; inline errors connected to inputs and focus moved to the first invalid field when submitted.
- Normal text contrast at least 4.5:1; large text and meaningful control boundaries at least 3:1. Status uses text/icons as well as color.
- Visible keyboard focus, logical tab order, accessible action names, focus trapping/restoration for overlays, Escape behavior, and announced asynchronous results.
- Target 44px controls for touch use. Responsive layouts at 375, 768, 1024, 1440, and 1920px, plus 200% zoom. Avoid page-level horizontal scrolling; genuine comparison tables may use a labelled contained horizontal scroller with clear overflow indication.
- Keep compact summaries above collections. Use tables for comparisons and financial rows; use cards/list layouts for tasks and narrow viewports; use a thumbnail grid for Gallery. Detail views expose the full history without overloading list rows.
- Short forms in a drawer/dialog, complex workflows in a dedicated page. Preserve unsaved input on validation/server failure and confirm navigation that would discard changes.
- Loading, refreshing, empty, filtered-empty, permission-denied, archived-project, stale-record, failed/retry, submitting, and success states are required. Reuse the finalized loader and reserve layout space.
- Restrained transitions, roughly 150–250ms where useful, reduced-motion support, no layout animation that delays repeated operational actions.

## 6. Reusable Web architecture and navigation

Retain Next.js App Router, React Query, the existing API client, and thin route files. Feature ownership stays under `apps/web/src/features/<module>/{components,hooks,services,types}`. Prefer shared domain imports; when API types are not exported centrally, define a typed Web adapter matching the existing DTOs without changing API/shared contracts solely for code organization.

Extend the existing `components/ui` and `components/common` before introducing another component family. Audit `src/design-system` and `src/design-preview` for useful overlap, but keep fixtures out of production imports. Extract only repeated presentation or client mechanics; keep module transitions and validation mapping in the owning feature.

Planned reusable pieces, only where existing components need extension:

| Concern | Shared Web responsibility |
| --- | --- |
| Workspace context | Authorized organization/project selector; route resolution; project status and effective permission access |
| Operational page | Heading, context, primary action, summaries, filter toolbar, collection, pagination |
| Collections | Search, supported filters/sort, URL state, accessible responsive table/list, stable row actions |
| Forms | Label/error/help wiring, searchable entity selector, date/money fields, submit state, confirmation |
| Details | Metadata sections, money breakdown, event timeline, server-authorized action bar |
| Requests | Scoped query keys, stable idempotency key lifecycle, conflict recovery, mutation feedback |
| Files | Authenticated download/upload and private media preview with object-URL cleanup |

Navigation groups: Main (Dashboard, Notifications); Workforce & Finance (Workers, Work Calendar, Attendance, Wages, Kharchi, Expenses); Project Operations (Projects, Materials, Progress, Gallery); Sales (Leads, Follow-ups, Site Visits, Inventory, Bookings); Organization (Members, applicable organization administration); Platform Administration (platform-only Users, Roles, Organizations, Subscriptions, Settings); Account (Profile/security, Sign out).

Project Team remains reachable from Project Detail. Show only authorized entries, including effective CUSTOM project restrictions. Complete readable labels for all existing permission groups in the project permission editor.

Route convention: new project modules use `/projects/[id]/<module>` and stable detail IDs; retain existing Attendance/Calendar/Workers routes and supported query links. Sales subroutes use `/projects/[id]/sales/...`; Notifications is organization/user scoped at `/notifications`. Dashboard remains `/dashboard` with explicit selected-project context. Resolve organization from authorized session/access data; never trust an arbitrary URL identifier. Deep links must validate access before fetching protected records. Switching project clears incompatible selections and does not redirect unsaved work silently.

## 7. Security, correctness, and scalability

- API remains the authorization authority. Mirror effective project access and action permissions in Web; a hidden menu or organization-level permission alone is insufficient.
- On organization/project/user changes, scope or clear cached records, cancel obsolete requests, and prevent stale responses from rendering under another context. Query keys include organization, project, record, and applicable filters; clear sensitive cache on sign-out.
- Follow current token/refresh-cookie handling; never put credentials in URLs, exported files, logs, or analytics. Render notes and filenames as text, not untrusted HTML.
- Private Gallery assets remain authenticated. Validate file size/type before upload, handle server rejection, and revoke preview object URLs.
- Disable duplicate submissions while pending. Retain logical mutation keys where supported; on conflicts reload current data, explain changes, and require a deliberate resubmission.
- Use API pagination/search/filter capabilities where available. Do not assume every endpoint supports pagination or global search. For unpaginated endpoints, document practical limits; client filtering applies only to the retrieved dataset. Large-data gaps may justify a separately recorded backend request.
- Debounce search, avoid per-row network requests, use bounded foreground refetch, invalidate related summaries after successful mutations, and lazy-load heavy media/import views. Do not fetch every project to simulate organization-wide reports.
- Do not add a dependency until existing components/browser APIs are insufficient and the need is recorded. No duplicate API client, global business-rule engine, or backend proxy layer.

## 8. Ordered implementation slices

The table describes the full planned scope. The W1 Workers subset is implemented in source with verification intentionally unrun and a rate-history read API limitation; see [Workers parity](web-w1-workers-parity.md). The W1 Wages subset has been implemented; see its linked verification checklist above. Calendar/Attendance parity additions are implemented in source with verification explicitly unrun; see [Calendar and Attendance parity](web-w1-calendar-attendance-parity.md). Other W1 modules and slices are not marked complete. Each includes its UI, API integration, error/permission states, and focused verification before the next slice. No new business contract is required.

| Slice | Deliverable and functionality | Main acceptance evidence |
| --- | --- | --- |
| W0 | Web foundation: context/permission resolution, navigation, shared page/form/detail patterns, readable tokens/components, three baseline lint fixes | Context switch cannot leak stale data; CUSTOM permissions work on direct URLs and actions; representative list/form/detail responsive previews |
| W1 | Existing-module parity: Worker primary-project periods (list/create/correct/end), actual onboarding start date, assignment/rate history; Calendar/Attendance correction/export parity; Wage cancellation, cancellation reason/read-only state, rate breakdown, Kharchi allocation/reversal and payment history; Subscription plan edit and action guards | Same period/rate/payment/cancellation outcomes as Mobile; paid batch cannot cancel; cancelled batch cannot offer edit/payment; existing auth/member/project flows pass regression checks |
| W2 | Kharchi: filtered list, summary, eligible worker selection by date/assignment, record advance, detail/ledger, immutable corrections, recovery/remaining balances, CSV | Advance recorded on one client visible on the other; eligibility and over-correction errors handled; no invented approve/pay workflow absent from current API |
| W3 | Materials: settings, list/summary, request create/edit/draft/submit, verify/return/approve/reject/cancel, split purchases, partial deliveries, timeline, CSV | DIRECT/FINAL_APPROVAL/VERIFY_THEN_FINAL actions match API; self-approval, quantity, stale-version and retry cases covered; no automatic Expense creation |
| W4 | Expenses: workflow settings, list/summary/export, draft/create/edit, submit/approve/reject/cancel, immutable signed adjustments, detail/history | DIRECT versus APPROVAL_REQUIRED parity; rejected resubmission; approved record correction via adjustment; no client-side recognized-cost authority |
| W5 | Progress: summary, all canonical stages, stage/date history filters and pagination, update with regression note, CSV, existing authorized portfolio endpoint | Server percentage and untouched-stage behavior match Mobile; conflicting updates and regression-note validation covered |
| W6 | Gallery: grouped thumbnails, filters, summary, private full-image detail/metadata, browser capture/file upload, queue/retry/restart recovery, approve/reject/direct-publish states | Private media access, upload failures, duplicate retry, queue isolation, unsupported file/quota errors, and cross-client review states verified |
| W7a | Sales Leads and activity: list/filter/detail/create/update, assign/reassign, activities/timeline, follow-ups and statuses | Own/team/all visibility; assignment changes; follow-up create/update and terminal behavior match API/Mobile |
| W7b | Site Visits: schedule/list/filter/reschedule/outcome including attendee count, feedback, objections, next action | Same permitted statuses and immutable terminal outcomes; correct working timezone and own-salesperson scope |
| W7c | Inventory: unit list/detail/create/edit, total/per-area pricing, CSV preview/validation/import, lead interests, hold request/decision, direct block/release/expiry | Concurrent holds handled using server results; preview errors preserved; no unsupported bulk actions or client-authoritative availability |
| W7d | Bookings: list/filter/detail, lead conversion with or without a unit, stable retry key, cancellation and restoration/history | Booking retries do not duplicate; cancelled booking yields the same Lead/Unit state across clients |
| W8 | Notifications: inbox, unread filter/count, mark one/all read, navigation to exact authorized record, inaccessible/deleted target handling | User-specific inbox, organization switch isolation, read-count synchronization, working target links; no browser push claim |
| W9 | Live Dashboard: role-specific project aggregates, permission-filtered sections, attention items, finance, progress, sales, server-derived quick actions | Remove production sample data; Owner/Contractor/Supervisor/Sales/Viewer cases; forbidden sections absent; all links target completed features |
| W10 | Whole-Web acceptance and handoff: cross-client flows, permissions, security/context isolation, accessibility, responsive and representative volume checks | All parity checklist rows evidenced or explicitly listed as unresolved; no partial module labelled complete |

W1 financial work depends on the already-existing backend Kharchi integration, not on W2's Web screen. Dashboard integration is last so its operational destinations work. An earlier Web preview may show truthful loading/empty states, but never substitute invented business numbers.

## 9. Module reference and file map

| Feature | Mobile reference | API source | Web target |
| --- | --- | --- | --- |
| Workers/Wages | `apps/mobile/src/features/workers`, `wages` | `apps/api/src/modules/workers`, `wages` | Extend existing `apps/web/src/features/workers`, `wages` |
| Calendar/Attendance | `apps/mobile/src/features/calendar`, `attendance` | Matching API modules | Extend existing Web features |
| Kharchi/Materials/Expenses | Matching Mobile feature folders and services | Matching API controllers/DTOs/services | New matching Web feature folders and project routes |
| Progress/Gallery | Matching Mobile feature folders, Gallery `queue.ts` | Matching API modules | New Web features; browser-specific media/queue adapter |
| Sales | `apps/mobile/src/features/sales`, including `unit-import.ts` | `apps/api/src/modules/sales` | `apps/web/src/features/sales`, split components/hooks by entity |
| Notifications | `apps/mobile/src/features/notifications`, including routing | `apps/api/src/modules/notifications` | New Web feature, top-bar badge and authorized target resolver |
| Dashboard | `apps/mobile/src/features/home/services.ts` and current dashboard consumers | `apps/api/src/modules/dashboard` | Replace existing Web dashboard fixtures with typed service/hooks |
| Subscriptions | Existing Web administration | `apps/api/src/modules/subscriptions` | Extend existing Web service/hooks/forms |

Primary shared implementation files: `apps/web/src/config/navigation.ts`, `providers/auth-provider.tsx`, `components/common`, `components/ui`, `theme/tokens.ts`, and scoped CSS. Adapt existing project-access hooks before adding a second context system. Do not copy React Native components into Web.

For API discovery, project modules generally use `/organizations/:organizationId/projects/:projectId/<module>`, Sales nests entities under `/sales`, Notifications uses `/organizations/:organizationId/notifications`, and Progress additionally exposes the organization portfolio. Resolve the exact verbs, payloads, enums and query support from current controllers and Mobile services at slice start.

## 10. Verification and definition of done

Run Web type-check and lint for each slice; run a production build at foundation and integrated delivery milestones, and after routing/build-sensitive changes:

```text
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/web lint
pnpm --filter @nirman-app/web build
git diff --check
```

Add focused tests for context isolation, permission-dependent actions, financial/retry/conflict orchestration, CSV mapping, and queue recovery where risk warrants them. Establish an appropriate Web test mechanism during W0 using existing repository tooling where possible. Do not write superficial tests that only assert component markup.

Browser checks per module: happy path, denied direct route/action, empty/error/retry, expired session, stale version, repeated submission, archived project, relevant dates/amount limits, keyboard operation, focus, zoom, narrow/wide viewports. Use authorized test identities covering Owner, Independent Contractor Owner, Supervisor, Sales, Viewer and CUSTOM restrictions, plus Platform Super Admin separation.

Cross-client acceptance must use deliberate test fixtures: Web create -> Mobile read/action -> Web refresh; Mobile create -> Web read/action -> Mobile refresh. Obtain any needed test credentials/data authorization separately; do not mutate unrelated live business records. Record unrun checks as pending. A type-check or build does not prove authenticated behavior.

Each module is complete only when all implemented Mobile actions in scope have Web equivalents, server results match, permissions and context isolation work, no sample production data remains, required checks pass, and unresolved platform/API limitations are explicit. Finish with a review using the existing review-report template and update the relevant progress records with Web-specific evidence.

## 11. Backend exceptions and deferred work

Not prerequisites for W0–W10: browser push, generalized audit browsing, consolidated organization reports, bulk Worker import, payment gateway/billing expansion, and generalized offline synchronization. Existing per-module CSV exports and the available Progress portfolio are in scope.

If a Web slice exposes an actual backend blocker, capture: reproduction, Mobile comparison, affected endpoint/DTO, why current responses cannot support the required behavior, whether a safe Web solution exists, smallest compatible backend change, and validation needs. Continue independent Web work and present that bounded backend requirement. Do not silently broaden into an API redesign or a database rollout.

## 12. Risks and rollback

Main risks are stale documentation, organization-level checks hiding CUSTOM project grants, missing current Mobile details, cached data crossing contexts, unsupported assumptions about list pagination, and browser differences for media/push. The source parity checklist and per-slice acceptance address these directly.

Deliver bounded Web/documentation commits when committing is authorized. Roll back only the relevant new Web slice while preserving unrelated dirty changes. Existing public routes should remain compatible; introduce redirects if routes move. No database rollback is expected because this plan requires no database change.

## 13. Next execution step

Start with W0, then complete W1 before introducing the missing operational features. There is no outstanding contract or localization decision blocking this plan. Backend exceptions are evaluated only when concrete evidence shows they are required.
