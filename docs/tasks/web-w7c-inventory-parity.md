# W7c Web Inventory / Import / Holds / Blocking

Date: 2026-09-21. Status: implemented, focused checks passed, authenticated acceptance pending.

Scope: Web and documentation only. Existing Site Visits, Mobile/EAS and other concurrent edits preserved. No backend, database, migration, seed or Mobile changes; no commit, push or deployment.

## Audit and dependencies

- EXISTING: Sales contract/shared vocabulary, Mobile Units/pricing/import/interest/hold screens, API controllers/DTOs/repository workflows.
- EXISTING: Web effective project access, authenticated API adapter, scoped caches, accessible SalesForm, Lead pagination/history.
- IMPLEMENTED: Inventory routes/services/hooks/types, list/detail/forms/import, interests and hold/block actions, Lead detail integration and navigation.
- Small prerequisites completed: Inventory-only project selection, effective-permission sidebar entry, operational cache replacement on permission/status changes, additional SalesForm content for paginated customer selection and conditional pricing fields/required labels.
- No substantial Web foundation is missing. Whole-Web baseline verification blockers remain separate.

## Mobile action → API → Web checklist

API paths share `/organizations/:organizationId/projects/:projectId/sales`.

| Mobile action | API and fields | Effective permission | Web equivalent |
| --- | --- | --- | --- |
| Unit list/search | GET `/units`, search/status; complete unit, price, counts and block metadata | inventory:read | `/sales/inventory` project chooser; `/projects/[id]/sales/inventory` debounced search/status filters and refresh |
| Unit detail/queue | GET `/units` + `/units/:unitId/interests`; customer/phone/stage/priority, assignee, interest/hold notes, activity/follow-up dates | inventory:read; API returns own customers unless inventory:block | `/projects/[id]/sales/inventory/[unitId]`, metadata, queue and Lead/history links |
| Add/edit | POST `/units`, PUT `/units/:unitId`; unitNumber/type, wingTower, floor, areaSqft, facing, priceBasis, basePrice or ratePerSqft, status | inventory:manage | Validated dialog, TOTAL rupee/lakh/crore entry, PER_SQFT server-calculated total; AVAILABLE/SOLD/UNAVAILABLE choices |
| CSV preview | POST `/units/import/preview`, `{units}`; normalized rows, row errors/counts | inventory:manage | `/projects/[id]/sales/inventory/import`; browser CSV selection, Mobile column vocabulary, 1–500 rows, local validation and full server preview |
| CSV import | POST `/units/import`, `{units}`; importedCount/units | inventory:manage | Explicit all-or-nothing confirmation and result; duplicate-submit lock; uncertain outcome clears preview and requires fresh server validation before retry |
| Record/update interest | POST `/units/:unitId/interests`, leadId/status/notes; updated interests | inventory:interest + leads:update and lead visibility | Unit customer picker and Lead detail section; INTERESTED/HIGH_INTENT/WITHDRAWN inputs |
| Request hold | POST `/units/:unitId/hold-requests`, leadId/notes | inventory:request-block + leads:update and lead visibility | Active interest without pending request; Unit queue and Lead detail actions; refreshed interest check before writes |
| Approve/reject | POST `/unit-hold-requests/:requestId/decision`, decision/notes/optional expiresAt | inventory:block | Pending-request dialog; approve only while available; future expiry in organization timezone or API 24-hour default |
| Direct block | POST `/units/:unitId/blocks`, leadId/notes/optional expiresAt | inventory:block + leads:update and lead visibility | Available-unit manager action with searchable, server-paginated Lead picker. Existing API action; normal Mobile flow is request/approval |
| Release/expiry | POST `/unit-blocks/:blockId/release`; GET `/units` reconciles expiry | inventory:block for release | Confirmation; server restores Unit/Lead state. Manual and 60-second foreground refresh; no local availability transition |
| History/outcomes | GET `/leads/:leadId/activities`, current interests | Lead visibility | Existing immutable Lead timeline linked from Unit and invalidated after writes; current interests shown on Lead detail |

No Unit pagination/export, standalone Unit GET/history, expected versions, availableActions or inventory request keys are supplied by the API. Web does not invent them. Unit filtering is server-side over an unpaginated response; Lead selection uses supported server pagination. The downloadable CSV is a header template, not an inventory export.

## Integrity and UI

- User/organization/project cache boundaries, abortable reads, effective permissions and active-project mutation guards. Permission/status changes replace the operational cache. Old-context callbacks stop dependent writes after unmount.
- No automatic mutation retries; retained input, error feedback and refresh/review gates. Edit/block/decision/release reread Unit fields before mutation; customer actions reread Lead access/state and pending interests.
- Server owns totals, availability, exclusive-block concurrency, waitlisting, expiry and Lead restoration. No optimistic inventory status or mock metrics.
- English-only existing semantic tokens/components, responsive cards/grids, 44px controls, labels/inline errors, focus/Escape/unsaved-input handling through existing dialogs. Loading, empty/filtered-empty, denied/missing, error/retry, stale, submitting and announced success states.

## Exact backend requirements and Mobile differences

No backend edits made. Separate authorization is needed for these changes:

1. **Atomic Unit edits:** PUT rejects a submitted BLOCKED/BOOKED value, but repository UPDATE does not check the existing status or revision and defaults omitted status to AVAILABLE. Mobile's edit form maps blocked/booked records to AVAILABLE (blocked records usually show Release instead when permitted). Web prevents those ordinary edits and rereads before PUT, but cannot close a concurrent edit-versus-block/booking race. Smallest fix: row lock/current-workflow-state validation plus expected revision and conflict response. Test two editors and edit versus block/booking.
2. **Exactly-once uncertain commands:** inventory import/hold-request/direct-block have no idempotency contract. Fresh preview/current-pending checks protect common retries, but cannot prove every lost-response outcome. Smallest fix for exactly-once guarantees: persisted request key/fingerprint and replay of the original response for create/import/request commands. Test lost responses and simultaneous duplicate submissions.
3. **CUSTOM Lead access:** `resolveLeadRead` chooses organization visibility before checking that exact project grant; org read-all reduced to project read-own can return 403 on the Lead picker/detail. Inventory reads remain independent. Smallest fix: derive visibility from resolved effective project permissions and test org ALL → project OWN. Existing W7a/b issue; not a new contract.

History limit: interest responses join only current pending holds. Full historical decisions remain available through authorized Lead activities, not an inventory-only history endpoint. An inventory-only approver would need a standalone Unit history endpoint to browse all historic decisions. Mobile also lacks that screen; no invented history was added.

Web follows DTO writable interest states (SELECTED/WAITLISTED are server-derived), omits client-calculated PER_SQFT basePrice, and rejects malformed CSV, duplicate headers, overlong fields and TOTAL rows with ratePerSqft rather than reproducing Mobile parser weaknesses.

## Verification / acceptance

- All 20 Sales regression tests pass, including eight focused Inventory tests: CSV quoting/limits/conversions, pricing payloads, workflow status guards, effective permissions, cache identity, stale snapshots, scoped transport/abort signals and no automatic mutation replay. Command: `node --test --test-isolation=none apps/web/src/features/sales/inventory.test.mjs apps/web/src/features/sales/sales-rules.test.mjs apps/web/src/features/sales/site-visit-rules.test.mjs apps/web/src/features/sales/services/sales.service.test.mjs`.
- Scoped Sales/Inventory-route/sidebar lint passes. Final `git diff --check` passes (existing line-ending warnings only).
- Whole-Web type-check: existing Workers `use-workers.ts:214,223,237,238` non-async awaits/mutation return type; no Inventory diagnostics.
- Whole-Web lint: six existing Attendance memoization / Organization Detail / Project Detail / Settings errors. Inventory's initial ref-render lint error was corrected and scoped lint passed.
- Build retried outside sandbox: fonts fetched successfully; four existing blockers remain: Attendance invalid UTF-8 at byte 7088 and three Workers non-async awaits. No successful integrated build claimed.
- Browser inventory has no authenticated tabs; no test identity/disposable cross-client fixture supplied. No live data mutations performed.
- Pending: Owner/Sales/Viewer/inventory-only/CUSTOM route/action matrix; Web create/import → Mobile read/hold → Web decision/release and reverse; expiry, competing approvals, uncertain responses/session expiration; keyboard/focus, 375/768/1024/1440/1920 widths and 200% zoom. Atomic stale-edit acceptance depends on backend correction.

Review: implemented and focused checks passed; not fully accepted. No new dependency.
