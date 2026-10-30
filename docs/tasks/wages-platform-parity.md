# Wages Web / Mobile parity — 2026-10-29

Scope: additive client changes against the existing Wages contract and endpoints. Preserve existing screens, forms and actions. No API, schema, financial calculation, permission-grant or database changes.

## Audit and implementation

| Capability | Web | Mobile | Outcome |
| --- | --- | --- | --- |
| Project-scoped access; read-only archived project | Existing | Added explicit guards and route scope | Same effective project permissions; unknown explicit project IDs never fall back to another project |
| Date range, timezone today limit, fresh overlap/readiness check | Existing | Existing | Preserved; native payment default now also uses organization timezone |
| Preview totals and per-worker full/half/absent/non-working days, grouped historical rates | Existing | Added full calculation details | Multiple rates are not represented as a single current rate |
| Confirm ready preview; reject overlapping non-cancelled batches | Existing | Existing | Preserved; native post-confirm navigation retains originating project and ignores stale focus responses |
| Batch gross, deductions, adjustments, net, paid, remaining | Existing | Added missing gross/deductions/adjustment totals | Server-authoritative amounts |
| Batch statuses DRAFT, CONFIRMED, PARTIALLY_PAID, PAID, CANCELLED | Existing | Existing | Native list/detail tones aligned; native translations checked against shared enum |
| Item UNPAID, PARTIALLY_PAID, PAID; Kharchi settlement explanation | Added settlement label | Existing | Settlement remains a display explanation, never a new stored payment status; cancelled snapshots do not claim active Kharchi settlement |
| Read-only worker calculation/history for ordinary readers and cancelled batches | Existing | Added | Detail access no longer depends on pay/update grants |
| Saved snapshot explanation, notes, payment method/date/reference/actor/timestamp history | Existing | Added | Native saved details include full rate breakdown |
| Worker Attendance navigation | Existing | Added | Requires attendance:read and workers:read |
| Assignment Kharchi ledger and worker advance allocation/reversal history | Existing | Added on-demand, paginated views | Requires kharchi:read; advance details link to existing correction history; all pages accessible |
| Full/partial payments, all shared payment methods | Existing | Existing | Preserved; native decimal precision/reference limits aligned with API |
| Same-key/same-payload retry after uncertain payment response | Existing | Added | Native synchronous guard prevents double taps; uncertain attempt locks edits/close and allows retry of original payload; confirmed rejection releases attempt |
| Adjustment including add/deduct and notes | Existing signed input | Existing add/deduct controls | Preserved; native now refreshes snapshot before adjustment, detects changed records and offers reload; API remains concurrency authority |
| Cancel with 2–500 character reason; block any payment history | Existing | Existing | Added native synchronous and permission/state guards; cancellation timestamp/actor retained in detail |
| PDF export | Existing | Existing | Preserved |
| CSV export | Added existing API action | Added existing API action | Web downloads CSV; Mobile shares a temporary CSV file and removes it afterward |
| Refresh/error recovery | Added explicit refresh | Added list refresh/error state; retained pull refresh | Native reads ignore stale responses; failed reads do not expose cached mutation controls |
| English/Hindi/Gujarati | Existing Web English interface | Added all new native copy in three languages | No new Web localization architecture introduced |

No direct changes to Attendance derivation, Calendar, assignment rates, Kharchi allocation transactions, cancellation reversals, Audit, Total Expenses calculations, notifications or offline sync. Those remain existing API dependencies. No permanent offline queue or persisted payment attempt was added; uncertain native payment recovery is scoped to the open screen.

## Verification

- Web and Mobile TypeScript checks.
- Focused Web Wages ESLint.
- `node --test apps/web/src/features/wages/wage-display.test.mjs apps/web/src/features/wages/wage-rules.test.mjs`: 11 tests.
- `node apps/mobile/scripts/verify-wages-parity.cjs`: executes actual screen handlers with mocked hooks/services; verifies duplicate-tap guard, uncertain retry payload/key, API DTO body, stale adjustment rejection, archived/cancelled/read-only write guards, payment-history cancellation block and paise boundaries. Also verifies all shared statuses/payment methods have en/hi/gu labels.
- `node apps/mobile/scripts/validate-locales.mjs`: keys/placeholders across all 19 namespaces and three languages.
- Android Hermes export: passed (2,045 modules).
- `git diff --check`.

Implemented and statically/mocked-runtime verified, not accepted on physical devices. Pending: authenticated Web/Mobile previews and writes against the configured API, real concurrent updates, lost-response recovery, browser responsive/accessibility review, native history pagination/navigation, PDF/CSV save/share and cancellation/capacity-independent role checks. No database or deployment action performed.
