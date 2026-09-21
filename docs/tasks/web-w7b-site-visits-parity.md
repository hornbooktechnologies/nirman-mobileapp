# W7b Web Site Visits parity and review

Date: 2026-09-21. Status: implemented; focused checks passed; authenticated acceptance pending.

## Scope and dependencies

Audited current Mobile Sales/list/lead screens and services, Sales controller/DTO/service/repository, shared statuses/permissions, and existing Web Sales foundation before editing. No applicable AGENTS.md was found. Existing project access, timezone conversion, per-user/organization/project cache, dialogs, forms, lead detail/history and API transport were sufficient; no substantial Web prerequisite was missing. Only apps/web and task documentation changed. Existing Mobile/EAS/root configuration edits were preserved. No backend/database/Mobile changes, commit, push or deployment.

Routes: `/sales/site-visits` selects an authorized project; `/projects/[id]/sales/site-visits` lists visits; `?visit=<id>` gives a stable detail view using the same collection. Scheduling is on existing lead detail. Sidebar and Sales navigation include Site Visits. English-only semantic components and shared status vocabulary are reused.

## Mobile action → API → Web checklist

Paths are under `/organizations/:organizationId/projects/:projectId/sales`.

| Mobile action | API / fields | Web / permissions | Evidence |
| --- | --- | --- | --- |
| Schedule from lead | POST `/leads/:leadId/site-visits`; scheduledAt, attendeeCount; salesperson defaults to lead assignee or actor | Lead action/form; effective site-visits:manage, writable lead, active project; refresh server stage/history | Adapter, permission, timezone, attendee tests |
| List/filter/search | GET `/site-visits`; status, assignedSalesperson, scheduledFrom/To | URL status/date/salesperson filters, local customer/salesperson search; effective lead read grant before fetching; server-constrained OWN scope | Adapter/cancellation tests; source review |
| Visit details | Same collection; customer, salesperson/name, schedule, status, attendees, feedback, objections, next action, completion | Full card/detail fields, stable link and final read-only state | Source review; browser pending |
| Reschedule | PATCH `/leads/:leadId/site-visits/:visitId`; RESCHEDULED, scheduledAt, attendeeCount, outcome text | Working-timezone schedule required; only SCHEDULED/RESCHEDULED actionable; current-field preflight | Transition/snapshot/timezone tests |
| Complete/cancel/no-show | Same PATCH; status, attendeeCount, customerFeedback, objectionsConcerns, nextAction | Canonical outcomes; attendees 1–1000 integer; text limits 4000; current lead permission check | Rules/permission/adapter tests |
| History/outcomes | GET `/leads/:leadId/activities` and lead detail | Existing complete returned activity timeline, actor/time/details; links from visits and invalidation after save | Existing integration reused; cross-client pending |

No pagination, export, dedicated visit detail endpoint, availableActions, version or idempotency key is supplied by this API. None was invented. All matching records are displayed; search operates on the fetched collection. No financial calculation exists.

## States, isolation and design

- Authorized project resolution precedes data reads. Separate QueryClient per user/organization/project; query cancellation/cache clearing on unmount. Late mutation continuations check lifetime.
- Loading/refreshing, empty/filtered-empty, denied, inactive-project read-only, error/retry, submitting/success, stale/unavailable record and terminal read-only states.
- Reused labelled native controls, focus-trapped dialog, Escape/restoration, inline errors/invalid-field focus, wrapped actions/navigation, responsive cards, semantic tokens and announcements. Failed forms retain input; deliberate refresh reconciles records before resubmission. A changed visit refresh resets the form to current server values for review.
- Shared form blocks duplicate submits and confirms discarding edits. No automatic network mutation retry. Uncertain creates require checking list/history before retry; this is not an idempotency guarantee.
- ui-ux-pro-max guidance used for validation, announcements and keyboard focus. Generic Server Actions guidance was inapplicable to the established API architecture.

## Exact API requirements and discrepancies

No backend edit was made. Explicit authorization is required for these proposed changes:

1. **Atomic terminal/stale protection:** PATCH service checks status before a separate unconditional repository UPDATE. Two clients can both pass while scheduled, then overwrite a terminal outcome/reschedule. Web compares all mutable returned fields before PATCH but cannot close the race. Smallest fix: transaction-scoped row lock and transition validation or conditional status/revision UPDATE, with expected revision and conflict response. Test concurrent complete/reschedule/cancel. Required for guaranteed immutable outcomes under concurrency.
2. **Uncertain creation:** POST has no logical request key; a committed request with a lost response can be duplicated. Smallest fix: persisted request key/fingerprint and replay of the original result. Web requires refresh/reconciliation and never silently retries. Required for exactly-once retry guarantees.
3. **CUSTOM/TEAM scope:** `resolveLeadRead` chooses organization-level visibility before checking that exact project grant, so org read-all reduced to CUSTOM read-own may receive 403. Derive visibility from effective project grants. Visit list constrains OWN by salesperson but does not constrain TEAM by active team assignees like lead list; align the approved TEAM predicate across reads/writes. Test reduced CUSTOM, own/team/all and foreign projects. Web cannot securely repair API scope.
4. **Mobile navigation:** Mobile exposes Visits only with site-visits:manage; GET authorizes lead read scopes. Web follows API read access and separately gates writes. A visit salesperson may lose access to its reassigned lead; linked detail/update then correctly reports API denial.
5. **Mobile validation/timezone:** Mobile allows four-digit attendee text including values DTO rejects (0, >1000) and uses device-local schedule conversion/default time. Web follows DTO 1–1000 integer limits and the plan's organization timezone, rejecting invalid wall times.

No pagination/export exists on either client. Reminder/offline work remains outside current support.

## Verification and pending acceptance

- 12 focused Sales tests passed: effective permissions, user/org/project isolation, timezone/DST, retry messages, transport scope/cancellation, mutable snapshots, terminal states, attendee limits.
- Scoped Sales and new-route ESLint passed.
- Whole-Web type-check failed only at existing Workers `use-workers.ts:214,223,237,238` (non-async awaits/mutation return type); no Site Visits diagnostics.
- Whole-Web lint: six existing Attendance memoization / Organization Detail / Project Detail / Settings errors; no Sales errors.
- Production build retried outside the sandbox: font downloads succeeded; four existing build errors remain (Attendance invalid UTF-8 at byte 7088 and three Workers non-async awaits). No Site Visits build diagnostic; no successful integrated build claimed.
- Final `git diff --check` passed (line-ending warnings only).
- Browser inventory contained no authenticated tabs; no test identity/disposable cross-client fixture was supplied. Authenticated writes/browser acceptance were not run; no live business data was mutated.
- Pending: Owner/Sales/Viewer/CUSTOM direct-route/action matrix; Web schedule → Mobile outcome → Web refresh and inverse; expired session/lost-response recovery; keyboard/focus, 375/768/1024/1440/1920 widths and 200% zoom; two-client concurrency after API correction.

Review: source implemented and focused checks passed, not fully accepted. Whole-Web baseline blockers and API integrity/access limitations remain open.
