# W7a Web Sales Leads, Activities and Follow-ups

Date: 2026-09-18. Status: implemented; focused checks passed; authenticated acceptance and backend limitations remain open. This is an implementation/review checklist, not a new business contract.

## Scope and audit

Web routes: `/sales/leads`, `/sales/follow-ups`, `/projects/[id]/sales/leads`, `/projects/[id]/sales/leads/[leadId]`, `/projects/[id]/sales/follow-ups`. Feature: `apps/web/src/features/sales`. Sales sidebar and Project Detail links use effective project permissions.

EXISTING: Sales API/controllers/DTOs/service/repository, Mobile screens/services, shared constants, auth/project-access, React Query, API client and semantic components. MISSING -> IMPLEMENTED: W7a Web adapters, hooks, screens, forms, navigation and tests. No substantial missing Web foundation. Existing unrelated dirty work, including concurrent changes, was preserved. This slice changed Web/documentation only; no Mobile/API/database/seed changes, commit, push or deployment.

Reused Manrope, semantic warm surfaces, Card/Input/Select/Dialog/Button/StatusBadge, inline errors, first-invalid-field focus, focus-trapped dialogs, discard confirmation, 44px controls and responsive grids. UI skill keyboard/readability guidance was adopted; unrelated suggested branding/marketing layouts were rejected. W7b Site Visits, W7c inventory administration/interests/holds and W7d bookings remain separate. Interested-unit selection only consumes existing inventory read. There is no Sales export endpoint; reserved `sales-reports:read` does not imply an export.

## Mobile action -> API -> Web checklist

Paths are relative to `/organizations/:organizationId/projects/:projectId/sales`.

| Mobile action | API / inputs | Web / permission | Evidence |
| --- | --- | --- | --- |
| Lead list/search/stage | GET `/leads`; search, stage, assignedTo, page, limit | URL filters, explicit search submit, server count/pagination and detail links; effective read-own/team/all | Pagination/filter/cancellation adapter test; permission tests |
| Create lead | POST `/leads`; customerName, primaryMobile, alternateMobile, email, preferredUnitType, budgetMin/Max, purchasePurpose/Timeline, source/detail, priority, assignedTo, interestedUnitId | Validated form and created detail; leads:create, other assignee requires leads:assign | DTO/source review and adapter tests; runtime pending |
| Detail/edit | GET/PATCH `/leads/:id`; canonical editable fields | All identity/source/budget/assignment/creator/conversion/timestamp fields; leads:update plus visibility | Own-scope permission tests; current-record preflight |
| Stage/Lost | PATCH `/leads/:id`; currentStage, lostReason | Canonical stages, BOOKED excluded, Lost reason required | Service/DTO parity review; runtime pending |
| Assign/reassign | PUT `/leads/:id/assignment`; assignedTo | Named eligible member options when readable, exact assign versus reassign gate | Permission distinction test |
| Timeline | GET `/leads/:id/activities` | Complete returned history, actor/time and expandable details; lead read access | Source review; runtime pending |
| Call/note/brochure activity | POST `/leads/:id/activities`; activityType, summary, details | Three supported manual types; leads:update; timeline refresh | Source review; no automatic transport retry test |
| Schedule follow-up | POST `/leads/:id/follow-ups`; assignedUserId, scheduledAt, type, notes | Working-timezone schedule, shared types, server-default assignee; followups:manage plus visibility | Timezone/DST tests; duplicate runtime case pending |
| Follow-up list | GET `/follow-ups`; status, assignedTo, from, to | URL filters, whole-day timezone bounds, all returned matching rows, notes/outcome/next time/completion | Timezone tests; role matrix pending |
| Complete/update follow-up | PATCH `/leads/:leadId/follow-ups/:id`; status, outcome, notes, nextFollowUpAt | All DTO statuses, prefilled existing text, deliberate submit and stale preflight | Adapter/permission tests; terminal discrepancy below |

Blank optional lead inputs are omitted, matching Mobile, and preserve existing values. Follow-up edit preloads notes/outcome/next time because omitted optional values are replaced with null by the endpoint. `nextFollowUpAt` records metadata only; it does not change `scheduledAt` or create another follow-up. The form explains this.

## Isolation and failures

- Resolve accessible projects for the active organization before protected queries. No arbitrary organization ID from the URL. API remains authorization authority.
- Separate QueryClient per user/organization/project; cancel/clear on unmount. Keys include organization/project/entity/filters; GETs accept cancellation. Late create responses cannot navigate another workspace; preflighted writes stop if the workspace unmounted.
- Loading, refreshing, empty/filtered-empty, denied, archived/read-only, submitting/success and error/retry states. Failed forms retain input and require refresh before deliberate resubmission.
- No automatic network mutation retries were added; shared 401 refresh behavior remains. These APIs expose no availableActions, versions or idempotency keys, so none are fabricated. Current-record comparisons detect observed changes but cannot provide atomic concurrency protection. Reconcile uncertain creates against list/timeline before resubmitting.
- Lead list adapter preserves top-level `meta`, which generic API envelope unwrapping would discard. Follow-ups and activities are genuinely unpaginated, not fake client pages.

## Exact backend requirements and discrepancies

1. **CUSTOM read scope:** `SalesService.resolveLeadRead` selects read-all/team/own from organization permissions before checking that exact project grant. An organization read-all actor with CUSTOM project read-own can be denied on leads/detail/follow-ups. Web surfaces denial. Smallest fix: derive visibility from resolved effective project permissions. Test CUSTOM reductions, own/team/all and foreign projects.
2. **TEAM scope inconsistency:** listLeads filters active project-team assignees; `assertLeadVisible` checks OWN only, and listFollowUps filters OWN only. TEAM detail/follow-ups may therefore be broader than the lead list. Smallest fix: reuse the approved active-team predicate for detail, writable-lead checks and follow-up queries. Web does not invent its own security authority.
3. **Follow-up transitions:** repository update accepts every DTO status regardless of current status; repeated completion updates the completion timestamp and appends another event. Mobile only exposes Complete on SCHEDULED. Web follows the API, exposes status updates, and does not claim immutable terminal protection. RESCHEDULED/nextFollowUpAt does not move scheduledAt. Smallest change for terminal/reschedule guarantees: approved transition validation under a row lock and an explicit replacement schedule/new-follow-up operation. Transition policy and backend edits require owner authorization.
4. **Atomic stale/retry protection:** lead create/update/assignment and manual activity endpoints lack logical request keys and expected revisions. Follow-up create has duplicate uniqueness, not a general idempotent response contract. Smallest extension: fingerprint logical create keys and accept expected revision on updates, returning conflicts/current state. Web preflight cannot eliminate the read/write race.
5. **Assignee discovery:** project member lookup requires project-members:read; organization-wide discovery additionally requires members:read. A Sales-only custom assigner cannot load a complete named picker (Mobile has the same dependency). Web offers server-validated user-ID entry when options are unavailable. Smallest improvement: minimal Sales eligible-assignees endpoint authorized for the Sales action, covering active organization-wide and date-eligible project members without membership-admin access.
6. **Large histories:** activities/follow-ups have no pagination. Server pagination is a future volume prerequisite; no endpoint or global totals were invented.

No backend changes were made. Explicit authorization is required before addressing these backend items.

## Verification and remaining acceptance

- Seven focused Node tests passed: own/effective grants, assign/reassign, user/org/project cache separation, timezone/DST/invalid dates, uncertain retry/access messages, metadata/filter/cancellation preservation, command scope/payload/verbs and no automatic write retry.
- Sales/routes scoped ESLint passed. Whole-Web type-check ran: existing Workers `use-workers.ts:214,223,237,238` errors (Promise return type and await in non-async function); no Sales diagnostics after correction.
- Whole-Web lint ran: existing Attendance memoization and Organization Detail/Project Detail/Settings effect-state errors. Sales issues on the first run were corrected and focused lint rerun.
- Production build attempted: blocked by existing Attendance invalid UTF-8 at byte 7088 and Workers non-async await parsing. No integrated build success claimed.
- Browser smoke: local `/sales/leads` compiled and returned 200, then redirected the unauthenticated browser to `/login`. Local API refresh on port 4000 failed with ECONNRESET. Authenticated functionality was not verified. The temporary port-3011 dev server was stopped after this check.
- `git diff --check` passed for tracked changes (line-ending warnings only).
- Authenticated Owner/Sales/Viewer/CUSTOM matrix, expired-session/action denial, two-browser concurrency, responsive/zoom/keyboard and Web-create -> Mobile-read -> Web-refresh acceptance are pending. No authenticated browser session/disposable fixture was supplied; no live business records were changed.
- Review: source implemented, not fully accepted. Whole-Web failures and backend requirements remain explicit.
