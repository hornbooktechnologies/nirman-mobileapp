# Calendar And Attendance Exception-Model Implementation Plan

## 1. Document Status

- Status: Slices A0, A1, B, C, and C2 complete; authenticated Mobile device/accessibility acceptance remains pending.
- Scope owner: Product Owner.
- Last updated: 2026-08-24.
- Implementation order: contracts/data/API, Web, canonical Mobile integration, then Mobile UX alignment.
- Delivery rule: complete and verify one slice before starting the next slice.

This document is the handoff source for the Calendar and Attendance redesign. A new chat must read this file completely, inspect the current checkout, and work only on the next incomplete slice. Slice C2 Mobile Attendance UX alignment is implemented and statically verified; do not infer authenticated device acceptance or begin Wages, offline sync, or compatibility cleanup from that result.

No migration, seed, database write, dependency change, API change, Web change, or Mobile change is authorized merely by this planning document. Running a migration or seed against any configured database requires separate explicit approval for that target.

## 2. Required Reading For Every Implementation Chat

Read these files before editing:

1. `AI_PROJECT_START_PROMPT.md`
2. `MVP_REQUIREMENTS.md`, especially Attendance and Wages
3. `docs/modules/attendance/CONTRACT.md`
4. this implementation plan
5. `docs/modules/construction/workers/CONTRACT.md`
6. `docs/modules/construction/workers/DECISIONS.md`
7. `docs/modules/foundation/project-access/CONTRACTS.md`
8. `docs/architecture/auth-rbac.md`
9. `docs/decisions/004-database-access-mysql2.md`
10. `docs/tasks/current-task.md`
11. relevant current source for the slice being implemented

When this plan conflicts with the current Attendance sections of `MVP_REQUIREMENTS.md` or `docs/modules/attendance/CONTRACT.md`, the approved decisions in section 4 of this plan are the new product direction. The formal contracts must be reconciled in Slice A0 before runtime implementation.

## 3. Current Checkout Evidence And Conflicts

The current source implements the canonical exception model:

- shared contracts define Attendance summaries, Full-day/Half-day absence exceptions, derived display states, and worker-period detail;
- `apps/api/src/modules/attendance` exposes period summary, exception create/update/remove, export, worker-period detail, and temporary compatibility adapters;
- Calendar owns effective working/non-working dates and Organization/Project overrides;
- Workers owns effective-dated primary Project periods used by historical roster derivation;
- canonical Web routes are `/attendance`, `/attendance/mark`, `/work-calendar`, and the Worker detail Attendance tab;
- protected Mobile routes include `/(app)/attendance`, `/(app)/attendance-mark`, `/(app)/worker-attendance`, and `/(app)/work-calendar`, with canonical summary/exception/worker-period APIs and en/hi/gu resources;
- Mobile Attendance separates period summary, selected-date exception marking, and exact Worker history;
- the original Wages safety gate was retained through Attendance completion; a separately authorized 2026-08-25 Wages slice now consumes the derived Calendar/Attendance model;
- migrations `000` through `008` remain immutable, and migration `009` execution status must be reported from a fresh guarded status check rather than inferred from this document.

Remaining gaps that must be surfaced:

- Mobile UX does not yet match the clarified summary/daily/history separation;
- authenticated Web mutation and Mobile emulator/physical-device acceptance remain unrun;
- screen-reader, large-text, keyboard, rotation/tablet, and fluent Hindi/Gujarati acceptance remain unrun;
- compatibility adapters and legacy `attendance_records` history remain until separately approved Slice D cleanup.

## 4. Approved Product Decisions

### 4.1 Module boundaries

Calendar, Attendance, and Wages are separate modules.

- Calendar owns expected working and non-working dates.
- Worker assignments own which projects a worker is allocated to.
- a primary-project period identifies the one project where default attendance is expected for a worker/date.
- Attendance owns worker-level exceptions from that default.
- Wages will later consume Calendar, primary-project periods, and Attendance through approved contracts.

The modules are interconnected through shared IDs and read contracts, but one module must not absorb another module's configuration, permissions, screens, or lifecycle.

### 4.2 Default attendance

For a date to derive as `PRESENT_FULL_DAY`, all of the following must be true:

1. the effective project calendar says the date is working;
2. the Worker is active for roster purposes;
3. an active Worker assignment covers that date;
4. that assignment is the Worker's primary project for that date;
5. no active Attendance exception exists.

No explicit Present row is created. If all expected Workers are present, the user does nothing. There is no daily approval or confirmation action in this scope.

### 4.3 Attendance exceptions

The first approved exception is absence with a duration:

- `ABSENCE` + `FULL_DAY` derives payable/worked fraction `0`;
- `ABSENCE` + `HALF_DAY` derives payable/worked fraction `0.5`.

The user-facing terms remain `Present`, `Half day`, and `Absent`. `HOLIDAY` is not a worker Attendance status; it belongs to Calendar. `PAID_LEAVE`, overtime, check-in/out, biometric/GPS enforcement, and worker-specific holiday pay are excluded.

Saving an exception is the complete action. No second approval is required. Removing an exception restores the derived Present state.

Reason is optional in this slice. Notes are optional except when a future/approved `OTHER` reason rule requires a note. Do not block an absence because the field user does not yet know the reason.

### 4.4 Calendar behavior

Calendar must avoid daily configuration work.

- an Organization configures its usual working week once;
- Projects inherit the Organization calendar automatically;
- an Organization or Project can add a date or date-range override;
- initial override types are `NON_WORKING` and `SPECIAL_WORKING`;
- a Project override wins over an Organization override;
- an Organization override wins over the weekly pattern;
- festival/site vacations support one date-range entry rather than one entry per date;
- no external holiday API, automatic state calendar, or automatically applied public holiday is included in this implementation;
- holiday suggestions may be designed later without changing the core Calendar ownership model.

If an entire site is closed for Holi, add a Project `NON_WORKING` override. If only some Workers are away while the site works, keep the date working and record Attendance exceptions for those Workers.

### 4.5 Calendar ownership

- Organization Owner, Builder Admin, and Independent Contractor Owner receive default Organization and Project calendar-management capability.
- Project members with Calendar read permission can view the effective calendar.
- Project Manager, Builder Supervisor, Contractor Member, and Site Supervisor do not receive Organization-calendar management by default.
- Project-calendar management for those roles is granted only through an approved role template or Project custom permission.
- Platform Super Admin receives no normal customer Calendar or Attendance permission.

### 4.6 Multiple projects and primary project

- a Worker may have overlapping assignments to multiple Projects;
- exactly one assignment may be primary for a Worker on any date;
- default Present derives only on the primary Project;
- secondary assignments do not create expected Attendance;
- overlapping primary-project periods are rejected transactionally by the API;
- primary-project history must be effective-dated and must not be overwritten by changing a single current flag;
- split-day work across two Projects is deferred. Do not invent a half-day transfer workflow in this scope.

### 4.7 Corrections and locking

Until Wages locking is implemented:

- authorized users may create an exception for an earlier date;
- they may change Full Day to Half Day or the reverse;
- they may remove an incorrect exception and restore derived Present;
- correction actor and timestamps must be retained;
- no Calendar/Attendance lock is enforced by this slice.

The future Wages discussion is expected to decide the final lock behavior. The current working direction, not yet a Wages contract, is:

- before wage confirmation: normal Attendance correction;
- confirmed but unpaid: correction requires wage recalculation/reconfirmation;
- any payment recorded: elevated correction plus financial adjustment, without rewriting paid history.

Do not implement these Wages rules in this plan.

### 4.8 Offline and Wages boundaries

- offline Attendance writes and sync are parked;
- clients must show honest online failure rather than claim a queued or saved offline write;
- Wages calculation, holiday pay, Kharchi deduction, rate history, wage confirmation, payment, and adjustment are excluded;
- existing wage history and payment reads must remain available;
- new wage preview/generation must not silently calculate from the superseded explicit Attendance model. Until the separate Wages redesign is approved, the API must block incompatible new preview/generation with a stable error or an equivalent explicit feature gate. Never return a plausible but incorrect wage amount.

## 5. Target User Experience

### 5.1 Mobile Attendance

Mobile is the primary customer Attendance surface. The clarified flow uses three protected routes:

- `/(app)/attendance` for period summary;
- `/(app)/attendance-mark` for daily exception entry;
- `/(app)/worker-attendance` for one Worker’s dated history.

Opening Attendance must show the currently selected Project immediately. Do not insert a Project-list screen before the Worker list.

The summary screen contains:

- compact Attendance header;
- visible selected Project and shared Project-switch action;
- Start date and End date defaulted to the current month;
- optional link/action to the separate Work Calendar route;
- summary counts;
- Worker search;
- Exceptions only filter;
- virtualized Worker card list;
- permission-aware read-only and mutation states.

Each Worker card shows:

- name;
- worker code and trade;
- expected working days for the selected period;
- present-day equivalent;
- absent-day equivalent, where a Half Day contributes `0.5`;
- `View attendance` action for exact dated details.

The summary header exposes a permission-aware `Mark attendance` action. The daily marking route contains the selected date roster and uses a bottom sheet with shared form primitives:

- selected Worker, read-only;
- selected Project, read-only;
- date, default today;
- Full Day / Half Day;
- optional reason;
- optional notes;
- Save;
- on edit, `Remove exception - worker was present`.

The Worker history route uses the canonical worker-period endpoint and shows period totals plus the newest-first Full-day/Half-day exception list with dates, reasons, and notes. Start with a list; defer a calendar/list toggle until field testing proves it is useful.

Touch targets must meet native platform guidance, adjacent actions need adequate spacing, long lists remain `FlatList`-based with stable keys and memoized card rendering, and errors appear with the affected field plus a general/API error below the sheet heading.

All Mobile copy, status labels, validation, empty/loading/error states, alerts, accessibility labels, and navigation copy must be added in English, Hindi, and Gujarati. Stable API codes and user-entered names/trades/notes must not be translated.

### 5.2 Mobile Calendar

Calendar remains a separate route and feature. It does not become a permanent bottom-navigation item in this slice.

Entry points:

- Attendance header action;
- permission-aware Menu entry;
- a future Project Settings link may reuse the same route.

The first mobile Calendar experience supports:

- view effective working/non-working month;
- read Organization weekly pattern;
- permission-aware Organization weekly setup;
- add/edit/remove Organization or Project date-range overrides;
- clear `Using Organization calendar` inheritance state;
- clear Project-override label.

### 5.3 Web Attendance

Canonical route: `/attendance`.

Add Attendance to the permission-aware left navigation. The page opens the Worker table directly; do not insert an intermediate Project-list page.

Project context:

- Project dropdown in the page header;
- default to the last valid accessible Project where current Web patterns allow persistence;
- reflect `projectId` in the URL query so the view is deep-linkable;
- existing `/projects/[id]/attendance` becomes a compatibility redirect to `/attendance?projectId=<id>`;
- Project Detail/Team may link to the same canonical route.

The summary table defaults to the current month and contains:

- Worker (name, code, trade);
- Working Days;
- Present-day equivalent;
- Absent-day equivalent, where a Half Day contributes `0.5`;
- `View details`, deep-linked to the Worker Attendance tab with Project and period context.

The summary page contains Project, Start date, End date, search, and exception-only filters plus summary cards. Daily mutation is separate at `/attendance/mark`, where Present is derived and users create/edit/remove only Full-day/Half-day exceptions. The existing Worker detail page includes an Attendance tab backed by the worker-period endpoint and displays exact exception dates, reasons, notes, and totals.

### 5.4 Web Calendar

Canonical route: `/work-calendar`.

Calendar is a separate Web route and feature but does not require its own primary left-navigation item initially. It is linked from Attendance and the relevant Organization/Project settings context.

The first Web experience supports weekly-pattern configuration, month viewing, Organization/Project scope, and date-range overrides. It must make inheritance and override precedence explicit.

## 6. Target Data Model

The names below are the intended plan. Before implementation, recheck the next available migration number and current MySQL/MariaDB behavior.

### 6.1 `organization_work_calendars`

One active row per Organization:

- `id`
- `organization_id`
- `timezone`
- `monday_working`
- `tuesday_working`
- `wednesday_working`
- `thursday_working`
- `friday_working`
- `saturday_working`
- `sunday_working`
- `created_by`, `updated_by`
- `created_at`, `updated_at`

Do not silently assume Sunday is non-working. Until configured, API responses must explicitly identify the unconfigured state and clients offer the quick choices `Sunday`, `No fixed weekly off`, or `Custom`.

### 6.2 `work_calendar_overrides`

- `id`
- `organization_id`
- `project_id`, nullable; null means Organization-wide
- `start_date`
- `end_date`
- `day_type`: `NON_WORKING` or `SPECIAL_WORKING`
- `name`
- `reason`, nullable
- `source`: initially `MANUAL`
- `created_by`, `updated_by`
- `created_at`, `updated_at`
- `deleted_at`, `deleted_by`

Validate `end_date >= start_date`. Reject ambiguous conflicting active ranges at the same scope; Project-level ranges may intentionally override Organization-level ranges.

### 6.3 `worker_primary_project_periods`

This is effective-dated primary-project history and remains tied to existing Worker assignments:

- `id`
- `organization_id`
- `worker_id`
- `worker_assignment_id`
- `starts_on`
- `ends_on`, nullable
- `created_by`, `updated_by`
- `created_at`, `updated_at`
- `ended_by`, `ended_at`

The API transaction must lock the Worker's relevant periods and reject overlapping date windows. The referenced assignment must belong to the same Organization/Worker and cover the entire primary period.

Do not replace this with a mutable `is_primary` flag that rewrites historical Project meaning.

### 6.4 `attendance_exceptions`

Only deviations from derived full-day Present are stored:

- `id`
- `organization_id`
- `project_id`
- `worker_assignment_id`
- `work_date`
- `exception_type`: initially `ABSENCE`
- `duration`: `FULL_DAY` or `HALF_DAY`
- `reason_code`, nullable
- `notes`, nullable
- `recorded_by`, `recorded_at`
- `updated_by`, `updated_at`
- `deleted_at`, `deleted_by`
- optional idempotency/client request column may be retained for duplicate protection, but it must not be represented as implemented offline sync.

Enforce one active exception per Organization + Project + Worker assignment + date. The Worker assignment must be the primary assignment for that date and the effective Calendar date must be working.

### 6.5 Legacy Attendance preservation

Never edit or drop the applied `006_attendance.sql` migration.

The expected next migration is `009_calendar_attendance_exception_model.sql`, unless another migration number exists when the slice starts.

Before applying any migration, run a read-only preflight against the explicitly approved target:

- count legacy Attendance rows by status;
- identify Project/date groups containing `HOLIDAY`;
- identify overlapping Worker assignments;
- identify Workers for whom a primary-project period cannot be backfilled unambiguously;
- stop and report if any conversion requires a business guess.

Migration policy:

- preserve `attendance_records` as legacy history during this redesign;
- migrate unambiguous legacy `ABSENT` rows to Full Day exceptions;
- migrate unambiguous legacy `HALF_DAY` rows to Half Day exceptions;
- do not create new rows for legacy `PRESENT` because Present becomes derived;
- do not silently convert worker-level `HOLIDAY` rows into Calendar overrides without validating that the entire Project/date represented a site closure;
- record or report unresolved legacy rows for explicit owner review;
- do not delete the legacy table in this task.

## 7. Shared Contracts And Permissions

Slice A must add platform-neutral Calendar and redesigned Attendance constants/types under `packages/shared`.

Calendar constants:

- `WORK_CALENDAR_DAY_TYPES`: `NON_WORKING`, `SPECIAL_WORKING`
- weekday/working-week contract
- override scope and effective-day response types

Calendar permissions:

- `work-calendar:read`
- `work-calendar:update-organization`
- `work-calendar:update-project`

Attendance constants:

- `ATTENDANCE_EXCEPTION_TYPES`: initially `ABSENCE`
- `ATTENDANCE_DURATIONS`: `FULL_DAY`, `HALF_DAY`
- derived display state type: `PRESENT`, `HALF_DAY`, `ABSENT`, `NON_WORKING`

Attendance permissions remain:

- `attendance:read`
- `attendance:mark`
- `attendance:update`
- `attendance:export`
- keep `attendance:correct-locked` reserved for the later Wages lock contract; do not enforce it in this slice.

Keep deprecated explicit-record types temporarily if required to compile the old Web/Mobile clients during the sequential rollout. Mark compatibility types clearly and remove them only after both clients are migrated.

Add stable error codes for Calendar configuration, invalid ranges/conflicts, missing/overlapping primary periods, non-working dates, invalid exception duration/type, duplicate exception, and the temporary Wages safety gate.

## 8. Target API Contracts

Exact request/response schemas must be written into the formal contracts in Slice A0 before controller implementation.

### 8.1 Calendar

- `GET /organizations/:organizationId/work-calendar`
- `PATCH /organizations/:organizationId/work-calendar`
- `GET /organizations/:organizationId/projects/:projectId/work-calendar?startDate=&endDate=`
- `POST /organizations/:organizationId/work-calendar/overrides`
- `POST /organizations/:organizationId/projects/:projectId/work-calendar/overrides`
- `PATCH /organizations/:organizationId/work-calendar/overrides/:overrideId`
- `PATCH /organizations/:organizationId/projects/:projectId/work-calendar/overrides/:overrideId`
- `DELETE` equivalents for soft-removing an override

All routes enforce active Organization membership, tenant ownership, Project access where relevant, and the matching `work-calendar:*` permission.

### 8.2 Primary project periods

Keep this behavior in the Workers module because it owns allocation:

- list a Worker's primary-project periods;
- create/update/end a primary period using `workers:assign-project` plus Project access;
- reject a primary period outside the referenced assignment window;
- reject date overlap with another primary period;
- return stable conflict errors rather than silently selecting a Project.

### 8.3 Attendance

- `GET /organizations/:organizationId/projects/:projectId/attendance/summary?startDate=&endDate=&search=&exceptionsOnly=&page=&pageSize=`
- `POST /organizations/:organizationId/projects/:projectId/attendance/exceptions`
- `PATCH /organizations/:organizationId/projects/:projectId/attendance/exceptions/:exceptionId`
- `DELETE /organizations/:organizationId/projects/:projectId/attendance/exceptions/:exceptionId`
- `GET /organizations/:organizationId/projects/:projectId/attendance/export?startDate=&endDate=`

Summary response rows include:

- Worker identity and trade;
- primary Worker assignment identity;
- expected working days in the requested period;
- present-day equivalent;
- absent-day equivalent, where a Half Day contributes `0.5`;
- optional selected-date exception detail when a selected date is supplied;
- paging metadata and period/project summary totals.

Maximum period length must be bounded and validated. Period calculations use Organization timezone and date-only values, not UTC date rollover.

### 8.4 Sequential compatibility

The API slice must leave the repository compilable before Web and Mobile migrate.

- add new contracts/endpoints rather than immediately deleting every old symbol;
- provide an explicit compatibility adapter where safe;
- old `PRESENT` submissions may remove an existing exception;
- old `ABSENT`/`HALF_DAY` submissions may translate to the new exception model;
- old worker-level `HOLIDAY`, check-in/out, and overtime behavior must not be silently reinterpreted. Return a clear deprecation/validation error if a safe translation is impossible;
- remove deprecated endpoints/types only after Web and Mobile use the new contract and the final cross-client gate passes.

## 9. Sequential Implementation Slices

### Slice A0 - Formal contract reconciliation

Status: `PENDING`.

Allowed files: Markdown contracts/status/task docs only.

Tasks:

1. Supersede the old explicit Attendance flow in `MVP_REQUIREMENTS.md` and `docs/modules/attendance/CONTRACT.md` without rewriting unrelated requirements.
2. Create the separate Calendar contract under `docs/modules/calendar/CONTRACT.md` or the current approved module-contract location.
3. Document primary-project periods as a Workers allocation extension, not Calendar ownership.
4. Update `docs/modules/MODULE_INDEX.md` to the real Calendar and Attendance contract paths/statuses.
5. Record Wages and offline exclusions explicitly.
6. Update `docs/tasks/current-task.md` to identify Slice A1 as next.

Stop gate:

- documentation diff reviewed;
- no application, shared runtime, SQL, migration, seed, dependency, or database change;
- no unresolved contradiction about default Present, Calendar precedence, primary project, or Wages safety.

### Slice A1 - Shared contracts, schema proposal, API implementation

Status: `PENDING`; do not start until A0 is complete.

Allowed scope:

- `packages/shared` Calendar/Attendance contracts, permissions, and errors;
- forward SQL migration only;
- `apps/api` Calendar module;
- `apps/api` redesigned Attendance module;
- Workers API/repository extension for primary-project periods;
- seed-template and safe existing-role permission definitions;
- focused API tests;
- documentation/status evidence.

Required implementation sequence inside A1:

1. Add shared contracts while preserving temporary compatibility exports.
2. Add the forward migration and read-only legacy-data preflight.
3. Add primary-project-period repository/service validation.
4. Add Calendar repository/service/controller and effective-day resolution.
5. Replace Attendance write semantics with exceptions and add period summary queries.
6. Add legacy API adapters needed for sequential client migration.
7. Protect Wages preview/generation from incompatible calculations without redesigning Wages.
8. Add/update role-template permissions, but do not run the seed without separate approval.
9. Add unit/repository/E2E coverage with a disposable/local database only when separately approved.

API acceptance criteria:

- no explicit Present rows are created;
- non-working dates derive from Calendar and do not create worker absences;
- only the primary Project derives Present for a Worker/date;
- overlapping primary periods are rejected;
- date-specific roster logic uses the requested date, not `CURRENT_DATE()`;
- create/update/remove exception behavior is idempotent and tenant/project safe;
- removal restores derived Present;
- current legacy data is preserved and ambiguous conversion is reported;
- existing wage history remains readable;
- incompatible new Wage generation cannot silently produce incorrect values;
- Platform Super Admin has no normal Calendar/Attendance bypass.

Verification gate:

```bash
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api test -- --runInBand
pnpm --filter @nirman-app/api build
git diff --check
```

Also run focused semantic lint if the inherited package-wide formatter baseline still blocks full lint. Report migration status separately from migration execution. Do not claim a database smoke test unless it actually ran against an explicitly approved safe target.

Stop after A1. Update this plan with changed files, verification, unrun checks, migration status, compatibility notes, and the exact Web handoff. Do not start Web in the same implementation turn.

### Slice B - Web Attendance and Calendar

Status: `COMPLETE`; the Organization weekly-calendar contract mismatch was resolved on 2026-08-21 and Web weekly setup saving is enabled.

Allowed scope:

- Web Attendance feature/service/hooks/types/routes;
- Web Calendar feature/service/hooks/types/routes;
- Web left navigation and Project links;
- focused Web tests;
- documentation/status evidence.

Tasks:

1. Add canonical `/attendance` with URL-backed Project selection.
2. Redirect the existing `/projects/[id]/attendance` route to the canonical page.
3. Add permission-aware Attendance left navigation.
4. Build the current-month Worker summary table and filters.
5. Add Mark/Edit/Remove exception Dialog behavior.
6. Add `/work-calendar` and its weekly/override management UI.
7. Keep Calendar linked from Attendance/settings rather than adding a primary sidebar item initially.
8. Remove old full-roster daily edit/save UI and stop using deprecated Attendance APIs.
9. Cover loading, empty, forbidden, error, and success states.

Web acceptance criteria:

- Attendance opens the worker table directly;
- Project dropdown never exposes inaccessible Projects and is deep-linkable;
- per-worker working/present/half/absent totals match API responses;
- permissions control visibility and API remains the security authority;
- keyboard/focus/labels/inline errors work in the Dialog;
- Calendar inheritance and Project override scope are understandable;
- no Web component is reused in Mobile.

Verification gate:

```bash
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/web lint
pnpm --filter @nirman-app/web build
git diff --check
```

Run Web type-check and build sequentially. Report authenticated browser verification separately; a build or HTTP response is not visual acceptance.

Stop after B. Update this plan and `docs/tasks/current-task.md` with evidence and the exact Mobile handoff. Do not start Mobile in the same implementation turn.

### Slice C - Mobile Attendance and Calendar

Status: `COMPLETE`; implemented and statically verified on 2026-08-21. Authenticated emulator/physical-device and assistive-technology acceptance remain unrun and are recorded below.

Allowed scope:

- existing Mobile Attendance route/feature rewrite;
- new Mobile Calendar route/feature;
- shared Mobile UI primitives only where a reusable extension is needed;
- selected-Project switch integration;
- English/Hindi/Gujarati locale resources and validation;
- focused Mobile tests;
- documentation/status evidence.

Tasks:

1. Keep `/(app)/attendance` as the direct selected-Project route.
2. Replace all-worker editable status/time controls with summary cards and virtualized Worker cards.
3. Add Project switch, period selection, search, and permission-aware states.
4. Add Mark/Edit/Remove exception bottom sheet using shared `FormField`/`FormError` behavior.
5. Add separate Work Calendar route and Menu/Attendance entry points.
6. Add `attendance` and `calendar` namespaces for en/hi/gu and register them in both resources and locale validation.
7. Remove misleading offline/unsynced claims; show honest connection/save failure because offline writes are parked.
8. Stop using deprecated Attendance contracts/endpoints.
9. Preserve user-entered names, trades, reasons/notes, and stable API enum values.

Mobile acceptance criteria:

- tapping Attendance opens selected-Project worker cards without a Project-list interstitial;
- selected Project is always visible and switchable;
- card metrics match API summary;
- Mark/Edit/Remove exception requires minimal taps and provides visible feedback;
- no action is required when all Workers are present;
- read-only users can inspect but cannot mutate;
- all new customer-facing copy and accessibility labels exist in en/hi/gu;
- list performance uses `FlatList`, stable keys, and reusable/memoized card components;
- native touch targets and spacing are appropriate;
- no offline-save success is claimed.

Verification gate:

```bash
pnpm --filter @nirman-app/mobile validate:locales
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/mobile type-check
git diff --check
```

Run Expo export only when proportionate and report it separately. Authenticated emulator/physical-device verification, screen-reader checks, large-text checks, and fluent Hindi/Gujarati review are separate evidence categories and must not be inferred from static checks.

Stop after C and update the plan/status evidence. Do not begin Wages or offline sync.

### Slice C2 - Mobile Attendance UX alignment

Status: `COMPLETE`; implemented and statically verified on 2026-08-24. Authenticated device/accessibility acceptance remains pending.

Source plan: `docs/tasks/mobile-attendance-ux-alignment-plan.md`.

Purpose:

- preserve the completed canonical exception-model integration from Slice C;
- separate period summary, daily marking, and Worker history into clear Mobile flows;
- consume the existing worker-period endpoint added during the 2026-08-24 Web refinement;
- retain en/hi/gu, selected-Project, permission, error-retention, and `FlatList` behavior.

Allowed scope:

- Mobile Attendance routes, screens, services, and localized resources;
- shared Mobile primitives only where a reusable extension is required;
- documentation and proportionate static/device evidence.

Explicit exclusions:

- Web, API, shared contracts, database, migration, seed, dependencies, Work Calendar redesign, Wages, offline sync, and compatibility cleanup unless a proven blocking defect is separately approved.

Verification gate:

```bash
pnpm --filter @nirman-app/mobile validate:locales
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/mobile type-check
pnpm --filter @nirman-app/mobile exec expo export --platform android
git diff --check
```

Authenticated device, accessibility, large-text, keyboard, rotation/tablet, and fluent Hindi/Gujarati evidence remain separate from static validation.

Implemented files:

- registered `/(app)/attendance-mark` and `/(app)/worker-attendance` in `apps/mobile/app/(app)/_layout.tsx` and added their route entries;
- refactored `apps/mobile/src/features/attendance/attendance-screen.tsx` into a period-summary-only `FlatList` with explicit Start/End dates, totals, filters, pagination, `Mark attendance`, and Worker-history navigation;
- added `attendance-mark-screen.tsx`, `worker-attendance-screen.tsx`, `attendance-exception-sheet.tsx`, and `attendance-ui.tsx` for focused daily mutations, retained failed input, exact dated history, and shared readable totals;
- extended `apps/mobile/src/features/attendance/services.ts` with the canonical Worker-period read;
- updated the English, Hindi, and Gujarati Attendance resources with all new copy and accessibility labels.

Static evidence:

- `pnpm --filter @nirman-app/mobile validate:locales` passed for 11 namespaces across all three languages;
- `pnpm --filter @nirman-app/shared build` passed;
- `pnpm --filter @nirman-app/mobile type-check` passed;
- Android Expo export passed with one 3.89 MB Hermes bundle and the bundled Manrope, Noto Sans Devanagari, and Noto Sans Gujarati assets;
- `git diff --check` passed.

No API, shared-contract source, database, migration, seed, dependency, Web, Work Calendar, Wages, offline-sync, or compatibility-cleanup change was made by Slice C2.

### Slice D - Compatibility cleanup

Status: `PENDING`; optional and only after A1, B, and C are accepted.

Tasks:

- remove deprecated explicit Attendance API/client types and adapters;
- confirm no active client calls the old bulk-save contract;
- keep legacy database history until a separately approved archival/deletion decision;
- update stale documentation/state tables;
- run cross-workspace verification.

This cleanup does not authorize a Wages redesign or dropping `attendance_records`.

## 10. Test Matrix

### Calendar

- unconfigured weekly pattern is explicit;
- Organization weekly configuration applies to Projects;
- Organization date range overrides weekly pattern;
- Project override wins over Organization override;
- special working date overrides a non-working Organization date;
- invalid/reversed/ambiguous ranges fail with stable codes;
- cross-tenant and unassigned-Project access fail;
- Project management requires the correct Calendar permission.

### Primary project

- one Worker may have multiple Project assignments;
- exactly one primary period covers a date;
- overlapping primary periods fail under concurrency;
- primary period cannot exceed assignment dates;
- secondary Project does not derive Present;
- selected-date roster is historical-date correct.

### Attendance

- working + primary + no exception derives Present;
- non-working date derives Non-working, not Absent;
- Full Day exception derives Absent;
- Half Day exception derives Half day;
- removing exception restores Present;
- inactive/out-of-window/non-primary assignments cannot receive an absence exception;
- exactly one active exception exists per assignment/date;
- period totals correctly intersect Calendar, assignment dates, primary periods, and exceptions;
- tenant/project/permission isolation holds for read, create, update, delete, and export;
- date-only behavior is correct in `Asia/Kolkata` and does not shift through UTC conversion.

### Clients

- no selected Project;
- one accessible Project;
- several accessible Projects;
- no Workers;
- all Workers present and therefore no exception rows;
- existing Full Day/Half Day exceptions;
- read-only access;
- permission removed while screen is open;
- Calendar not configured;
- Calendar inherited versus Project overridden;
- long Worker lists;
- API failure and retry;
- multilingual mobile layout and accessibility.

## 11. Explicitly Excluded

- Wages calculation/redesign beyond the safety gate;
- Kharchi;
- paid leave;
- holiday pay;
- overtime;
- check-in/check-out;
- biometrics, GPS, or geofencing;
- split-day work across two Projects;
- daily Attendance approval;
- offline persistence, queueing, sync, and conflict resolution;
- external/public holiday provider integration;
- automatic India/state holiday application;
- persisted generic audit infrastructure if the Audit Foundation is still absent;
- database migration or seed execution without explicit target approval.

## 12. Handoff And Progress Ledger

Every slice owner must update this table before handing off:

| Slice | Status | Evidence | Remaining |
|---|---|---|---|
| A0 Formal contracts | COMPLETE | Attendance/Calendar/Workers/MVP/module-index contracts reconciled on 2026-08-21 | None; preserve compatibility notes through client migration |
| A1 Shared/Data/API | COMPLETE | Shared build, API type-check, 16 Jest suites/76 tests, and `git diff --check` passed; migration/seed not executed | Begin Web only as Slice B |
| B Web | COMPLETE | Shared build, API type-check and 17 suites/86 tests, Web type-check, focused changed-file lint, production build, and `git diff --check` passed; package lint reached three inherited errors | Authenticated browser and automated Web tests remain unrun |
| C Mobile | COMPLETE | 11-namespace locale validation, shared build, Mobile type-check, Android Expo export, and `git diff --check` passed | Authenticated emulator/device, screen-reader, large-text, landscape, and fluent translation review remain |
| C2 Mobile Attendance UX alignment | COMPLETE | Locale parity, shared build, Mobile type-check, Android Expo export, and `git diff --check` passed | Authenticated device, accessibility, large-text, landscape/tablet, and fluent translation acceptance remain |
| D Compatibility cleanup | PENDING | Not started | Optional after C2 and client acceptance |

For every completed slice, record:

- exact files changed;
- source/document conflicts resolved;
- commands run and results;
- tests not run;
- migration status versus actual migration execution;
- runtime database evidence, if any;
- browser evidence, if any;
- emulator/device evidence, if any;
- the next permitted slice.

Do not report static type-check/build success as database, browser, or physical-device acceptance.

### 2026-08-21 - Slice A0/A1 Completion

Resolved contract conflicts:

- replaced explicit Present/daily approval with derived Present and stored absence exceptions;
- moved Holiday/non-working ownership to the separate Work Calendar contract;
- recorded effective-dated primary Project periods as a Workers allocation extension;
- parked offline writes and unsafe legacy HOLIDAY/check-in/out/overtime translation;
- retained Wages history reads while gating new preview/generation with `WAGE_CALCULATION_MODEL_UNAVAILABLE`.
- simplified Attendance summaries to decimal `presentDays` and `absentDays`; a Half Day contributes `0.5` to each and no separate Half Day summary column remains.

Changed files for A0/A1:

- `MVP_REQUIREMENTS.md`
- `docs/modules/MODULE_INDEX.md`
- `docs/modules/attendance/CONTRACT.md`
- `docs/modules/calendar/CONTRACT.md`
- `docs/modules/construction/workers/CONTRACT.md`
- `docs/modules/construction/workers/DECISIONS.md`
- `docs/tasks/calendar-attendance-exception-model-implementation-plan.md`
- `docs/tasks/current-task.md`
- `packages/shared/src/constants/attendance.ts`
- `packages/shared/src/constants/calendar.ts`
- `packages/shared/src/constants/errors.ts`
- `packages/shared/src/constants/index.ts`
- `packages/shared/src/constants/permissions.ts`
- `packages/shared/src/types/attendance.ts`
- `packages/shared/src/types/calendar.ts`
- `packages/shared/src/types/index.ts`
- `packages/shared/src/types/workers.ts`
- `apps/api/scripts/seed.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/database/sql/migrations/009_calendar_attendance_exception_model.sql`
- `apps/api/src/database/sql/preflight/009_calendar_attendance_exception_model.sql`
- `apps/api/src/modules/calendar/calendar.controller.ts`
- `apps/api/src/modules/calendar/calendar.module.ts`
- `apps/api/src/modules/calendar/calendar.repository.ts`
- `apps/api/src/modules/calendar/calendar.service.spec.ts`
- `apps/api/src/modules/calendar/calendar.service.ts`
- `apps/api/src/modules/calendar/dto/calendar.dto.ts`
- `apps/api/src/modules/attendance/attendance.controller.ts`
- `apps/api/src/modules/attendance/attendance.module.ts`
- `apps/api/src/modules/attendance/attendance.repository.ts`
- `apps/api/src/modules/attendance/attendance.service.spec.ts`
- `apps/api/src/modules/attendance/attendance.service.ts`
- `apps/api/src/modules/attendance/dto/attendance-exception.dto.ts`
- `apps/api/src/modules/workers/dto/primary-project-period.dto.ts`
- `apps/api/src/modules/workers/dto/query-worker.dto.ts`
- `apps/api/src/modules/workers/workers.controller.ts`
- `apps/api/src/modules/workers/workers.repository.spec.ts`
- `apps/api/src/modules/workers/workers.repository.ts`
- `apps/api/src/modules/workers/workers.service.spec.ts`
- `apps/api/src/modules/workers/workers.service.ts`
- `apps/api/src/modules/wages/wages.service.spec.ts`
- `apps/api/src/modules/wages/wages.service.ts`

Verification:

- `pnpm --filter @nirman-app/shared build` - passed.
- `pnpm --filter @nirman-app/api type-check` - passed.
- `pnpm --filter @nirman-app/api test -- --runInBand` - passed: 16 suites, 76 tests.
- `git diff --check` - passed.

Not run: migration, preflight SQL, seed, database connection/smoke, Web/Mobile checks, full workspace lint/build, Expo export, browser, emulator, or physical-device testing. The user-owned `pnpm-lock.yaml` modification was preserved and was not changed by this slice.

Exact Slice B handoff:

1. Build canonical Web `/attendance` against `GET .../attendance/summary`, exception CRUD, and period export; keep `projectId` URL-backed and redirect the old Project route.
2. Build Web `/work-calendar` against Organization weekly-calendar and Organization/Project override APIs, showing inheritance and precedence explicitly.
3. Stop Web calls to the deprecated daily bulk contract, then verify Web type-check/lint/build and authenticated browser behavior separately.
4. Do not remove compatibility exports/routes until Mobile Slice C is also migrated; do not begin Mobile or Wages from Slice B.

### 2026-08-21 - Slice B Web Completion

Implemented:

- added canonical `/attendance` with permission-aware navigation, accessible-Project URL fallback, URL-backed Project/month/date/search/exception/page filters, debounced search, API pagination, compact contract totals, desktop table, narrow worker cards, selected-date states, period export, and read-only/non-working handling;
- replaced the legacy full-roster Web flow and deprecated single-date API calls with Attendance summary and exception create/update/remove contracts;
- redirected `/projects/[id]/attendance` and updated Project Detail Attendance navigation to `/attendance?projectId=<id>`;
- added accessible Mark/Edit/Remove absence dialog behavior with visible labels, preserved failed input, destructive confirmation, pending guards, query invalidation, live success feedback, focus trapping/restoration, Escape, and Cancel;
- added `/work-calendar` with Organization versus Project scope, effective month/list views, text source labels, inheritance/precedence guidance, calendar-not-configured/read-only/error states, and Organization/Project override create/edit/remove flows;
- retained existing NirmanSite tokens, typography, radii, controls, Lucide icons, and responsive conventions; no dependency, lockfile, API, database, migration, seed, Mobile, or Wages change was made by Slice B.

Changed Web files:

- `apps/web/src/app/(app)/attendance/page.tsx`
- `apps/web/src/app/(app)/work-calendar/page.tsx`
- `apps/web/src/app/(app)/projects/[id]/attendance/page.tsx`
- `apps/web/src/components/ui/dialog.tsx`
- `apps/web/src/config/navigation.ts`
- `apps/web/src/features/attendance/components/attendance-page.tsx`
- `apps/web/src/features/attendance/hooks/use-attendance.ts`
- `apps/web/src/features/attendance/services/attendance.service.ts`
- `apps/web/src/features/attendance/types/attendance.types.ts`
- `apps/web/src/features/calendar/components/work-calendar-page.tsx`
- `apps/web/src/features/calendar/hooks/use-calendar.ts`
- `apps/web/src/features/calendar/services/calendar.service.ts`
- `apps/web/src/features/calendar/types/calendar.types.ts`
- `apps/web/src/features/calendar/index.ts`
- `apps/web/src/features/projects/components/project-detail-page.tsx`
- `apps/web/src/providers/auth-provider.tsx`

Verification:

- `pnpm --filter @nirman-app/shared build` - passed.
- `pnpm --filter @nirman-app/web type-check` - passed.
- focused ESLint over new/changed Attendance, Calendar, route, navigation, and Dialog files - passed.
- `pnpm --filter @nirman-app/web build` - passed; routes include `/attendance`, `/work-calendar`, and the compatibility Project route.
- `git diff --check` - passed.
- package-wide `pnpm --filter @nirman-app/web lint` - did not pass because of inherited `react-hooks/set-state-in-effect` errors in Organization Detail, Project Detail, and Settings; the pre-existing login image warning also remains. New-file hook warnings found on the first run were fixed before focused lint.

Resolved weekly-pattern contract mismatch:

- canonical uppercase `WorkingWeek` keys now flow unchanged through `WorkingWeekDto`, `CalendarService`, and `CalendarRepository`;
- DTO validation accepts uppercase values, requires Boolean values for all seven weekdays, and rejects lowercase-only payloads;
- Web Organization weekly setup now initializes from the saved calendar, requires an explicit Working or Non-working choice for every weekday, permits any pattern without a Sunday assumption, saves timezone plus uppercase `workingWeek`, preserves failed input, and refetches Organization/effective Project calendars after success;
- focused Calendar DTO/service tests pass as part of the full API result: 17 suites and 86 tests.

Not run:

- no Web test runner or test script exists in `apps/web`, so requested automated Web tests were not added or executed without an approved dependency/tooling change;
- authenticated browser/responsive/keyboard verification was not run: port 3000 listened but `/work-calendar` did not respond within 10 seconds, and no local API health endpoint was available on ports 3001 or 4000;
- no migration, preflight SQL, seed, database connection/write, Mobile check, Expo check, emulator, or physical-device test ran.

Compatibility and next handoff:

- legacy API and shared compatibility contracts remain for Mobile Slice C; only Web usage was removed;
- Slice C Mobile is next. Do not begin Wages or compatibility cleanup.

### 2026-08-21 - Slice C Mobile Completion

Implemented:

- rewrote `/(app)/attendance` around the canonical period summary and exception CRUD contracts; removed the separate roster fetch, full-roster save, explicit Present/Holiday controls, check-in/out fields, and misleading offline/sync claims;
- kept selected-Project Attendance direct, visible, and switchable through the existing persisted `switchActiveProject` infrastructure for Active, Draft, and On-hold management contexts;
- added locale-aware month/date controls, API-debounced search, Exceptions only filtering, four contract totals, stable-key `FlatList` Worker cards, pagination, pull/background refresh, non-working/read-only states, and permission refresh handling;
- added the shared-bottom-sheet absence create/edit/remove flow with Full Day/Half Day only, required/optional field semantics, retained failed input, destructive confirmation, pending guards, stale-context invalidation, success announcements, and focus restoration;
- added protected `/(app)/work-calendar`, registered it in the Expo stack, linked it from Attendance and the permission-aware Menu, and kept it out of permanent bottom navigation;
- added Project/Organization scope tabs, an accessible effective month grid, selected-day state/source details, inheritance/precedence messaging, canonical uppercase `WorkingWeek` setup with Sunday-off/no-fixed-off/custom choices, and Organization/Project override create/edit/remove flows;
- registered `attendance` and `calendar` namespaces and meaningful English, Hindi, and Gujarati resources, including navigation, permission-group/action labels, stable API recovery messages, validation, confirmations, success copy, and accessibility labels;
- extended existing shared Mobile primitives only for reusable behavior: two-line compact headers and selected-Project copy, focusable header copy, non-clearable required date inputs, and a visible reusable Project switch action.

Changed Mobile files:

- `apps/mobile/app/(app)/_layout.tsx`
- `apps/mobile/app/(app)/work-calendar.tsx`
- `apps/mobile/scripts/validate-locales.mjs`
- `apps/mobile/src/components/ui/compact-screen-header.tsx`
- `apps/mobile/src/components/ui/date-input.tsx`
- `apps/mobile/src/features/attendance/attendance-screen.tsx`
- `apps/mobile/src/features/attendance/date-utils.ts`
- `apps/mobile/src/features/attendance/services.ts`
- removed `apps/mobile/src/features/attendance/types.ts`
- `apps/mobile/src/features/calendar/month-calendar.tsx`
- `apps/mobile/src/features/calendar/services.ts`
- `apps/mobile/src/features/calendar/work-calendar-screen.tsx`
- `apps/mobile/src/features/home/components/customer-tab-bar.tsx`
- `apps/mobile/src/features/members/project-assignment-editor.tsx`
- `apps/mobile/src/features/projects/components/project-switcher.tsx`
- `apps/mobile/src/i18n/errors.ts`
- `apps/mobile/src/i18n/i18next.d.ts`
- `apps/mobile/src/i18n/resources.ts`
- `apps/mobile/src/i18n/locales/{en,hi,gu}/{attendance,calendar,common,errors,navigation,team}.json`
- `docs/tasks/calendar-attendance-exception-model-implementation-plan.md`
- `docs/tasks/current-task.md`

Verification:

- `pnpm --filter @nirman-app/mobile validate:locales` - passed: 11 namespaces across 3 languages with matching keys and placeholders.
- `pnpm --filter @nirman-app/shared build` - passed.
- `pnpm --filter @nirman-app/mobile type-check` - passed.
- `pnpm --filter @nirman-app/mobile exec expo export --platform android` - passed: Android bundle exported with 1,371 modules and 57 assets.
- `git diff --check` - passed.
- read-only local API health at `http://127.0.0.1:4000/api/v1/health` returned app `ok` and database `ok`; this is health evidence only, not authenticated feature integration evidence.

Not run and limitations:

- Metro was not running after export, and no authenticated emulator or physical-device session was available; Attendance exception mutations, Project switching, Calendar weekly/override mutations, 401/403 transitions, and failed-write retention were not runtime-smoked;
- no screen-reader, focus-order, largest Dynamic Type, keyboard avoidance, 375px-equivalent, tablet, portrait/landscape, light/dark visual, touch-target measurement, or reduced-motion device checks were run;
- no fluent Hindi or Gujarati construction-domain review was performed; locale parity verifies structure and placeholders, not linguistic acceptance;
- no migration, preflight SQL, seed, database mutation, API change, Web change, Wages work, offline synchronization, dependency change, lockfile change, or compatibility cleanup was performed by Slice C;
- no Mobile test runner exists in the current package, so no new automated framework or dependency was introduced solely for this slice.

Compatibility and handoff:

- Mobile no longer calls deprecated explicit Attendance endpoints or compatibility types;
- deprecated shared/API compatibility surfaces and legacy database history remain untouched for optional Slice D;
- Slice C2 Mobile Attendance UX alignment is complete with static evidence recorded above;
- Slice D remains pending after client acceptance and requires separate authorization. Do not begin Wages or offline synchronization from this handoff.

### 2026-08-24 - Web Attendance UX Refinement And Mobile C2 Handoff

Implemented and documented on Web/API:

- simplified canonical `/attendance` into a period-summary listing with Project, Start date, End date, Worker search, and Exceptions only filters;
- kept period totals and Worker Expected/Present/Absent day equivalents, while removing the selected-date status and mutation controls from the summary table;
- changed `View details` to deep-link into the existing Worker detail page’s Attendance tab with Project and period context;
- added the worker-period response contract and `GET .../attendance/workers/:workerId?startDate=&endDate=` for exact newest-first Full-day/Half-day exceptions, reasons, notes, and derived totals;
- added the Worker Attendance tab with Project/range filters, totals, responsive dated absence details, and empty/error states;
- added `/attendance/mark` as the separate daily roster workflow with derived Present, Full-day/Half-day create/edit, Restore Present confirmation, non-working/read-only states, retained failed input, and pending guards;
- retained Work Calendar separation and did not begin Wages, offline sync, database, migration, seed, or Mobile source changes.

Verification:

- shared build passed;
- API type-check passed;
- full API Jest passed: 18 suites and 90 tests;
- Web type-check and focused changed-file ESLint passed;
- Web production build passed and includes `/attendance`, `/attendance/mark`, and `/workers/[id]`;
- `git diff --check` passed;
- package-wide Web lint still stops at three inherited `react-hooks/set-state-in-effect` errors outside Attendance; the existing login image warning remains;
- unauthenticated runtime probes confirmed API health, worker-period route registration, and HTTP `200` for `/attendance/mark`, but no authenticated browser mutation or responsive/accessibility acceptance was completed;
- local Web/API processes used for verification were stopped at the Product Owner’s request.

Documentation reconciliation:

- the latest Web work had not yet been added to this ledger, so this entry records it;
- Slice C remains the completed canonical Mobile exception integration;
- Slice C2 is specified in `docs/tasks/mobile-attendance-ux-alignment-plan.md` and its completed implementation evidence is recorded in this ledger;
- do not start Slice D, Wages, offline synchronization, or unrelated Mobile redesign from this handoff.
