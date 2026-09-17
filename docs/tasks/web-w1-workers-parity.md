# W1 Web Workers functional parity

Date: 2026-09-17. Status: implemented in source, verification not run at the Product Owner's explicit request. Detailed assignment-rate history remains blocked by a missing read API. This does not mark W1, W0, or Workers accepted.

## Scope and source audit

Read CODEX.md, the module-development and ui-ux-pro-max skills, the Web implementation plan, Workers contract, shared Workers types, current API controller/DTO/service/repository, Mobile Workers screen/services, and existing Web components/services/hooks. No applicable AGENTS.md was found in the repository or inspected ancestor locations. Existing dirty work was retained. Changes are limited to apps/web and implementation documentation; no Mobile, shared package, API, database, migration, seed, dependency, commit, push, or deployment work was performed.

EXISTING: worker list/search/status/trade filters and pagination, master create/update, duplicate warnings, assignment create/date-edit/end, effective-dated rate change, attendance detail, deactivation and permanent-delete confirmations.

MISSING/NEEDS_CHANGE: Web primary-period services and actions; linked-period consent when ending assignments; actual onboarding date guidance and authorized initial project choice; visible labels and failure/loading/submitting/success feedback; project action permissions and organization context checks.

## Implemented parity map

All paths below are relative to `/organizations/:organizationId` and use existing shared inputs and responses.

| Mobile/API behavior | Existing API | Web implementation | Evidence |
| --- | --- | --- | --- |
| Primary-project history, current and scheduled allocation | GET `/workers/:workerId/primary-project-periods` | Worker Profile allocation panel displays current/scheduled/past dates, loading/empty/error/retry and refresh states | Source implementation only |
| Set/change primary project by effective date | POST period; PATCH same-start replacement; POST period end followed by POST replacement | Change primary project uses fresh history, bounds the replacement by assignment/source/next scheduled period, preserves subsequent periods, and reports partial/uncertain failure without claiming rollback or automatically retrying writes | Source implementation only |
| Create, correct, end individual periods | POST `/workers/:workerId/primary-project-periods`; PATCH `/:periodId`; POST `/:periodId/end` | Labelled date/assignment dialog with inclusive dates, assignment bounds, historical-impact explanation, preserved failed input, pending guards, and server overlap/conflict feedback | Source implementation only |
| Actual project start on onboarding | POST `/workers`, `projectId`, `startsOn`, master identity/rate/duplicate acknowledgement | Existing WorkerForm extended; authorized project choice, required actual project start date, explanation that the API atomically creates assignment and initial primary allocation | Source implementation only |
| Assign and correct assignment dates | PUT `/projects/:projectId/workers/:workerId`; PATCH `/assignment` | Existing ProjectWorkersPanel retained; visible labels, pending guards, in-dialog failures and success feedback; full paginated roster loaded so assignment state is not based only on page one | Source implementation only |
| End assignment and linked primary allocation | POST `/end-assignment`, `endsOn`, `reason`, `endPrimaryPeriod` | Loads linked periods, blocks later-period conflicts, requires explicit checkbox consent to close overlapping periods, validates non-future end date and retains history | Source implementation only |
| Effective-dated rate change | POST `/assignment/rate-change`, `dailyRate`, `effectiveDate`, `reason` | Existing flow retained; blank/negative rate validation, assignment/non-future date bounds, effective project permissions, INR presentation, pending and error states | Source implementation only |
| Worker details and attendance | GET worker; existing canonical worker attendance endpoint | Existing tabs/history retained; project-specific attendance links and selector filtered by effective attendance permission; notes available read-only | Source implementation only |

Organization identity comes from the authenticated workspace; foreign-organization URL parameters require switching workspace. The existing organization selector refreshes authenticated organization access. Worker page and Project panel local state reset on identity/context changes. Existing React Query keys remain organization/worker/project scoped; allocation and assignment changes invalidate related Worker, Attendance, and Wage data in the current query client. Project actions use project-access/me effective permissions (including CUSTOM grants), and archived projects are read-only. The server remains authoritative, including permissions that depend on Attendance/Wage history and periods outside the user's visible scope.

The UI keeps existing NirmanSite components, theme and routes. It is English-only. Primary-period forms use native date validation, visible labels/asterisks, retained input, announced errors and focused failure summaries. Existing Dialog handles focus trapping/restoration. Forms prevent duplicate submission and pending dismissal. Primary transfer is intentionally not claimed to be atomic: the existing API exposes separate operations, as used by Mobile. Individual correct/end controls remain available for recovery.

Worker master forms, filters, organization switching, duplicate acknowledgement, existing destructive confirmations, assignment management, rate changes, and attendance history were extended in place rather than replaced by parallel modules. Project worker selection now supports pagination; its roster is fetched in API-sized pages to accurately identify assigned workers. Primary history remains an unpaginated existing API response.

## Exact API limitation: detailed rate history

The Workers controller exposes a rate-change write endpoint but no assignment-rate-history GET endpoint. `WorkerProjectAssignmentSummary` and `WorkerDetail.assignments` return the current `dailyRate`, not effective rate rows, reasons or change metadata. The repository writes `worker_assignment_rate_periods`; those persisted rows are not exposed through Workers responses. Current Mobile services likewise have no history reader. Web therefore shows current assignment rate snapshots and a clear explanation instead of fabricating historical rows. Existing Wages rate breakdowns remain in Wages.

Smallest proposed backend addition, requiring explicit authorization: a read-only, project-scoped GET `/organizations/:organizationId/projects/:projectId/workers/:workerId/assignment/rate-history`, protected by effective `workers:read`, returning assignment IDs with the existing effective-from date, daily rate, reason and change metadata. It must validate tenant/worker/assignment ownership, support ended assignments explicitly, and define ordering/pagination. No schema or new business rule is proposed. Add a shared response type and a Web history reader only after that authorization. This limitation blocks detailed history, not the implemented effective-dated rate-change flow.

## Verification and pending acceptance

**NOT RUN as requested:** tests, type-checks, lint, builds, diff/whitespace checks, browser verification, runtime/API requests, database checks and cross-client acceptance. No verification success is claimed. Source inspection and editing only were performed.

Pending a separately authorized verification task: TypeScript/lint/build checks; authenticated Owner/Supervisor/CUSTOM permission matrix; backdated onboarding; current/scheduled transfers including partial failure; correction overlap/window rejection; explicit linked-period ending and future conflict; zero/decimal/elevated-permission rates; organization/project switches and stale responses; duplicate submissions; paginated assignment selection; historical attendance links; keyboard/focus/accessibility and responsive/zoom acceptance. Full detailed rate-history acceptance also requires the authorized read API above.
