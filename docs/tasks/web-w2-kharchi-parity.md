# W2 Kharchi Web parity — 2026-09-17

## 1. Status

Implemented in Web; focused tests pass. Whole-Web checks and authenticated acceptance are tracked below. This does not mark all W0/W1 work accepted.

## 2. Scope reviewed

Reviewed the Web implementation plan, CODEX.md, module contract/status, Mobile list/detail/create/correction screens and services, API controller/DTOs/service/repository, shared Kharchi vocabulary, Workers roster authorization, project-access service, Web auth/cache/UI/navigation and current dirty tree. No applicable AGENTS.md was found in the repository/ancestor paths inspected.

Only apps/web and documentation changed. Existing Mobile, backend, shared, database, migration, seed and unrelated Web changes were preserved. No dependencies added, commits, push or deployment.

## 3. Implemented work

Routes: `/kharchi` authorized project selection, `/projects/[id]/kharchi` list and recording, `/projects/[id]/kharchi/[advanceId]` detail and correction. Sidebar and Project Detail links use effective Kharchi access.

Uses existing components and semantic tokens with readable text, responsive cards, labelled fields, 44px controls, focus-managed dialogs, inline validation, busy/error/retry/success states and discard confirmation. Generic skill palette/font recommendations were rejected in favor of the existing NirmanSite theme and Manrope.

## 4. Mobile action → API → Web checklist

Endpoint prefix: `/organizations/:organizationId/projects/:projectId`.

| Mobile action | Existing API / payload and result | Web / effective permission | Evidence |
| --- | --- | --- | --- |
| List, search, status/method filters, pagination and refresh | GET `/kharchi`; search, status, paymentMethod, page/pageSize; items + pagination | Responsive advance cards, filters, totals, previous/next, empty/error/retry; `kharchi:read` | Shared response types; scoped query hooks |
| Project summary | GET `/kharchi/summary`; workerId, workerAssignmentId, startDate/endDate; original/adjustment/effective/deducted/outstanding strings and workers | Server balances, date and worker filters; summary explicitly excludes search/status/method filters | No client balance calculation |
| Worker/date selection | GET `/workers`; date, ACTIVE, CURRENT, search, page/pageSize, name sort | Searchable paginated selector, cleared selection on date/search/page change; `workers:read` | Current Workers DTO/service inspected; no first-100 truncation |
| Record paid advance | POST `/kharchi`; workerAssignmentId, amount, requestDate, paymentMethod, paymentReference, notes, idempotencyKey; detail | Record form, positive two-decimal amount, bounded text, eligible assignment validation; `kharchi:create`, ACTIVE project | Financial input and stable retry tests |
| Detail and original facts | GET `/kharchi/:id`; original/effective/deducted/outstanding, status, date paid, recorded timestamp/actor/reference/notes | Stable detail route, assignment-ledger link, permission/error/retry states; `kharchi:read` | Shared detail type |
| Immutable signed correction | POST `/kharchi/:id/adjustments`; signed amount, mandatory reason, idempotencyKey; refreshed detail | Increase/decrease with reason, paise boundary validation; `kharchi:adjust`, ACTIVE project | Over-correction and uncertain retry tests; server rejection refreshes stale balance |
| Adjustment and wage history | Detail adjustments and deductionAllocations, reversedAt/reversedBy/reversalReason | Full correction and deduction/reversal ledger with wage batch/item IDs | Server totals retained; reversals never subtracted again in client |
| CSV sharing | GET `/kharchi/export`, current supported list filters | Authenticated browser CSV download, busy/error state and URL cleanup; `kharchi:export` | Uses existing authenticated Axios client; no page-size truncation |
| Project context and denied states | GET `/organizations/:id/project-access/me` | Effective CUSTOM permissions before data hooks mount; isolated cache/form state keyed by user/org/project; non-ACTIVE projects read-only | Permission and query-key tests; late CSV results discarded after scope unmount |

Additional API-supported date/worker/assignment filters and sorting are implemented. Applied list filters/page persist in the URL; assignment-ledger links apply the assignment filter. Clear all resets applied and draft filters. Summary worker options are unfiltered so changing date/worker filters does not remove other choices.

## 5. Verification

- Five Node tests passed: effective permission denial, org/project query-key separation, invalid financial values and exact paise over-correction, immutable original payload/key across retries, uncertain versus rejected failures. Initial sandbox run hit spawn EPERM; approved rerun passed.
- Targeted Kharchi feature/routes lint passed again after the final URL-state additions (`pnpm --filter @nirman-app/web exec eslint src/features/kharchi "src/app/(app)/kharchi" "src/app/(app)/projects/[id]/kharchi"`).
- Web type-check ran after the Kharchi roster adapter fix: no Kharchi errors; blocked by existing `features/workers/hooks/use-workers.ts` non-async mutation function containing await (lines 214, 223, 237, 238).
- Full Web lint ran: six unrelated errors in Attendance manual memoization and Organization Detail, Project Detail, Settings state-setting effects. Existing lines were preserved.
- Scoped diff check passed. Repository-wide diff check reports existing trailing whitespace in `features/workers/components/project-workers-panel.tsx`.
- Production build attempted: blocked by the existing Workers non-async await errors and invalid UTF-8 in `features/attendance/components/attendance-page.tsx` (byte index 7088). The sandbox run also failed to fetch Google Fonts; the approved network-enabled rerun fetched the fonts successfully and remained blocked only by those unrelated source errors.

## 6. Runtime smoke / remaining acceptance

Available browser inventory had no open authenticated sessions. No authorized test credentials or deliberate test financial fixtures were supplied. No financial data was mutated for verification.

Pending: authenticated browser rendering; 375/768/1024/1440/1920 widths and 200% zoom; keyboard/focus/contrast review; Owner/Supervisor/Viewer/CUSTOM and denied direct URLs; expired session; archived/non-active project; concurrent over-correction; interrupted request retry; CSV content; org/project switching during reads/writes; Web create → Mobile refresh and Mobile correction → Web refresh; wage confirmation/cancellation reflected in both clients.

## 7. API differences and backend requirements

- No backend change is required for the implemented core workflow. Kharchi supplies no `availableActions` or record version field. Web uses effective permissions/status and the API's transactional current-balance validation, without inventing expectedVersion.
- Both clients depend on Workers roster read authorization. A CUSTOM user with `kharchi:create` but no `workers:read` cannot select a worker: GET `/workers` is rejected by `WorkersService.findProjectRoster`. Web explains the dependency instead of presenting a failing picker. If independent create-only access is required, the smallest proposed backend addition is a Kharchi-scoped eligible-worker lookup authorized by `kharchi:create`, returning only assignment/name/code/trade and applying existing date/tenant/project checks. That permission-policy change requires explicit authorization; none was made.
- Mobile rotates the retry key after editing an attempted request. Web freezes the original payload/key after an uncertain network/server outcome until the deliberate retry resolves, preventing accidental duplicate recording. Confirmed validation rejections permit edits/new keys.
- Mobile's eligible picker reads at most 100 workers. Web uses existing server search/pagination.
- Summary does not support status, payment method or search. The UI states this and does not manufacture filtered totals. Per-worker summary/detail history are unpaginated API responses; large-history volume acceptance remains pending.

## 8. Required fixes before acceptance

Resolve the unrelated whole-Web compilation/lint errors in their owning slices, then run the authenticated/cross-client matrix. Do not label this module runtime-accepted from static tests.

## 9. Recommendation

Proceed with authorized acceptance testing when the environment and test fixtures are available. Preserve the current backend contract.
