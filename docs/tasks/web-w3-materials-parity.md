# W3 Web Materials parity and review

## 1. Status

- 2026-09-17: implemented in source; focused verification recorded below; authenticated/browser/cross-client acceptance pending.
- Scope: `apps/web` and documentation only. No Mobile, API, shared contract, database, migration, seed, dependency, commit, push, or deployment changes.
- Audited current Mobile Materials screens/services, API controller/DTO/service/repository, shared Materials vocabulary, project access, Web API client/components, CODEX, and the W3 implementation slice. No applicable AGENTS.md was found.
- Existing effective-project access, auth timezone, React Query, API transport, Dialog, Input, Select, Card, StatusBadge, and theme tokens were sufficient prerequisites. Unrelated dirty work was preserved.

## 2. Implemented work

Entry `/materials` selects an authorized project. `/projects/[id]/materials` provides workflow settings, filtered server summary, search, statuses, required-date range, requester/responsible-member filters, sorting, pagination, draft creation and authenticated CSV download. `/projects/[id]/materials/[materialId]` provides request/fulfilment details, edit, submission, approval decisions, cancellation, split purchases, partial deliveries, and immutable history. Sidebar and Project Detail link to Materials using effective project permission checks.

English-only presentation reuses NirmanSite components, Manrope and semantic tokens. Operational text is 16px, metadata at least 14px in new content, controls at least 44px, two-column forms/cards collapse on narrow screens, and dialogs retain the existing focus trap/restoration and Escape behavior. No fixtures or invented metrics are imported from design previews. UI/UX skill recommendations for functional grids, focus and readability were applied; generic replacement palette/font/marketing hero/Server Actions suggestions were not adopted.

## 3. Mobile action → API → Web checklist

Paths below are relative to `/organizations/:organizationId/projects/:projectId/materials`.

| Mobile action | API / request | Permission / authority | Web implementation / response |
| --- | --- | --- | --- |
| Read/configure workflow | GET/PUT `/settings`; `workflowMode` | `materials:read` / `materials:configure`; active project for write | Settings dialog; configured state; all three shared modes; explains snapshots on existing requests |
| List/search/filter/load more | GET `/`; page/pageSize/search/status/requiredFrom/requiredTo, member filters, sortBy/sortOrder | Effective `materials:read` | List cards, URL filter state, previous/next; API pagination/quantities/status |
| Summary | GET `/summary`; same filters | `materials:read` | API total/overdue/estimated/purchase totals; distinct retry state |
| Create draft | POST `/`; name/category/quantity/unit/custom unit/request date/required date/estimate/responsible member/notes/key | `materials:create`, active project, configured workflow | Draft form, searchable authorized member selector; detail navigation on success |
| Edit draft/returned | PATCH `/:id`; same fields + expectedVersion/key | `materials:update` and server `EDIT` | Prefilled form; preserves responsible member when member-read permission is absent |
| Submit | POST `/:id/submit`; expectedVersion/comment/key | `materials:update` and server `SUBMIT` | Explicit confirmation; status comes from returned detail, never inferred locally |
| Verify / approve | POST `/:id/verify`, `/:id/approve`; expectedVersion/comment/key | `materials:approve-level-1` / `materials:approve-final` plus availableActions | Server-derived buttons; self-approval restrictions remain API-owned |
| Return / reject | POST `/:id/return`, `/:id/reject`; required comment/version/key | `materials:reject` plus availableActions | Required reason, inline validation, confirmation, returned history |
| Cancel | POST `/:id/cancel`; required reason/version/key | `materials:update` plus availableActions; API ownership guard | Confirmation, reason, immutable timeline; no delete |
| Split purchases | POST `/:id/purchases`; orderedQuantity/vendorName/orderReference/unitCost/totalCost/purchasedOn/notes/version/key | `materials:record-purchase`, availableActions | Purchase form; server total/quantity authority; all purchase rows; no Expense creation |
| Partial delivery | POST `/:id/deliveries`; deliveredQuantity/date/reference/optional purchaseId/notes/version/key | `materials:record-delivery`, availableActions | Purchase selector, partial delivery form, all delivery rows and server remaining quantity |
| Request/history | GET `/:id` | `materials:read` | Full request metadata, costs, purchases, deliveries, actor/comment/time/previous-next timeline |
| CSV sharing | GET `/export`; same filters | `materials:export` | Existing authenticated API client downloads full filtered server CSV, not only current page |

All rows are implemented. Runtime parity of each row still requires authenticated acceptance.

## 4. Integrity and error handling

- Cache provider lifetime is keyed by user, organization and project, and cleared/cancelled on unmount. Data query keys include organization/project/id/filter. Protected feature requests start only after `/project-access/me` resolves the exact permitted project. Read failures do not expose stale action buttons. Project archive disables all writes.
- Mutations do not auto-retry. An uncertain failure freezes the original payload, version and UUID key; Retry submits that exact attempt. Definite rejection releases the attempt. Duplicate submission is synchronously locked. Unmounted create/export callbacks cannot navigate/download into a different context.
- Version/idempotency/state/quantity conflicts require explicit reload/review before another submission. Input is preserved; the current version and requested/ordered/delivered quantities are displayed in the form. A create idempotency conflict requires checking the list before starting a new draft.
- Reasons, date order, positive quantities (3 decimal places), nonnegative costs (2 decimals), custom units and DTO text limits are enforced. API errors remain visible. Purchase totals are never independently calculated in Web.
- Draft/action forms confirm discard and warn before leaving an uncertain attempt; pending operations cannot be dismissed through the dialog. Forms supply inline errors and first-error focus. Loading, refresh, empty, retry, submitting, success, unavailable-access, stale and archived states are represented.

## 5. Source discrepancies and backend requirements

No backend change is required to implement the current Mobile workflows.

1. API `availableActions()` advertises EDIT/CANCEL from status and permissions without fully reflecting repository requester/elevated ownership checks. Reproduction: a non-requester with `materials:update` and no `materials:approve-final` can see EDIT/CANCEL on another request but PATCH/cancel is rejected with `MATERIAL_ACTION_NOT_ALLOWED`. Web preserves server-derived actions and displays the authoritative rejection. Optional smallest backend follow-up: align action derivation with the existing ownership checks; add requester/non-requester tests. No authorization policy change is proposed or performed.
2. Mobile detail presents returned actions even for inactive projects; writes are rejected by API `assertActiveProject`. Web additionally disables writes for inactive projects.
3. Mobile permits changing values while reusing its mutation key after an uncertain failure. Web freezes the original payload/key to comply with API fingerprint semantics.
4. Mobile uses a UTC date default (`toISOString().slice(0,10)`) and fixed IST timeline; Web uses the organization working timezone already exposed by Web auth. Date-only stored values are displayed without UTC conversion.
5. Source `PUT /settings` accepts only workflowMode, despite the older contract's broad statement that every mutation requires a key. Web follows the actual DTO; request mutations carry keys and versions as required.
6. API create fingerprints include the current configured workflow. A retry after an intervening workflow configuration change can conflict even with the original client payload. Web does not generate a fresh key automatically; it asks the user to inspect the list. Optional backend improvement: resolve an existing create replay before applying current settings, preserving the stored workflow. This is not a blocker for ordinary request creation and was not changed.

## 6. Verification

- `node --test apps/web/src/features/materials/material-rules.test.mjs`: **6/6 passed** (outside sandbox after test subprocess EPERM). Covers effective access, server-action intersection/self-approval absence, archived writes, context query roots, financial precision and frozen version/payload/key retry behavior.
- Scoped TypeScript check: **passed** using the existing Web tsconfig with a temporary include list for Materials features/routes and their transitive imports; the temporary config was removed after execution. This does not replace the blocked whole-Web check.
- Focused ESLint for Materials features/routes, sidebar and navigation: **passed**. Existing Project Detail baseline lint failure is reported by the whole-Web check below.
- `pnpm --filter @nirman-app/web type-check`: blocked by four pre-existing Workers errors in `use-workers.ts` at 214/223/237/238 (await in non-async mutation callback and incompatible return type). No Materials error reported.
- `pnpm --filter @nirman-app/web lint`: blocked by six pre-existing errors: Attendance manual memoization (3), Organization Detail set-state-in-effect, Project Detail set-state-in-effect, Settings set-state-in-effect. No Materials error reported.
- Production build attempted and repeated outside sandbox after font-fetch failures. Outside-sandbox result: blocked by pre-existing invalid UTF-8 in `attendance-page.tsx` and three non-async await syntax errors in Workers. Font fetch succeeded on the retry.
- Scope-specific `git diff --check`: **passed**. Whole-tree check reports pre-existing trailing whitespace in Worker project panel lines 426/469/523. New Materials files were also formatted using the already-installed Prettier; no dependency was added.

## 7. Runtime smoke and open acceptance

No running local Web/API on the standard ports or authenticated browser tab was available during inspection. Test-environment/account/project authorization was requested; no credentials or disposable fixture authorization was supplied during implementation. No business records were mutated for testing.

Pending: authenticated three-workflow lifecycle; requester/elevated/self-approval roles; CUSTOM and cross-tenant direct-route denial; stale/concurrent quantities; network-loss retry; expired session; archived project; filtered CSV scope; Web create → Mobile action → Web refresh and reverse; actual browser layout at 375/768/1024/1440/1920 and 200% zoom; keyboard/screen-reader/focus acceptance. Unit tests/static inspection do not establish these checks.

## 8. Recommendation

Source implementation is ready for scoped review. Repair the separately owned whole-Web baseline issues and run authenticated acceptance before marking W3 accepted. No backend/database rollout is necessary for this Web slice. Preserve unrelated work when addressing the baseline blockers.
