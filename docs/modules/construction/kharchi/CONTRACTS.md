# Kharchi / Worker Advances Module Contract

> Status: API and Mobile source implemented; authenticated and physical-device acceptance pending.
>
> Scope owner: NirmanSite Product Owner.
>
> Last updated: 2026-09-01.
>
> Approved on 2026-08-31 for API-first implementation. The later migration/grant rollout and Mobile implementation were completed under separate authorization; remaining acceptance gates are recorded in `STATUS.md`.

## A. Module Identity

Module name: Kharchi / Worker Advances.

Business purpose: record money already given to a Project Worker as an advance against future wages, preserve an immutable correction trail, expose the outstanding balance, and allocate that balance automatically during wage confirmation.

Target users:

- Organization Owner.
- Builder Admin.
- Independent Contractor Owner.
- Contractor Member assigned to the Project.
- Builder Supervisor assigned to the Project.
- Site Supervisor assigned to the Project.
- Project Manager assigned to the Project.
- Custom customer roles with explicit Kharchi permissions inside their Organization-role and Project-grant ceiling.

Included API-first scope:

- direct paid recording only;
- Project- and Worker-assignment-scoped reads and writes;
- payment method and optional payment reference;
- immutable positive and negative adjustments;
- current and historical outstanding-balance reads;
- duplicate-retry protection for financial writes;
- automatic oldest-first deduction allocation during wage-batch confirmation;
- reusable audit persistence before Kharchi financial writes are enabled;
- CSV export;
- shared framework-neutral permissions, errors, statuses, schemas, and response types;
- repository, service, controller, transaction, concurrency, authorization, and tenant-isolation tests.

Excluded or deferred:

- request, draft, pending, approval, rejection, and separate mark-paid workflows;
- approval notifications;
- editing or deleting the original paid amount;
- a Worker login or self-service balance;
- loans, interest, instalment plans, credit scoring, or payroll lending;
- receipt/media attachments until File And Media Ownership is approved;
- actual offline mobile storage, queueing, sync, and conflict UI;
- Web and Mobile implementation in the API-first phase;
- database migration or seed execution without a separately confirmed target and explicit approval.

Dependencies:

- Identity Access and active Organization membership.
- Project Access and effective Project permission grants.
- Workers and `worker_project_assignments`.
- Wages and `wage_items` for deduction allocation.
- a reusable Audit Foundation for immutable financial events.

Downstream consumers:

- Wages preview and confirmation.
- Worker financial history.
- Project and Organization dashboards.
- Kharchi reports and exports.
- future Mobile offline sync.

## B. Domain Terminology

Kharchi / Worker Advance: money already handed to a Worker against future wages. It is not a loan product.

Worker: an Organization-owned labour record. A Worker is not an application user.

Worker Project Assignment: the Project-scoped Worker link used to validate that the Worker belongs to the Project on the Kharchi date.

Original amount: the immutable amount recorded when the advance was given.

Adjustment: an immutable signed correction. A positive adjustment increases the effective amount; a negative adjustment reduces it.

Effective amount:

```text
original amount + sum of signed adjustments
```

Deduction allocation: an immutable link between part of an outstanding advance and a confirmed Wage Item.

Outstanding balance:

```text
effective amount - sum of deduction allocations
```

Derived balance status:

- `PAID`: effective amount is positive and no deduction is allocated.
- `PARTIALLY_DEDUCTED`: allocated deduction is greater than zero and outstanding balance is greater than zero.
- `DEDUCTED`: outstanding balance is zero.

Payment reference: optional UPI, bank, voucher, or other external reference. It is evidence text, not a payment-provider integration.

Idempotency key: a client-generated retry key that prevents a repeated financial request from creating a duplicate record.

## C. Actors And Permissions

Required permission keys:

- `kharchi:read`
- `kharchi:create`
- `kharchi:adjust`
- `kharchi:export`

The direct-paid MVP does not use `kharchi:approve`, `kharchi:reject`, or `kharchi:mark-paid`.

Default role direction:

| Role | Read | Create Paid Advance | Adjust | Export |
| --- | --- | --- | --- | --- |
| Organization Owner | yes | yes | yes | yes |
| Builder Admin | yes | yes | yes | yes |
| Independent Contractor Owner | yes | yes | yes | yes |
| Contractor Member | assigned Projects only | assigned Projects only | no | no |
| Builder Supervisor | assigned Projects only | assigned Projects only | no | no |
| Site Supervisor | assigned Projects only | assigned Projects only | no | no |
| Project Manager | assigned Projects only | assigned Projects only | yes | yes |
| Sales User | no | no | no | no |
| Platform Super Admin | no customer Kharchi permission by default | no | no | no |

Rules:

- Every endpoint enforces active Organization membership, the required Organization-role permission, and effective Project access.
- A `CUSTOM` Project permission grant may narrow but never exceed the Organization-role ceiling.
- Hidden client navigation is not authorization.
- Platform support access, if later approved, must use a separately scoped and audited support policy.
- Adjustment permission is intentionally stronger than create permission because it changes financial balance after the original record exists.

## D. Business Workflows

### Record A Paid Advance

1. An authorized actor selects the active Project and an eligible Worker assignment.
2. The actor enters amount, date, payment method, optional reference, optional notes, and an idempotency key.
3. The API validates tenant, Project access, Worker status, assignment scope/date, amount, and idempotency.
4. The API inserts the paid advance and audit event atomically.
5. The outstanding balance increases by the original amount.

The creation response is already paid. There is no submission, approval, rejection, or later mark-paid step.

### Adjust A Paid Advance

1. An authorized adjuster submits a non-zero signed amount, mandatory reason, and idempotency key.
2. The API locks the advance and current financial ledger.
3. A negative adjustment is rejected if it would make the outstanding balance negative or make the effective amount lower than deductions already allocated.
4. The API inserts the adjustment and audit event atomically.
5. The original advance row and original amount remain unchanged.

### Allocate Kharchi During Wage Confirmation

1. Wages calculates the Worker Wage Item before Kharchi deduction.
2. Inside the same wage-confirmation transaction, the API locks that Worker's eligible outstanding advances for the same Organization and Project.
3. Advances are consumed oldest-first by `request_date`, then `created_at`, then `id` for deterministic ordering.
4. Allocation stops when either the outstanding Kharchi reaches zero or the Wage Item's pre-deduction net payable reaches zero.
5. The total deduction can never make the Wage Item net amount negative.
6. Each allocation links the source advance and target Wage Item.
7. Retrying wage confirmation must not duplicate allocations.
8. The wage snapshot stores the allocated total in `wage_items.kharchi_deduction`.

### Read History And Balance

- Active and inactive Workers retain readable historical Kharchi records.
- Ended assignments retain readable historical Kharchi records.
- New advances require an active Worker and a request date covered by the selected Worker Project Assignment.
- Reads may be filtered by Worker assignment, Worker, date range, derived balance status, payment method, and search text.

### Correction And Removal

- The API does not edit or delete the original paid advance.
- Financial correction uses an immutable signed adjustment.
- Permanent Worker deletion follows the separately approved Workers deletion contract and must include Kharchi records, adjustments, allocations, and audit implications in its dependency-ordered transaction before Kharchi migration implementation is approved.

## E. Domain Model

### `kharchi_advances`

Contract fields:

- `id`: UUID primary key.
- `organization_id`: required tenant key.
- `project_id`: required Project key.
- `worker_assignment_id`: required Worker Project Assignment reference.
- `worker_id`: required Worker reference derived from the assignment, never trusted independently from client input.
- `amount`: positive `DECIMAL(12,2)`, immutable original amount.
- `request_date`: required India-local date on which money was given.
- `payment_method`: `CASH`, `UPI`, `BANK_TRANSFER`, or `OTHER`.
- `payment_reference`: optional, maximum 120 characters.
- `notes`: optional bounded text.
- `recorded_by`: required authenticated user.
- `paid_at`: server timestamp recording the API write.
- `idempotency_key`: required bounded client retry key.
- `created_at`: server timestamp.

Required database behavior:

- unique `(organization_id, idempotency_key)`;
- composite tenant/Project indexes for lists and reports;
- Worker/date index for balance allocation order;
- foreign keys to Organization, Project, Worker, assignment, and recording user where compatible with current schema;
- no update or delete endpoint for the original financial facts.

### `kharchi_adjustments`

Contract fields:

- `id`: UUID primary key.
- `kharchi_advance_id`: required source advance.
- `organization_id`: required tenant key.
- `project_id`: required Project key.
- `amount`: signed non-zero `DECIMAL(12,2)`.
- `reason`: required bounded text.
- `recorded_by`: required authenticated user.
- `idempotency_key`: required bounded client retry key.
- `created_at`: immutable server timestamp.

Required database behavior:

- unique `(organization_id, idempotency_key)` across adjustment writes;
- source advance scope must match Organization and Project;
- adjustments are insert-only.

### `kharchi_deduction_allocations`

Contract fields:

- `id`: UUID primary key.
- `kharchi_advance_id`: required source advance.
- `wage_item_id`: required target Wage Item.
- `organization_id`: required tenant key.
- `project_id`: required Project key.
- `worker_id`: required Worker scope.
- `deduction_amount`: positive `DECIMAL(12,2)`.
- `deducted_at`: confirmation timestamp.
- `recorded_by`: Wage confirmation actor.
- `created_at`: immutable server timestamp.

Required database behavior:

- unique `(kharchi_advance_id, wage_item_id)` to prevent duplicate source/target allocation;
- indexes for advance balance, Wage detail, Worker history, and Project reporting;
- allocation is insert-only and is created only by the Wages confirmation transaction;
- allocation amount may not exceed the locked source outstanding balance or target Wage capacity.

### Financial Precision

- API calculations use integer paise or an equivalent decimal-safe representation.
- API responses expose money as two-decimal strings.
- JavaScript floating-point arithmetic must not be used for authoritative financial mutation checks.
- Currency is INR under the approved Organization model.

## F. Shared Application Contract

`packages/shared` will own:

- `KharchiPaymentMethod`;
- `KharchiBalanceStatus`;
- Kharchi permissions and labels;
- create paid-advance input schema;
- create adjustment input schema;
- list/filter/pagination schema;
- advance detail, adjustment, allocation, summary, and list response types;
- stable errors;
- audit action constants used by the reusable Audit Foundation.

Stable error candidates:

- `KHARCHI_NOT_FOUND`
- `KHARCHI_AMOUNT_INVALID`
- `KHARCHI_ADJUSTMENT_INVALID`
- `KHARCHI_ADJUSTMENT_EXCEEDS_BALANCE`
- `KHARCHI_WORKER_INACTIVE`
- `KHARCHI_WORKER_ASSIGNMENT_INVALID`
- `KHARCHI_REQUEST_DATE_OUTSIDE_ASSIGNMENT`
- `KHARCHI_DEDUCTION_EXCEEDS_BALANCE`
- `KHARCHI_DEDUCTION_DUPLICATE`
- `KHARCHI_IDEMPOTENCY_CONFLICT`

Global access and validation errors remain reusable where applicable.

## G. API Contract

Base route:

```text
/api/v1/organizations/:organizationId/projects/:projectId/kharchi
```

### List Advances

- Method: `GET /`
- Permission: `kharchi:read`
- Query: page, page size, Worker/assignment, date range, derived status, payment method, search, sort.
- Response: paginated advances with original amount, adjustment total, deducted total, and outstanding balance.

### Project Summary

- Method: `GET /summary`
- Permission: `kharchi:read`
- Query: optional Worker/assignment and date range.
- Response: original total, net adjustment total, effective total, deducted total, outstanding total, and Worker balances.

### Advance Detail

- Method: `GET /:kharchiId`
- Permission: `kharchi:read`
- Response: advance, derived balance/status, immutable adjustments, and Wage deduction allocations.

### Record Paid Advance

- Method: `POST /`
- Permission: `kharchi:create`
- Body: Worker assignment ID, amount, request date, payment method, optional reference, optional notes, required idempotency key.
- Response: created detail.
- Transaction: advance plus audit event.
- Retry: the same key and same normalized request returns the original result; the same key with different data returns `KHARCHI_IDEMPOTENCY_CONFLICT`.

### Record Adjustment

- Method: `POST /:kharchiId/adjustments`
- Permission: `kharchi:adjust`
- Body: signed non-zero amount, mandatory reason, required idempotency key.
- Response: refreshed detail.
- Transaction: locked balance validation, adjustment insert, and audit event.
- Retry behavior matches paid-advance creation.

### Export

- Method: `GET /export`
- Permission: `kharchi:export`
- Query: same scope filters as list.
- Response: CSV containing Worker identity, Project, original amount, adjustment total, deducted total, outstanding balance, payment method/reference, actors, and dates.

### Internal Wages Integration

This is an internal application interface, not a client endpoint. Wages confirmation supplies the transaction connection, Wage Item, Worker, Organization, Project, pre-deduction payable amount, and actor. Kharchi returns deterministic allocation rows and the total deduction without committing independently.

All routes and internal operations must enforce tenant and Project scope in repository queries, not only in the controller.

## H. Web-Admin Experience

Deferred from the API-first phase. The approved future Web role is oversight, filtering, detail/history, adjustment by authorized roles, and CSV export. It must not introduce an approval queue for this direct workflow.

## I. Mobile Experience

Implemented after the API-first phase. The Mobile flow is Project context -> Worker -> record paid Kharchi with a short form and immediate updated balance.

The implementation-ready Mobile/API integration contract is `docs/modules/construction/kharchi/MOBILE_INTEGRATION_CONTRACT.md`.

The implemented UI supports English, Hindi, and Gujarati for money, corrections, immutable-history implications, accessibility labels, and operational states. User-entered names, notes, and references remain unchanged. Persisted offline financial writes remain deferred.

## J. Offline And Synchronisation Contract

API-first scope:

- every paid-advance and adjustment write requires an idempotency key;
- same-key/same-request retry returns the original resource;
- same-key/different-request retry returns a conflict;
- no API response claims a write is queued or saved offline.

Deferred Mobile scope:

- local persistent queue;
- stable client-generated mutation IDs;
- retry and attention-needed states;
- conflict recovery;
- restart-safe unsynced records.

Wage deduction allocation remains online and server-authoritative.

## K. Notifications

No Kharchi approval notifications exist because the approved workflow has no approval stage.

Payment-recorded or deduction informational notifications are deferred until the shared Notifications Foundation has an approved contract. Notification absence must not weaken audit or financial history.

## L. Audit Events

A reusable Audit Foundation is a prerequisite to enabling Kharchi financial writes.

Required immutable events:

- `kharchi.advance-recorded`
- `kharchi.adjustment-recorded`
- `kharchi.deduction-allocated`

Each event records Organization, Project, actor, entity, relevant old/new financial values, idempotency metadata without exposing secrets, source Wage Item when applicable, and server timestamp.

Audit failure must roll back the related financial transaction. A no-op audit hook is not acceptable for Kharchi.

## M. Validation And Business Rules

- Amount is required, greater than zero, and limited to two decimal places.
- Request date is required.
- Worker must belong to the Organization and be `ACTIVE` for a new advance.
- Assignment must belong to the same Organization, Project, and Worker.
- Request date must be on or after assignment start and on or before assignment end when an end exists.
- A historical ended assignment may be read but cannot receive a new advance outside its covered dates.
- Payment method must be canonical; payment reference is optional.
- Adjustment amount is non-zero with at most two decimal places.
- Adjustment reason is required.
- Negative adjustment cannot make effective amount lower than deductions already allocated and cannot make outstanding balance negative.
- No standard edit or delete is allowed for advance, adjustment, or allocation financial rows.
- Idempotency is Organization-scoped and verifies normalized request equivalence.
- Deduction allocation is deterministic, transactional, oldest-first, and capped at both source outstanding balance and target Wage payable amount.
- A client-provided Organization, Project, Worker, balance, status, actor, paid timestamp, deducted amount, or audit field is never trusted.

## N. Reporting And Analytics

API-first reporting includes:

- Project outstanding Kharchi total;
- outstanding balance by Worker;
- paid advances by date range;
- adjustment total by date range;
- deduction total by Wage Item/batch and date range;
- CSV export within authorized Project scope.

Cross-Project Organization reporting is deferred until the Reports module defines its access and aggregation contract.

## O. Security And Privacy

- Every read/write is Organization- and Project-scoped.
- Repository mutations include Organization, Project, and entity IDs in predicates.
- Project permission enforcement uses `ProjectAccessService`.
- Financial permission checks occur server-side.
- Request bodies are whitelisted and reject unknown fields through the global validation pipe.
- Payment references and notes are treated as untrusted text and excluded from logs by default.
- Transactions and row locks protect adjustments and allocations from concurrent overspend.
- Stable error responses do not expose SQL, credentials, or cross-tenant existence.
- Platform roles receive no customer Kharchi permissions by default.

## P. Acceptance Criteria

Database:

- additive plural `snake_case` tables and required indexes/FKs are defined in reviewed migrations;
- idempotency and allocation uniqueness are enforced by the database;
- every migration, seed, or role-grant synchronization requires separate exact-target approval.

API:

- paid advance creation immediately increases balance;
- same retry does not create a duplicate;
- conflicting reuse of a key is rejected;
- positive/negative adjustments are immutable and balance-safe;
- list, detail, summary, and export reconcile to ledger totals;
- automatic Wage allocation is oldest-first, traceable, and cannot produce negative net wages.

Authorization:

- the approved role matrix and custom Project grants are enforced;
- Contractor/Supervisor roles cannot adjust or export by default;
- Platform Super Admin and Sales User receive no Kharchi access;
- cross-tenant and inaccessible-Project IDs are denied.

Audit:

- every financial create, adjustment, and deduction has a durable immutable audit event in the same transaction.

Regression:

- Wages without outstanding Kharchi remains unchanged;
- existing confirmed Wage batches remain immutable historical snapshots;
- Attendance and Worker assignment behavior remain unchanged.

## Q. Test Matrix

Required tests:

- shared schema and canonical enum tests;
- create/list/detail/summary/export service tests;
- permission matrix tests;
- Organization and Project isolation tests;
- assignment ownership/date and inactive Worker tests;
- money precision and validation tests;
- same-key retry and conflicting-key reuse tests;
- positive and negative adjustment tests;
- concurrent negative-adjustment protection;
- automatic FIFO allocation across multiple advances;
- one advance allocated across multiple Wage Items/batches;
- deduction cap at outstanding balance and Wage payable amount;
- duplicate allocation protection;
- audit rollback tests;
- Wages regression tests with zero and non-zero Kharchi;
- API production build and full API Jest suite.

Authenticated runtime, real-database concurrency, migration, browser, and device verification are reported separately from static and mocked-service tests.

Current implementation and rollout evidence, including completed migration/grant gates and pending
acceptance boundaries, is maintained in `docs/modules/construction/kharchi/STATUS.md`.

## R. Open Questions And Decisions

No open decision blocks the API-first implementation.

The Product Owner confirmed that the first Kharchi API has no cancel or delete action. Incorrect paid records are preserved and corrected only with an immutable negative adjustment; the original row is never deleted or rewritten.
