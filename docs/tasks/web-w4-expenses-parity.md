# W4 Site Expenses Web parity and review

## 1. Status

- Date: 2026-09-18. Implemented in Web source; focused verification passed; authenticated/browser/cross-client acceptance pending.
- Scope: `apps/web` and relevant documentation only. No Mobile, API, shared contracts, database, migrations, or seeds changed by this task. No commit, push, or deployment.
- Preserved existing `next.config.ts` and `api-client.ts` changes and concurrent Mobile Wages/localization/Wages-documentation work.

## 2. Scope reviewed and prerequisites

Read W4 and Web design/security requirements, `CODEX.md`, Expenses contracts/status, Mobile screens/services/types, API controller/DTO/service/repository, shared types/constants, Project Access, and Web auth/cache/UI patterns. No applicable `AGENTS.md` was found in the repository or checked ancestor directories.

EXISTING: API-ready workflows, effective Project Access, authenticated API client, React Query, semantic tokens, dialogs, fields, cards, status badges and date utilities. MISSING: Web Expenses feature/routes/navigation. No substantial new foundation dependency was necessary. No dependencies installed. The separate marketing website is untouched.

UI uses English, existing branding/tokens, 16px forms, 14px operational rows, desktop financial comparisons and narrow-screen cards, visible labels, inline announced validation with first-error focus, shared keyboard-trapped/restoring dialogs, and touch-sized controls. ui-ux-pro-max validation guidance informed field feedback; generic Server Actions guidance does not replace the NestJS API client.

## 3. Implemented work

- `/expenses`: permission-filtered project chooser.
- `/projects/[id]/expenses`: workflow, server summary, search, status/category/payment/date/recorder filters, supported sorting, pagination, authenticated filtered CSV, create/draft and configuration dialogs.
- `/projects/[id]/expenses/[expenseId]`: amounts, payment/vendor/recorder/approval metadata, workflow snapshot, version, rejection reason, immutable adjustments and status-event history, all server-authorized actions.
- Sidebar uses effective project permissions; Project Detail links to Expenses.
- Protected reads begin after authorized project resolution. Separate cache instances are keyed by user/organization/project, cancel and clear on unmount; late mutation/export callbacks cannot update a new workspace.
- Financial commands never automatically retry. Uncertain attempts freeze the full original payload, expected version and UUID key. Definite validation failures allow correction. Conflicts require reloading/reviewing current server amounts/status/actions before deliberate resubmission. Pending writes lock duplicate submissions.
- Loading, refreshing, empty/filtered-empty, retry/error, denied access, inactive-project read-only, submitting, success, uncertain-response and stale-record states. Inputs survive validation/conflict failures; close/link navigation and page unload guard unsaved input.

## 4. Mobile action → API → Web checklist

Paths are relative to `/organizations/:organizationId/projects/:projectId/expenses`. All rows use effective project grants and API authorization.

| Mobile action | API and request | Response / permission authority | Web equivalent / evidence |
| --- | --- | --- | --- |
| Project / Expenses access | Existing Project Access API, then Expenses reads | Authorized IDs, effective permissions, project status | Chooser, direct-route guard, sidebar; grant/cache tests |
| List, search, filters, load more | `GET /`: page/pageSize/search/status/category/paymentMethod/recordedByMemberId/expenseFrom/expenseTo/sortBy/sortOrder | `SiteExpenseListResponse.items`, pagination; `expenses:read` | Desktop table/narrow cards, Previous/Next, URL filters; transport filter tests |
| Summary | `GET /summary`, current filters | approvedOriginalAmount, adjustmentTotal, recognizedAmount, pendingAmount/count | Four server-fed summaries; no local recognized-cost formula; response identity test |
| Read/configure workflow | `GET /settings`; `PUT /settings`: workflowMode/idempotencyKey | configured/workflowMode; `expenses:read` / `expenses:configure` | Direct/Approval radio dialog; stable settings retry test |
| Record now / draft | `POST /`: expenseDate/category/description/amount/paymentMethod/vendorPayee/saveAsDraft/idempotencyKey | Server detail/status/actions; `expenses:create` | Create dialog, submit versus draft, saved detail; money/transport tests |
| Edit draft/rejected | `PATCH /:id`: editable fields, expectedVersion/idempotencyKey | Current version/status/actions; `expenses:update`, API recorder/elevated restrictions | Edit dialog, exact uncertain retry; stale review |
| Submit / resubmit | `POST /:id/submit`: expectedVersion/reason/idempotencyKey | Snapshot DIRECT → APPROVED, APPROVAL_REQUIRED → PENDING_APPROVAL; `expenses:update` | Confirmation for server-advertised draft/rejected records |
| Approve / reject | `POST /:id/approve` or `/reject`: expectedVersion/reason/idempotencyKey | API recorder/reviewer separation; `expenses:approve` / `expenses:reject` | Server actions intersect effective grants; rejection reason; self-approval withholding test |
| Cancel pre-approval | `POST /:id/cancel`: reason/expectedVersion/idempotencyKey | API lifecycle/ownership; `expenses:update` | Reason confirmation; no cancellation invented for approved/cancelled records |
| Immutable correction | `POST /:id/adjustments`: signed amount/reason/expectedVersion/idempotencyKey | Server recognizedAmount/adjustmentTotal; `expenses:adjust` | Increase/decrease, validate magnitude/lower bound against latest server value; signed transport/retry/boundary tests |
| Detail / history | `GET /:id` | Metadata, events, adjustments, availableActions/version | Full detail/timelines, working-timezone timestamps, date-only formatting |
| CSV share | `GET /export`, current filters | API CSV; `expenses:export` | Authenticated download, error/retry, object-URL cleanup; export filter/signal test |

## 5. Verification

- `node --test src/features/expenses/expense-rules.test.mjs src/features/expenses/services/expenses.service.test.mjs` from `apps/web`: **11/11 passed**, elevated after sandbox `spawn EPERM`. Tests cover grants, server actions, cache scope, financial inputs/adjustment bounds, exact retries, conflict handling, API verbs/payloads, export filters and no automatic financial retry.
- Focused ESLint on Expenses, all three routes, navigation and sidebar: **passed**. Project Detail has an existing effect issue below; only its Expenses link was added here.
- `pnpm --filter @nirman-app/web type-check`: **blocked by existing Workers errors** in `use-workers.ts:214,223,237,238`: non-async mutation containing `await`, incompatible mutation return type. No Expenses errors reported.
- `pnpm --filter @nirman-app/web lint`: **blocked by six existing errors**: Attendance `mark-attendance-page.tsx:176,183` memoization (three findings); Organization Detail `:68`, Project Detail `:42`, Settings `:83` effect-state findings. Initial Expenses lint findings were fixed.
- `pnpm --filter @nirman-app/web build`: **blocked by existing** Attendance `attendance-page.tsx` invalid UTF-8 at byte 7088 and Workers `await` syntax errors at 223/237/238.
- `git diff --check`: **passed**. No unrelated baseline fixes included.

## 6. Runtime smoke and acceptance

Available browser inventory has no authenticated tab/session; no test credentials or disposable cross-client fixtures were supplied. No live financial records were created/modified. Static/focused checks do not establish runtime acceptance.

Pending: Owner/Contractor/Supervisor/Viewer/CUSTOM/Platform role matrix; Direct and Approval writes; Web create → Mobile review → Web refresh and reverse; stale versions/concurrent adjustments/timeout recovery; context changes with in-flight requests; archived projects; summary/CSV parity; expired sessions; keyboard/focus, 200% zoom and 375/768/1024/1440/1920px visual checks. Resolve whole-Web baseline errors before release acceptance.

## 7. API authority, discrepancies and backend requirements

- Rejected-record edits preserve `REJECTED` in the current API; `/submit` accepts `DRAFT` and `REJECTED`. Older contract transition text suggests `REJECTED → DRAFT`; Mobile uses the existing API without a local transition. Web follows executable API behavior.
- Future-date validation uses `Asia/Kolkata` in both API and Mobile. Web follows that boundary; event display uses the organization working timezone.
- Mobile requires two characters for reject/cancel reasons while the service accepts any non-empty reason. Web preserves Mobile's two-character UX validation; DTO length bounds remain enforced.
- Settings do not rewrite existing snapshots. A create retry can conflict after a settings change because the API fingerprint includes workflow mode; Web preserves the original attempt and exposes that conflict rather than inventing another creation.
- **No required workflow is missing from the API; no backend change is requested.** Receipts, offline financial writes and automatic Materials-to-Expense creation remain deferred by the existing module scope.

## 8. Recommendation

Source implementation and focused checks are complete. Keep acceptance pending until whole-Web baseline errors are fixed and an authorized test environment is available for the runtime matrix.
