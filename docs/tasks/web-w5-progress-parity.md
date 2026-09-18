# W5 Web Project Progress — parity and review

Date: 2026-09-18. Implemented in `apps/web`; authenticated acceptance pending.

## Audit and dependencies

Reviewed W5, CODEX, Progress contract/status, Mobile screen/update sheet/services, API controller/DTO/service/repository, shared stages/types and Web components/access/cache patterns. No applicable AGENTS.md was found. Existing authentication, effective project access, API client and UI components support this slice. No additional package or substantial prerequisite is required. Unrelated dirty work was preserved; no Mobile/backend/database/seed changes, commit, push or deployment.

## Mobile action → API → Web checklist

Project base: `/organizations/:organizationId/projects/:projectId/progress`.

| Mobile action | API, inputs and permissions | Web implementation |
| --- | --- | --- |
| Summary and nine stages | GET `/summary`; `progress:read`; overallPercentage, completedStages, updatedStages, stages, latestUpdate | `/projects/[id]/progress`, server percentages, untouched versus recorded-zero state, latest date and actor |
| Filter/page history | GET `/history`; stage/dateFrom/dateTo/page/pageSize; `progress:read`; items/pagination | URL filters, 25-row pages, previous/current value, notes, actor/date/creation time, correction label |
| Record progress/regression | POST `/updates`; stage/percentage/updateDate/notes/expectedPreviousPercentage/idempotencyKey; active project and `progress:update`; refreshed summary | Presets/custom percentage, two-decimal validation, India date boundary, regression note, 2,000-character limit, inline error/focus, success |
| Conflict/retry | Same POST; version/idempotency conflict codes | Frozen observed baseline; explicit reload preserves draft and requires deliberate resubmission. Uncertain outcomes freeze original payload/key and expose exact retry; no automatic retry |
| Export | GET `/export`; stage/date filters; `progress:export` | Authenticated CSV of all matching history; cancel on workspace unmount |
| Portfolio service | GET `/organizations/:organizationId/progress/projects`; `progress:read`; authorized active project summaries | `/progress` portfolio with server overall/latest values; links also expose accessible inactive projects |
| Context/access | Existing project access summary/effective permissions | User/org/project-keyed disposable cache, cancellation, denied deep links, inactive read-only state and authorized navigation |

## UI and behavior

English only; existing Manrope, semantic tokens, controls, cards, dialog and loading state. Responsive stage grid and history cards; no invented metrics. Labelled native controls, dialog focus trap/restoration, announced results, loading/empty/filtered-empty/error/retry/denied/submitting/success/stale states. Unsaved close/link-navigation/unload confirmation and mounted mutation guards. No offline queue or cross-reload retry recovery claim.

## API authority and limitations

- API fixes dates to Asia/Kolkata; Mobile initializes/caps using device-local time. Web follows API time.
- Latest stage values follow update date, then creation timestamp and ID. Backdated observations can enter history without replacing summary values; the UI explains this and consumes the returned summary.
- Mobile resets the form when summary changes; Web retains the draft on conflict and explicitly reloads its observed baseline.
- Progress has no availableActions or numeric version field. Effective grants and active project gate writes; nullable expectedPreviousPercentage is the concurrency contract. Untouched null is never replaced by zero.
- Portfolio is unpaginated by API design; Web uses the authorized endpoint directly. Custom stages/weighting, approvals, edit/delete history, media attachments and offline writes are outside this API.

## Verification

- Seven focused Node tests passed: CUSTOM/foreign-project access and write gates; user/org/project cache isolation; precision/regression validation; India date boundaries; exact uncertain retry payload/key; real service adapter scope/cancellation/CSV and one-attempt transport behavior.
- Scoped ESLint passed for Progress feature/routes plus sidebar/navigation.
- Whole-Web type-check ran: only existing Workers errors in `features/workers/hooks/use-workers.ts` lines 214, 223, 237, 238 (non-async mutationFn contains await). No Progress diagnostics.
- Whole-Web lint ran and failed on six existing errors: Attendance callback dependencies (3), Organization Detail, Project Detail and Settings state-in-effect (3). No Progress diagnostics.
- Production build ran and failed on existing Attendance invalid UTF-8 and Workers non-async await parsing errors. These unrelated files were not repaired as part of W5.
- Final `git diff --check` passed (line-ending notices only).
- Browser inventory had no open/authenticated session. No supplied authorized test identity/disposable cross-client fixture was available. Authenticated write/read/replay/conflict/export, Web ↔ Mobile outcomes, archived/CUSTOM roles, keyboard/screen-reader/zoom and 375–1920px visual checks remain pending. Static checks do not establish runtime acceptance.

## Backend requirement

None identified for W5. All requested workflows use existing endpoints.
