# Total Expenses — module contract

Status: approved for source implementation by the owner on 2026-10-05. The separately authorized follow-up applied migration 028; schema and local authenticated Owner report reads are verified. This contract follows MODULE_CONTRACT_STANDARD.md.

## A. Module Identity

Project-scoped, read-only reporting of money paid for Wages, Materials and Site Expenses. Owners and explicitly delegated project members can assess paid spending by month/year and inspect its sources. Depends on project access/RBAC, Calendar working timezone, source modules, shared contracts, API-local mysql2 and transactional Audit. No other module depends on report writes because the report has none.

Kharchi is excluded: this report is not every project cash outflow. Refunds, budgets, exports, cross-project reports, offline payment writes and automatic cross-module creation/linking are deferred.

## B. Domain Terminology

- **Payment**: an explicitly recorded dated amount, distinct from approval, purchase, delivery, estimate and recognized cost.
- **Active payment**: a payment without an immutable void record. Existing wage payments retain existing wage semantics.
- **Period paid**: active payments whose payment dates are within the inclusive selected range.
- **Lifetime paid/remaining**: all active payments against the source and its current payable cost, regardless of report dates.
- **Source**: a wage batch, individual material purchase (not its request), or approved Site Expense.
- **Payment state**: UNPAID, PARTIALLY_PAID or PAID, independent from source workflow state.
- **User/actor**: authenticated system user recording/correcting a payment. Worker/payee/vendor are source business identities, not necessarily system users. Assignment and employment/attendance states do not establish payment.

## C. Actors And Permissions

| Permission | Scope and requirements |
| --- | --- |
| `total-expenses:read` | Complete financial report visibility across all three sources within an effectively accessible project; no source read permission required for report cards |
| `materials:mark-paid` | Material purchase payment entry; also requires `materials:read` and active project access |
| `materials:void-payment` | Material payment correction; also requires `materials:read` and active project access |
| `expenses:mark-paid` | Approved Site Expense payment entry; also requires `expenses:read` and active project access |
| `expenses:void-payment` | Site Expense payment correction; also requires `expenses:read` and active project access |

Organization Owner and Independent Contractor Owner role templates and migration receive all five permissions by default. Contractor, Supervisor, Agency, Sales, custom roles and other members receive no automatic financial access: explicit grants and effective project access are required, bounded by organization role permissions. Platform/Super Admin status does not bypass project API authorization. Report reads can include archived accessible projects; payment writes require active projects. Source detail links additionally require wages/materials/expenses read permission. Existing approval permissions remain unchanged. No report creation/edit/delete/archive/export rights exist.

## D. Business Workflows

**Read spending:** authorized actor chooses project and dates, then category and page. API reads active payment events in a consistent snapshot; summary always includes all categories, list aggregates sources before pagination. No mutation, notification or new audit event. Access errors deny data; empty reports explain unconfirmed historical costs.

**Confirm payment:** authorized source reader opens existing detail, supplies amount/date/method/reference with expected version and retry key. Transaction locks the source parent, checks replay then version, known payable cost and remaining balance, appends payment, increments source version and records audit. Expense must be APPROVED; material purchase must belong to an eligible request. Result is a refreshed ledger. Concurrent commands serialize on the source; stale versions conflict and overpayments fail.

**Correct payment:** dedicated correction actor supplies a mandatory reason/version/retry key. Lock and validate ownership, append an immutable void record and audit, increment source version. The original payment remains in history and is excluded from report totals. Replacement is a separate new payment command with a new retry key. No actual refund occurs. Historical reports reflect current active payment truth rather than frozen statements.

**Adjust Site Expense:** existing approved-adjustment workflow remains; its source lock and exact arithmetic additionally reject a recognized amount below active paid amounts. Correct payments before reducing cost below paid.

**Historical confirmation:** existing source records remain without inferred payments. Authorized users explicitly record historical amounts and payment dates after checking legacy duplicates. Approval/purchase timestamps never become inferred payment dates. No automatic backfill, reclassification or source linking.

All mutations are online only. Definitive validation/version errors require correction/refresh; uncertain delivery retries preserve the exact command and key. No new payment notifications are sent.

## E. Domain Model

Migration `028_paid_spending.sql` creates additive InnoDB tables with repository-compatible varchar UUIDs:

| Entity | Required fields, relationships and constraints |
| --- | --- |
| `material_purchase_payments` | id, organization_id, project_id, material_purchase_id, material_request_id; composite FK to scoped purchase; amount DECIMAL(14,2)>0; payment_date DATE; payment_method; recorded_by user FK; idempotency_key, SHA-256 request_fingerprint; recorded_at DATETIME(3) default current timestamp |
| `site_expense_payments` | Same payment fields, site_expense_id with scoped expense FK; no material request relationship |
| `material_purchase_payments_voids` / `site_expense_payments_voids` | id, scoped payment FK, reason up to 2000 characters, voided_by user FK, retry key/fingerprint, voided_at timestamp; unique payment_id prevents a second void |

Optional payment reference is nullable VARCHAR(160). Methods: CASH, UPI, BANK_TRANSFER, CARD, CHEQUE, OTHER. Retry keys max 120 characters are unique within organization/project and command table. Payment scope identity is unique for composite void FKs. Project/payment-date and source indexes support aggregation/history. UUIDs are server generated; no offline IDs. No updater, soft deletion or mutable payment fields: retained immutable history plus separate void records is the correction model. Foreign keys restrict destructive deletion. No stored report totals; existing source/history rows are unchanged. Retention follows existing financial/audit retention; no purge endpoint is introduced.

## F. Shared Application Contract

`packages/shared/src/types/total-expenses.ts` exports PaidSource, SpendingSource, SourcePaymentStatus/Method, SourcePayment, PaymentLedger, RecordSourcePayment, VoidSourcePayment, TotalExpensesQuery, discriminated SpendingCard, TotalExpensesSummary and TotalExpensesList.

Material purchase and Expense detail include ledger, decimal paid/remaining amounts, payment status and current source version. Unknown purchase cost has null remaining. `paymentTrackingAvailable: false` identifies a not-yet-installed schema so clients do not present zero payments as confirmed tracking or expose writes. Report cards have readable title/subtitle, period paid, lifetime paid/remaining, latest included payment date and source detail reference; source-specific fields include wage dates, purchase date or expense category/date/review flag. Money crosses the API as decimal strings; exact paise helpers and SQL DECIMAL avoid binary arithmetic.

Filters use optional paired YYYY-MM-DD startDate/endDate, ALL/WAGES/MATERIALS/SITE_EXPENSES source, page and pageSize. List returns items and page/pageSize/total/totalPages. Summary returns totalPaid, wagesPaid, materialsPaid, siteExpensesPaid and monthly breakdown. Shared permissions/error codes are the client/API vocabulary; report writes have no shared command.

## G. API Contract

Base: `/organizations/:organizationId/projects/:projectId` under the existing API prefix and response envelope.

| Operation | Route | Authorization | Result |
| --- | --- | --- | --- |
| GET | `/total-expenses/summary` | total-expenses:read + effective project access | Four totals and monthly breakdown, ignoring category for totals |
| GET | `/total-expenses` | Same | Grouped paginated cards |
| POST | `/materials/:requestId/purchases/:purchaseId/payments` | materials:read + materials:mark-paid | Updated purchase ledger |
| POST | `/materials/:requestId/purchases/:purchaseId/payments/:paymentId/void` | materials:read + materials:void-payment | Updated ledger with original and void history |
| POST | `/expenses/:expenseId/payments` | expenses:read + expenses:mark-paid | Updated expense ledger |
| POST | `/expenses/:expenseId/payments/:paymentId/void` | expenses:read + expenses:void-payment | Updated ledger with void history |

Both reads accept the same paired inclusive payment-date range; all time omits both. List accepts source/page/pageSize (defaults ALL/1/20, max pageSize 100). Sort: latest included date descending, then source and ID ascending. Aggregate before LIMIT/OFFSET. Each endpoint uses a repeatable-read read-only transaction so its component queries agree; separate HTTP requests may observe separate concurrent commits.

Record body: amount decimal string, paymentDate, paymentMethod, optional reference, expectedVersion integer >=1 and idempotencyKey 8–120 characters. Void body: reason 2–2000 trimmed characters, expectedVersion and idempotencyKey. All source/path UUIDs and DTO fields are validated; unknown fields are rejected by existing validation. Tenant/project/source mismatches are scoped not-found. Forbidden access is 403; malformed or business-invalid requests 400; version/retry/duplicate void conflicts 409; pending payment schema 503 with PAYMENT_TRACKING_UNAVAILABLE. API exception envelope exposes shared codes. Payment commands and audits commit atomically; report reads never mutate or notify. Replay of identical key/fingerprint returns current ledger without new payment/audit; changed payload conflicts. No offline sync endpoint.

## H. Web-Admin Experience

Routes `/total-expenses` project selector and `/projects/:id/total-expenses`, gated workforce/finance navigation. Current-month default uses effective Calendar/organization timezone. Filter presets: current month, previous month, selectable calendar year Jan–Dec, paired custom range, all time. Four stats, monthly bars and All/Wages/Materials/Site Expenses controls. Category affects cards only; date/category changes reset page. No search, bulk action or export in this scope.

Responsive design-system cards show readable names, wage period/payment state, material vendor/purchase date, or expense category/payee/date; amounts distinguish period from lifetime/remaining. Legacy categories receive classification-review notice. Source read permission determines links. Encoded, same-project validated return links preserve filters/category/page, including explicit Back to Total Expenses actions; material detail targets its purchase section. No UUID display in report cards.

Existing Material/Expense details contain payment entry/history/reasoned void controls, gated independently from approvals. Inputs remain locked for uncertain-request retry. Loading, empty, retry, refreshing, access denied and schema-unavailable states are explicit. Controls have labels, keyboard semantics and readable amounts. No separate report financial write controls.

## I. Mobile Experience

Permission-gated workforce/finance menu and Project detail action; explicit project routes preserve requested project scope for source details, including independently selected projects. Existing rounded operational cards, stats, monthly spending bars, category controls, filter sheets and paginated list; English/Hindi/Gujarati namespace/key/placeholder parity. Source details support purchase targeting and payment/history/void sheets with localized methods and errors. UUIDs are not displayed in report cards.

Use existing large Button/Input/BottomSheet controls and field-first layout; no dense table. Keep loading, refreshing, retry, empty, denied and schema-unavailable feedback. Cache/preferences keyed by user/organization/project/filter and request sequence guards prevent stale project results. Return keeps filters. No success claim before server confirmation; parent detail reloads after successful commands. Physical-device touch, screen-reader, Indic rendering and small-screen acceptance are separate runtime checks.

## J. Offline And Synchronisation Contract

No new persisted offline report cache or queued payment mutation. Report/detail amounts and versions are server authoritative. Network failure shows retry/error; uncertain payment submission retains identical payload/version/key, preventing duplicate writes on retry. Definitive conflicts require a source refresh/new command. No last-write-wins financial updates, attachments, local deletion or pending-sync ledger is introduced.

## K. Notifications

No new notification triggers or channels in this version. Existing source workflow notifications are unchanged. Payment confirmation/correction feedback is local UI plus refreshed server history. Any future recipient/deep-link/delivery contract requires a separate approved addition.

## L. Audit Events

Transactional events `materials.payment.recorded`, `materials.payment.voided`, `expenses.payment.recorded`, `expenses.payment.voided`. Actor/project/organization/source entity recorded; payment ID and amount/date for creation, original payment ID and mandatory reason for void. Immutable original/void rows retain methods/references/actors/timestamps. Existing AuditService handles supported request context; no invented device/IP attribution. Idempotent replay creates no second audit. Existing approved expense adjustments retain their audit events. Report reads create no financial events.

## M. Validation And Business Rules

Total paid = active wage payments + active material purchase payments + active approved Site Expense payments. Include partially paid CONFIRMED/PARTIALLY_PAID/PAID wage batches, exclude DRAFT/CANCELLED. No payment joins that multiply child rows. Period filtering uses payment date, not source period/creation date; ranges are inclusive real dates with start<=end. Future payment dates are rejected using effective working timezone. Positive input amounts fit DECIMAL(14,2), at most two fractional digits; source remaining is exact.

Payment source locked before replay/version check; material request lock is shared with material edits, expense lock with adjustments. Known purchase total is required. Approved expense payable = original amount + approved adjustments. Overpayment and adjustment below active paid are rejected. Void validates source/payment ownership and prior void; payment rows are never updated/deleted. Retry fingerprint covers scope/source/command/body/version. Cross-source conflicting reuse fails within the command's idempotency scope; tables define independent command namespaces.

New Site Expense creation or newly selected categories reject MATERIAL_PURCHASE and LABOUR_RELATED. An unchanged historical category is permitted and visibly marked for review. Legacy records and their confirmed payments are retained without auto movement/exclusion. Users resolve duplicate legacy sources before confirming payment. Kharchi remains separate and is not added to this report.

## N. Reporting And Analytics

Four period stats reconcile to total; monthly totals reconcile to the selected period. Multiple payments produce one source card, with current lifetime/remaining alongside period paid. Grouped total/page count derives from the same filtered aggregation. Deterministic ordering handles equal dates. No worker-level report, cross-project report, export, budget or persisted analytics table. Current source titles/costs may change while retained dated payments remain authoritative.

## O. Security And Privacy

Authenticate all endpoints; enforce organization membership, effective project access and permission guards/services. Scope source/payment queries and composite FKs by organization/project; request parent mismatches cannot access another purchase. Explicit report permission intentionally exposes full cross-source financial names/amounts, even where individual detail reads are denied. Clients suppress unauthorized links; detail APIs independently enforce source permissions. Audit records retain actors; card IDs are navigation identifiers, not display text. Clients cannot supply actor IDs, payable totals, state, timestamps or void actors. Prepared parameters and validated source enums prevent query injection.

## P. Acceptance Criteria

- Database: additive payment/void tables and owner grants install without changing historical sources; scoped FKs/indexes/retry uniqueness verified after authorized rollout; history retained on rollback.
- API/report: unpaid exclusions, exact partial/multiple payments, boundary/cross-month dates, grouped pages, totals/month reconciliation and void/replacement match fixtures; reads never write.
- Commands/audit: overpayment, stale version, concurrent submissions, conflicting keys, duplicate void and paid-floor adjustments fail safely; successful command/audit atomic; identical retry does not duplicate.
- Access: no cross-tenant/project leakage; delegated report reader sees all categories but only authorized detail links; write requires source read plus dedicated permission and active project.
- Legacy: no inferred historical payment; retired categories rejected for new selection, historical category/read/history intact and marked.
- Web/Mobile: navigation, all presets/tabs/stats/details/return filters, responsive accessible states and en/hi/gu parity; report has no financial writes.
- Offline/notifications: no queued financial writes or new notification side effects; uncertain online retries safe.
- Regression: existing approvals, wages/Kharchi semantics and unrelated user changes retained; missing new schema does not break existing source details.
- Performance: aggregate before pagination, bounded page sizes, indexed scopes/dates; production-volume query plans remain rollout acceptance work.

## Q. Test Matrix

Automated tests cover exact money/calendar helpers; report service/access/query validation; repository snapshot/query/grouping; source service/access/date validation; repository overpayment/version/replay/void/audit behavior; expense paid-floor/retired-category regression; source missing-schema compatibility; Web safe return navigation. SELECT-only synthetic report fixtures are verified against configured MySQL without changing schema/data. Builds/typechecks, scoped lint, locale validation, Android export and diff checks cover client integration.

After authorized schema rollout, run actual FK/constraint and simultaneous payment transactions, authenticated API happy/failure paths, historical confirmation and owner/delegated/denied account checks. Separately record authenticated browser navigation/responsive/keyboard and device detail/payment/locale/network-retry acceptance. Unit mocks and bundle export do not substitute for these runtime tests. No offline-sync feature to test beyond online failure/retry handling.

## R. Open Questions And Decisions

**Confirmed:** user-approved plan on 2026-10-05 defines paid-only, three sources, partial payments, dates, legacy confirmation, dedicated permissions and audited void/replace. No unresolved business decision blocks source implementation.

**Repository-derived:** controller/service/repository NestJS with API-local mysql2; existing wage payment rows, parent version/lock conventions, Calendar working timezone, AuditService, UI primitives and en/hi/gu resources.

**Safe technical decisions:** immutable void tables, exact BigInt paise/SQL DECIMAL, repeatable-read snapshot per endpoint, grouped SQL before paging, stable client retry commands, separate schema-unavailable feature states and validated same-project return paths.

**Pending operational decisions:** exact-target database authorization/deployment and authenticated account/device availability. Migration 028 is now applied and verified; application deployment and remaining runtime acceptance remain pending.

**Deferred:** refunds, exports, budgets, cross-project reports, offline writes, new notifications and any automatic accounting/source links. Missing ui-ux-pro-max skill did not block implementation; existing repository UI patterns were followed.

## 2026-10-05 performance implementation

Summary uses one scoped payment-date/month aggregation and exact arithmetic for headline/category totals. Category lists select only relevant payment branches while preserving lifetime totals, grouping before pagination and snapshot reads. Material detail histories and project access grants/approval eligibility are batched without business/permission changes. Mobile period summary reuse cancels stale reads; Web scoped 15-second freshness uses financial write invalidation and scope/logout cleanup. Migration 029 adds only Materials/Expenses operational sort indexes and is applied. See [performance verification](../../../tasks/performance-implementation-plan.md); browser/device/load acceptance remains separate.
