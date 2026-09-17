# W1 Web Work Calendar and Attendance parity

Date: 2026-09-17.

Status: implementation added in source; **not verified or accepted**. No tests, type-checks, lint, builds, browser/runtime checks, diff checks, or other verification commands were run, as explicitly requested. Source inspection was performed. W1 as a whole remains incomplete.

## Scope and authority

Extended `apps/web` and implementation documentation only. Mobile, API, shared contracts, database, migrations, seeds, Wages, and Kharchi were not changed. Existing unrelated dirty work was preserved, including the Workers attendance panel changes already in the working tree. No commit, push, or deployment.

Read `CODEX.md`, the Web implementation plan, applicable architecture/development instructions, Calendar/Attendance contracts, current progress records, shared types/constants, API controllers/DTOs/services/repositories, Mobile screens/services, Web routes/components/hooks/services, and effective Project access handling. No applicable `AGENTS.md` was found in the repository or its inspected ancestors. Applied nirmansite-module-development and ui-ux-pro-max; retained existing English-only NirmanSite components, branding, tokens, and typography. This extends established pages, not a new design system or business contract.

## Source audit and changes

| Area | Baseline | Implemented Web changes |
| --- | --- | --- |
| Organization calendar | EXISTING: read/update timezone and explicit seven-day week; Organization override create/update/remove | Added working-week presets, required field markers, timezone validation/focus, pending/unsaved form safeguards, and preserved Organization-only authorization |
| Effective Project calendar | EXISTING: API-resolved month, inheritance/precedence labels, Project overrides and month navigation | Added keyboard-selectable dates, selected-day source/name/reason detail, date-targeted override action, working/non-working legend, validated month input, working timezone display, explicit loading/access errors and archived context |
| Calendar navigation | MISSING: sidebar entry | Added Work Calendar entry; Attendance sidebar eligibility uses effective Project reads; Calendar remains accessible to Organization calendar readers without a Project |
| Effective permissions | NEEDS_CHANGE: Organization permission OR Project permission bypassed CUSTOM restrictions in Web presentation | Project selectors/actions/reads now use effective Project permission arrays; Organization mutations still use Organization permissions. Explicit inaccessible Project links show denial instead of silently falling back. No protected Attendance/Project-calendar read before usable access context |
| Attendance summary | EXISTING: inclusive date range, server search, exceptions-only filter, paginated rows/totals, CSV | Organization working-timezone defaults; date validation and 366-day bound; mark entry available to update-only users; preserved filter/period/page context; error/success export feedback explaining full-period export |
| Daily attendance | EXISTING: primary-date roster, FULL_DAY/HALF_DAY absence creation/edit/removal, reason/notes | Server daily totals, supported exceptions-only filter, debounced bounded search with URL pagination/filter state, required labels, read-only/archived states, guarded submissions, retained removal errors, and Worker history links. Unknown selected-date state is not labelled Present |
| Worker history | EXISTING: Workers detail Attendance tab and server totals/exception list | Reused the same panel within `/attendance?workerId=...` so Attendance-only readers do not require `workers:read`; retained existing Worker detail route. Authorized Project selection, date validation, timezone defaults, truthful zero-expected-days empty state, summary and daily-date navigation. Workers detail link appears only with `workers:read` |
| Refresh/context | NEEDS_CHANGE: previous-query placeholders could show another context's data; Calendar writes only invalidated Calendar | Removed cross-query Attendance placeholders; user-scoped Calendar/Attendance/Project-access read keys; workspace state resets on identity/Organization/Project/access changes; foreground refresh enabled. Calendar writes invalidate Attendance; exception writes invalidate summaries/history. Late CSV responses from an unmounted context are discarded |
| Accessibility | NEEDS_CHANGE: small operational copy, optional suffixes, calendar dates not selectable | Larger feature-scoped fields/actions, 14px operational rows, visible labels/required markers, calendar pressed state and focus styling, responsive lists/tables, form submission via keyboard, shared Dialog focus effect no longer restarts whenever its callback identity changes |

## API and Mobile traceability

Abbreviations: `O = /organizations/:organizationId`, `P = O/projects/:projectId`.

| Mobile screen/action | Existing API | Inputs / response consumed | Effective permission / Web destination | Evidence |
| --- | --- | --- | --- | --- |
| WorkCalendarScreen weekly setup | GET/PATCH `O/work-calendar` | `timezone`, all seven `workingWeek` booleans; `configured`, `updatedAt`, `overrides` | Organization `work-calendar:read`, `work-calendar:update-organization`; `/work-calendar` | Source inspected; verification unrun |
| WorkCalendarScreen month, inheritance, day selection | GET `P/work-calendar` | Inclusive `startDate`, `endDate`; API `days`, `isWorking`, `dayType`, `source`, `override`, inherited week and timezone | Effective Project `work-calendar:read`; same route with `projectId`, `month`, `selectedDate` | Source inspected; verification unrun |
| WorkCalendarScreen Organization/Project overrides | POST/PATCH/DELETE `O/work-calendar/overrides[/:id]` or `P/work-calendar/overrides[/:id]` | `startDate`, `endDate`, `dayType`, required trimmed `name`, nullable `reason`; scope-owned override / removal result | Organization `work-calendar:update-organization` or effective Project `work-calendar:update-project`; existing dialog | Source inspected; verification unrun |
| AttendanceScreen period/search/filter/pagination | GET `P/attendance/summary` | `startDate`, `endDate`, `search`, `exceptionsOnly`, `page`, `pageSize`; `rows`, `totals`, `meta` | Effective `attendance:read`; `/attendance` | Source inspected; verification unrun |
| AttendanceMarkScreen daily roster | GET `P/attendance/summary` | Start/end/`selectedDate` set to selected date; same supported filters; authoritative selected state/exception and totals | Effective `attendance:read`; `/attendance/mark` | Source inspected; verification unrun |
| AttendanceExceptionSheet create/edit | POST `P/attendance/exceptions`; PATCH `.../exceptions/:id` | Create adds `workerAssignmentId`, `workDate`, `exceptionType: ABSENCE`; duration, nullable `reasonCode`, nullable `notes`; `AttendanceException` | Effective `attendance:mark` for create, `attendance:update` for edit; existing dialog | Source inspected; verification unrun |
| AttendanceMarkScreen remove | DELETE `P/attendance/exceptions/:id` | Existing exception ID; removal result, followed by server refetch | Effective `attendance:update`; confirmation dialog | Source inspected; verification unrun |
| WorkerAttendanceScreen history | GET `P/attendance/workers/:workerId` | Inclusive dates; authoritative totals and effective exception list | Effective `attendance:read`; reused WorkerAttendancePanel through Attendance or Workers detail | Source inspected; verification unrun |
| API-supported export | GET `P/attendance/export` | `startDate`, `endDate`; authenticated text CSV | Effective `attendance:export`; browser download | Source inspected; verification unrun |

## Business rules retained

- Present remains derived by the API from effective primary-project periods, assignment coverage, active-worker eligibility, effective working calendar, and absence exceptions. No Web roster eligibility or total/wage calculation was introduced.
- No explicit Present/Holiday records, mark-all-present operation, full-roster save, new endpoint, or financial correction workflow.
- Project override > Organization override > weekly pattern. No implicit Sunday/public holiday assumptions. Presets only populate an explicit user-saveable weekly form.
- Date-only inputs remain date-only payload strings. Today/month defaults use the authenticated Organization working timezone; Calendar displays its authoritative calendar timezone and refreshes the session after weekly/timezone saves. Missing timezone produces an explicit recoverable state rather than silently using the browser timezone.
- Summary totals describe the API-filtered collection; CSV exports the full Project period because its DTO has no search/exception filters.
- POST/PATCH/DELETE are not automatically retried. API overlap, duplicate exception, invalid primary allocation, non-working-date and permission errors remain authoritative, and failed mutations retain form input.

## API limitations and Mobile discrepancies

1. **Locked-period correction is not supported by the current Attendance contract/API.** `attendance:correct-locked` is explicitly reserved. Summary/history responses have no lock metadata; create/update DTOs have no correction-reason field; deletion has no reason body; the service does not enforce a locked-period path. No lock UI or invented enforcement was added. This is not a blocker for current Mobile/API parity. If later required, the smallest backend work must first define the lock policy, then add authoritative lock/action metadata, conditional correction-reason validation and permission enforcement to the existing mutation paths. That work requires separate explicit authorization.
2. **Attendance reasons and notes are optional in both current Mobile and API.** Web retains that rule. Required asterisks are applied to genuinely required fields, not to a fabricated correction reason.
3. **Future daily dates differ:** Mobile's daily date picker uses a today maximum, while `AttendanceService.validateExceptionTarget` has no future-date rejection and the period APIs accept future ranges. Web preserves API behavior and does not add a client-only business prohibition. Future totals are server results, not a statement of completed work or wage eligibility.
4. **Timezone differs:** Mobile Calendar writes fixed `Asia/Kolkata`, and Mobile Attendance helpers use device-local dates. API Calendar supports validated IANA timezones. Web uses the Organization working timezone/current Calendar response rather than copying those client assumptions.
5. **History is effective attendance history, not a raw audit log.** The API omits exceptions on dates currently resolved non-working or outside effective roster coverage. Web and Mobile display those authoritative results. This task does not introduce raw/deleted exception browsing.

No backend change is needed for the implemented current-API parity scope. No remaining independent Web implementation blocker was identified by source inspection.

## Pending acceptance, explicitly not run

- Web type-check, lint, build and any focused tests; no checks were executed in this task.
- Authenticated Owner/CUSTOM/read-only/update-only/calendar-only/Attendance-only roles, direct URL denial, revoked permissions and identity/Organization switching.
- Organization week setup; inheritance and same-scope conflict; Project precedence; selected-day create/edit/remove and timezone midnight behavior.
- Full-day/half-day create/edit/remove, duplicate conflict, ended/secondary/future primary allocation, non-working dates, zero expected days, pagination/filter recovery and CSV content.
- Web/Mobile refresh parity, archived Project behavior, and interrupted mutation responses.
- Keyboard/dialog focus, validation announcements, unsaved-navigation behavior, narrow/wide responsive layouts, contrast, and zoom.

The source changes are implemented only. This document does not mark Calendar, Attendance, W1, or whole-Web acceptance verified or accepted.
