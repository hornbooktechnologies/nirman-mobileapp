# Mobile Attendance UX Alignment Plan

## Status

Implemented and statically verified on 2026-08-24. Authenticated device, accessibility, large-text, keyboard, rotation/tablet, and fluent Hindi/Gujarati acceptance remain pending.

Mobile is the primary customer application. The existing Mobile Attendance implementation already uses the canonical exception model, but it still combines period summary and selected-date mutation controls on one screen. The next Mobile phase aligns the user flow with the clarified product structure now implemented on Web:

1. period summary;
2. daily attendance marking;
3. one Worker’s attendance history.

## Required Reading

Before implementation, read:

- `MVP_REQUIREMENTS.md`;
- `docs/modules/attendance/CONTRACT.md`;
- `docs/modules/calendar/CONTRACT.md`;
- `docs/tasks/calendar-attendance-exception-model-implementation-plan.md`;
- this plan;
- the current Mobile Attendance, Work Calendar, selected-Project, localization, and shared bottom-sheet code.

## Non-Negotiable Domain Rules

- Present is derived. Never create explicit Present rows.
- Store only `ABSENCE` exceptions with `FULL_DAY` or `HALF_DAY`.
- Removing an exception restores Present.
- Non-working dates belong to Work Calendar and cannot become absences.
- Attendance is scoped to the effective primary Project assignment for the selected date.
- A Half Day contributes `0.5` to Present and `0.5` to Absent totals.
- Never add Mark all present, a full-roster save payload, Holiday attendance, check-in/out, overtime, offline-save success, or Wages calculations.

## Current Mobile Baseline

Already implemented and to be reused:

- protected `/(app)/attendance` and `/(app)/work-calendar` routes;
- selected-Project context and Project switching;
- period summary and selected-date roster query;
- exception create/update/remove services;
- `FlatList` Worker cards with stable assignment keys;
- shared bottom-sheet form behavior;
- permission-aware read-only states;
- retained input after failed writes and success/error feedback;
- English, Hindi, and Gujarati Attendance/Calendar resources;
- Work Calendar effective dates, weekly pattern, and override flows.

The next phase is a UX separation and worker-history addition, not a contract rewrite.

## Target Mobile Information Architecture

### 1. Attendance summary: `/(app)/attendance`

Purpose: answer “How many expected, present, and absent days does each Worker have in this period?”

Keep:

- compact header;
- visible selected Project and Project switch;
- Work Calendar entry point;
- Start date and End date, defaulting to the current month;
- Worker search and Exceptions only filter;
- Expected, Present, and Absent totals;
- virtualized Worker cards and pagination/load-more behavior;
- pull-to-refresh and honest API errors.

Each Worker card shows:

- Worker name, code, and trade;
- Expected days;
- Present-day equivalent;
- Absent-day equivalent;
- `View attendance` action.

Add a permission-aware primary `Mark attendance` action. Remove selected-date status and mutation controls from this summary screen.

### 2. Daily marking: `/(app)/attendance-mark`

Purpose: answer “Who was absent or half day on this date?”

The screen contains:

- compact header with clear back navigation to Attendance summary;
- visible selected Project and Project switch;
- required Attendance date, default today;
- Worker search;
- virtualized historical-date roster;
- derived status for each Worker: Present, Half day, Absent, or Non-working;
- permission-aware row/card actions.

Actions:

- Present + `attendance:mark` -> `Mark absent`;
- existing exception + `attendance:update` -> `Edit` and `Restore Present`;
- Non-working -> no mutation;
- read-only -> visible status without mutation controls.

Create/Edit uses the existing shared bottom sheet:

- Worker and Project are read-only context;
- date is the screen-selected date;
- Full day/Half day is required;
- reason and notes are optional;
- Save is disabled while pending;
- API/general error is announced below the heading;
- entered values remain after failure;
- success invalidates/refetches the daily roster, period summary, and Worker history queries.

Restore Present requires confirmation and removes only the active exception.

### 3. Worker attendance history: `/(app)/worker-attendance`

Purpose: answer “On which exact dates was this Worker absent or half day, and why?”

Navigation parameters:

- `workerId` required;
- `projectId` required/deep-linked from the summary;
- `startDate` and `endDate` carried from the summary when available.

The screen contains:

- Worker name, code, and trade;
- selected Project;
- Start date and End date filters;
- Expected, Present, and Absent totals;
- dated Full-day/Half-day exception list, newest first;
- reason and notes;
- loading, empty, forbidden, and retry states.

Use the canonical worker-period endpoint:

`GET /organizations/:organizationId/projects/:projectId/attendance/workers/:workerId?startDate=&endDate=`

Start with a readable list. A calendar/list toggle is deferred until field testing proves it improves comprehension.

## Permissions

- `attendance:read`: access summary, daily roster, and Worker history.
- `attendance:mark`: create a new absence exception.
- `attendance:update`: edit or restore an existing exception.
- `attendance:export`: remains Web/export behavior unless a separate Mobile export decision is approved.
- `work-calendar:read`: controls the Work Calendar entry point.

Permission changes while a screen is open must produce a clear read-only/forbidden transition. The API remains the security authority.

## Localization And Accessibility

- Add every new string and accessibility label to English, Hindi, and Gujarati.
- Preserve user-entered names, trades, reasons, and notes exactly as typed.
- Translate display labels only; never translate API enums, IDs, permission keys, or stable error codes.
- Use existing localized typography and shared field/error primitives.
- Maintain at least 44dp touch targets; add `hitSlop` to smaller icon controls.
- Keep long rosters in `FlatList`; do not replace them with `ScrollView.map`.
- Support screen-reader labels, logical focus order, keyboard avoidance, large text, and portrait/landscape layouts.

## Expected Mobile Files

Likely scope:

- `apps/mobile/app/(app)/_layout.tsx`;
- `apps/mobile/app/(app)/attendance.tsx`;
- new `apps/mobile/app/(app)/attendance-mark.tsx`;
- new `apps/mobile/app/(app)/worker-attendance.tsx`;
- `apps/mobile/src/features/attendance/attendance-screen.tsx`;
- new/refactored Attendance summary, daily roster, Worker history, and exception-sheet components;
- `apps/mobile/src/features/attendance/services.ts`;
- `apps/mobile/src/features/attendance/date-utils.ts` only if reusable range helpers are required;
- `apps/mobile/src/i18n/locales/{en,hi,gu}/attendance.json`;
- `apps/mobile/src/i18n/i18next.d.ts` and `resources.ts` only if namespace registration changes;
- this plan and the Calendar/Attendance progress ledger.

Do not copy Web components into Mobile. Reuse Mobile-native primitives and patterns.

## Explicitly Out Of Scope

- API, shared-contract, database, migration, seed, or dependency changes unless implementation discovers a proven contract defect;
- Work Calendar redesign;
- Wages, Kharchi, payroll locking, or attendance-to-wage calculations;
- offline persistence, queued writes, or sync claims;
- check-in/out, overtime, GPS, biometric, Holiday, or explicit Present records;
- compatibility cleanup or removal of legacy database history;
- unrelated Mobile navigation or visual redesign.

## Sequential Implementation Steps

1. Refactor `/(app)/attendance` into the period-summary-only screen while preserving selected Project, filters, totals, pagination, and refresh behavior.
2. Add `/(app)/attendance-mark` and move selected-date exception mutations into its daily roster.
3. Add the Mobile worker-period service/query and `/(app)/worker-attendance` history screen.
4. Link summary Worker cards to Worker history and link the summary header to daily marking.
5. Reuse and harden the existing exception bottom sheet for create/edit/remove behavior across the new daily route.
6. Add/update en/hi/gu resources and accessibility labels.
7. Verify permission loss, non-working dates, no Workers, long rosters, failed writes, retained input, and stale Project/date changes.
8. Update the master implementation ledger with exact files and evidence. Stop before Wages, offline sync, or compatibility cleanup.

## Static Validation

Run sequentially:

```bash
pnpm --filter @nirman-app/mobile validate:locales
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/mobile type-check
pnpm --filter @nirman-app/mobile exec expo export --platform android
git diff --check
```

Expo export is bundle evidence, not device acceptance.

## Authenticated Device Acceptance

Verify separately on an authenticated Android device/emulator, and on iOS when available:

1. Project switching on all three Attendance routes.
2. Default current-month summary and custom date ranges.
3. Exact Worker history dates, Full-day/Half-day labels, reason, and notes.
4. Mark absent, edit, failed-save retention, and Restore Present.
5. Non-working date behavior.
6. Read-only and permission-removed-while-open behavior.
7. Long roster scrolling and search responsiveness.
8. English, Hindi, and Gujarati layout/font shaping.
9. Screen reader, largest text, keyboard avoidance, touch targets, rotation, and tablet layout.

Report static checks, authenticated API integration, emulator/device behavior, accessibility, and translation review as separate evidence categories.

## Completion Boundary

Complete this phase only when the three Mobile flows are implemented and statically verified, with all unrun device/accessibility evidence stated explicitly. Do not start Wages, offline sync, or compatibility cleanup.
