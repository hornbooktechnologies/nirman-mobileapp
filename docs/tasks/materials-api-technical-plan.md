# Materials API Technical Plan

## 1. Status

- Status: API source implementation in progress; runtime acceptance pending
- Module: Materials
- Scope: shared contracts, SQL draft, NestJS API, authorization, audit, notification integration, reports, and verification
- Last updated: 2026-09-01

This document began as the API implementation plan. On 2026-09-01, the Product Owner authorized starting API code. Shared contracts, migration drafts, seed-source permissions, reusable in-app Notifications, Materials routes/services/repositories, and focused tests may therefore be implemented. Database inspection, migration execution, seed execution, runtime fixtures, and client implementation remain separately gated.

The implementation uses the recommended defaults recorded in section 16 and the companion `docs/modules/construction/materials/CONTRACTS.md`. Product/runtime acceptance remains pending.

## 2. Purpose

Plan a project-scoped Materials API that supports:

- material requirements;
- self-managed and Builder-controlled workflows;
- optional site verification separated from final commercial approval;
- purchase/order recording;
- partial and final delivery recording;
- an immutable user-visible workflow timeline;
- reusable immutable audit records;
- approval notifications;
- project-scoped status reporting and CSV export.

The API must remain simple enough for mobile field use while preserving tenant isolation, Project authorization, workflow integrity, concurrency safety, and future integration with Expenses, Files/Media, dashboards, and Offline Sync.

## 3. Governing Inputs

- `MVP_REQUIREMENTS.md`, especially sections 6, 7, 15, 24, 26, 27, 29, 30, 33, 36, and 37.
- `docs/decisions/005-internal-contractor-membership.md`.
- `docs/decisions/006-subscription-capacity-supervisor-commercial-provisioning.md`.
- `docs/modules/MODULE_CONTRACT_STANDARD.md`.
- `docs/modules/foundation/project-access/CONTRACTS.md`.
- `docs/modules/foundation/project-team-access/CONTRACTS.md`.
- `docs/modules/foundation/role-permission-model/PLAN.md`.
- `docs/modules/construction/kharchi/CONTRACTS.md` and its implemented API patterns.
- Current `ProjectAccessService`, `AuditService`, migration runner, shared permission taxonomy, role seed, and API module conventions.

## 4. Repository Findings

### 4.1 Available foundations

- Authentication and active Organization membership resolution exist.
- `ProjectAccessService.resolveProjectAccess(...)` enforces Organization role permission, Organization ownership, Project assignment or Organization-wide scope, and Project-level CUSTOM grants.
- Project membership supports effective dates, responsibilities, `ROLE_DEFAULT`, and `CUSTOM` permissions.
- Reusable `audit_events`, `AuditModule`, `AuditService`, and transaction-aware audit writes exist.
- API-local `mysql2/promise` repositories, explicit transactions, `FOR UPDATE`, request fingerprints, and idempotency patterns exist in Kharchi and Sales.
- Shared error, permission, status, and DTO/type patterns exist in `packages/shared`.

### 4.2 Missing Materials foundations

- No approved `docs/modules/construction/materials/CONTRACTS.md` exists.
- No Materials permissions, statuses, shared types, schemas, or error codes exist.
- No Materials SQL tables, API module, routes, tests, seed grants, or client integration exists.
- No Notification table/module/API exists, although approval notifications are an MVP Materials requirement and the module index lists Notifications as a dependency.
- No persisted Offline Sync foundation exists.
- No active File/Media metadata ownership contract exists.
- No Expenses contract or implementation exists.
- Current Project access does not itself enforce active Subscription validity. This is a cross-cutting platform gap and must not be solved inconsistently inside Materials alone.

## 5. Dependency And Interconnectivity Matrix

| Module/foundation                | Relationship                                                                                         | Classification                            | Required behavior for Materials API                                                                                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication                   | Identifies every actor                                                                               | Mandatory runtime dependency              | Use authenticated user only; never trust actor IDs from the request body.                                                                                                                                     |
| Organizations/RBAC               | Establishes tenant, membership, role permissions, and operating profile                              | Mandatory runtime dependency              | Require an active customer Organization and membership. Platform Super Admin receives no Materials access by default.                                                                                         |
| Project Access                   | Establishes Project ownership, assignment, CUSTOM grants, lifecycle, and effective permission        | Mandatory runtime dependency              | Call `resolveProjectAccess` on every endpoint and scope every SQL query by both `organization_id` and `project_id`.                                                                                           |
| Project Team                     | Provides Contractor, Builder Supervisor, Project Manager, and other assigned Member responsibilities | Mandatory workflow dependency             | Validate referenced responsible Members against the same Organization and Project and against active assignment dates.                                                                                        |
| Audit Foundation                 | Records immutable critical actions                                                                   | Mandatory runtime dependency              | Write audit records inside the same database transaction as create, transition, purchase, and delivery changes. Confirm migration `012` on the exact target before Materials rollout.                         |
| Notifications                    | Sends approval-required and approval-result records                                                  | Mandatory for complete MVP acceptance     | Implement the reusable in-app Notification foundation before or in a separately reviewable prerequisite slice. Materials must emit events through it; it must not invent a Materials-only notification store. |
| Subscription                     | Controls Organization commercial status/capacity, not role permission                                | Cross-cutting dependency                  | Do not add plan-specific Materials entitlements. Any active-subscription enforcement must be implemented consistently in shared Organization/Project access, not only in Materials.                           |
| Expenses                         | May later receive an approved purchase-cost posting                                                  | Deferred downstream integration           | Capture Materials purchase facts only. Do not automatically create, modify, or pay an Expense in the first Materials API. Reserve a future linkage contract rather than duplicating financial truth.          |
| Files/Media                      | May later own quotation, invoice, challan, and delivery evidence                                     | Deferred downstream integration           | Do not accept arbitrary file URLs or create file ownership in Materials. Add `file_id` relations only after the Files/Media contract exists.                                                                  |
| Offline Sync                     | Future offline request creation and retry                                                            | Deferred client/cross-cutting integration | Require idempotency and deterministic replay behavior now. Do not claim offline support until the shared persisted queue/conflict foundation exists.                                                          |
| Reports/Dashboards               | Consume status, aging, cost, and delivery summaries                                                  | Downstream read integration               | Provide stable list, summary, and CSV contracts; do not build dashboard-specific write logic.                                                                                                                 |
| Workers/Attendance/Wages/Kharchi | Separate construction operations                                                                     | No direct first-slice dependency          | Materials must not reference Worker assignments, attendance, wage batches, or Kharchi balances.                                                                                                               |
| Sales CRM                        | Separate project-scoped domain                                                                       | No direct dependency                      | Reuse transaction/idempotency patterns only; do not link Leads, Units, or Bookings to Materials.                                                                                                              |
| Localization                     | Clients translate system values and machine errors                                                   | Shared contract dependency                | API returns stable enums and error codes. Human-readable API messages remain fallback copy, not the primary localized UI.                                                                                     |

## 6. Proposed Workflow Model

The module contract should approve three Project-level workflow modes:

```text
DIRECT
FINAL_APPROVAL
VERIFY_THEN_FINAL
```

- `DIRECT`: Independent Contractor or approved self-managed Builder flow. Approval stages are skipped.
- `FINAL_APPROVAL`: Requester submits directly to a final commercial approver.
- `VERIFY_THEN_FINAL`: Contractor or Site Supervisor submits, Builder Supervisor verifies site need/quantity, and Builder authority gives final commercial approval.

The selected workflow mode must be resolved server-side and stored as a snapshot on each request. Later Project-setting changes must not rewrite an in-flight or historical request.

Recommended canonical states:

```text
DRAFT
SUBMITTED
PENDING_VERIFICATION
PENDING_FINAL
APPROVED
RETURNED_FOR_CHANGES
REJECTED
ORDERED
PARTIALLY_DELIVERED
DELIVERED
CANCELLED
```

### 6.1 Recommended transitions

| Current state                            | Command                 | Next state                                               | Notes                                                               |
| ---------------------------------------- | ----------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- |
| none                                     | create draft            | `DRAFT`                                                  | Creator may save before submission.                                 |
| `DRAFT` / `RETURNED_FOR_CHANGES`         | submit                  | Mode-dependent pending state, or `APPROVED` for `DIRECT` | Server chooses next state.                                          |
| `PENDING_VERIFICATION`                   | verify                  | `PENDING_FINAL`                                          | Site verification is not commercial approval.                       |
| `PENDING_VERIFICATION` / `PENDING_FINAL` | return                  | `RETURNED_FOR_CHANGES`                                   | Requester may edit and resubmit.                                    |
| `PENDING_VERIFICATION` / `PENDING_FINAL` | reject                  | `REJECTED`                                               | Terminal rejection for the request.                                 |
| `PENDING_FINAL`                          | approve                 | `APPROVED`                                               | Final commercial approval.                                          |
| `APPROVED`                               | record purchase         | `ORDERED`                                                | Purchase/order fact is recorded transactionally.                    |
| `ORDERED`                                | record partial delivery | `PARTIALLY_DELIVERED`                                    | Cumulative delivered quantity is below ordered quantity.            |
| `ORDERED` / `PARTIALLY_DELIVERED`        | record final delivery   | `DELIVERED`                                              | Cumulative delivered quantity equals ordered quantity.              |
| pre-purchase states                      | cancel                  | `CANCELLED`                                              | Requires reason; cancellation after purchase is excluded initially. |

Status is always server-derived. Clients must never submit an arbitrary `workflowStatus` value.

## 7. Proposed Permissions And Role Interaction

Baseline permissions from `MVP_REQUIREMENTS.md`:

```text
materials:read
materials:create
materials:update
materials:approve-level-1
materials:approve-final
materials:reject
materials:record-purchase
materials:record-delivery
```

Recommended additive permission required by the MVP CSV report:

```text
materials:export
```

Keep `materials:approve-level-1` as the stable permission key for compatibility with the MVP requirements; its user-facing label should be “Verify material request”. Do not rename it silently to `materials:verify`.

Command mapping:

- create: `materials:create`;
- edit draft/returned request, submit, or cancel: `materials:update` plus actor/state checks;
- site verification: `materials:approve-level-1`;
- final approval: `materials:approve-final`;
- return or reject: `materials:reject`, with command-specific workflow checks;
- purchase: `materials:record-purchase`;
- delivery: `materials:record-delivery`;
- list/detail/summary: `materials:read`;
- CSV: `materials:export`.

Permissions are necessary but not sufficient. The service must also validate workflow mode, current state, requester separation, Project responsibility, and same-Project access.

### 7.1 Proposed default capability direction

This direction must be approved in the Materials contract before seed changes:

- Organization Owner / Builder Admin / Independent Contractor Owner: all Materials permissions.
- Project Manager: read, create, update, level-1 verification, reject/return, purchase, delivery, and export; final approval only when explicitly approved as part of the role policy.
- Builder Supervisor: read, level-1 verification, reject/return, and delivery verification/recording; never final commercial approval by default.
- Contractor Member: read, create, update, and submit; purchase/delivery only if the approved workflow assigns that responsibility.
- Site Supervisor: read, create, update, and submit; no commercial approval or purchase authority by default.
- Sales User, Viewer, and Platform Super Admin: no Materials permissions by default.

The current role model uses the role permission set both as default access and as the ceiling for Project CUSTOM grants. The contract must therefore approve whether optional delegated purchase/delivery capabilities belong in a system role ceiling or require a separate custom Organization role. The Materials plan must not weaken the role ceiling to make UI delegation convenient.

## 8. Proposed Data Model

The SQL draft should follow existing UUID, composite scope, actor, timestamp, and `RESTRICT` conventions.

### 8.1 `project_material_settings`

One row per Project:

- `id`;
- `organization_id`;
- `project_id`, unique;
- `workflow_mode`;
- `created_by`, `updated_by`;
- timestamps.

This avoids guessing the approval path from the requester's role. If this table is rejected, the Materials contract must define a deterministic mapping from the existing Organization operating profile to one of the three modes.

### 8.2 `material_requests`

- scope: `organization_id`, `project_id`;
- material: `material_name`, optional `category`;
- quantity: `requested_quantity DECIMAL(12,3)`, `unit_of_measure`;
- dates: `requested_on`, optional `required_by_date`;
- commercial estimate: optional `estimated_cost DECIMAL(14,2)`;
- responsibility: optional `responsible_contractor_member_id`;
- workflow: `workflow_mode`, `status`, `version`;
- actors: `requested_by_member_id`, `created_by`, `updated_by`;
- optional `notes`;
- timestamps and `last_transition_at`.

Recommended MVP shape is one material item per request. A multi-line requisition changes editing, approval, partial purchase, partial delivery, reporting, and concurrency behavior and must not be introduced without approval.

### 8.3 `material_request_events`

Immutable user-visible domain timeline:

- scoped request reference;
- `event_type`;
- previous/next status;
- actor user/member;
- required comment for return, rejection, and cancellation;
- safe structured metadata;
- `idempotency_key`, `request_fingerprint`;
- timestamp.

This is distinct from `audit_events`: timeline events support the business UI; audit events support immutable system accountability.

### 8.4 `material_purchases`

- scoped request reference;
- `ordered_quantity DECIMAL(12,3)`;
- optional vendor name;
- optional order/invoice reference;
- optional unit cost and total cost, stored as `DECIMAL(14,2)`;
- purchase/order date;
- notes;
- recorded actor;
- idempotency fields;
- timestamps.

The recommended model allows multiple purchase records for a request so split vendors/orders do not require schema replacement later. If Product chooses exactly one purchase per request for MVP, enforce it with a unique scoped request key.

### 8.5 `material_deliveries`

- scoped request reference;
- optional purchase reference;
- `delivered_quantity DECIMAL(12,3)`;
- delivery date/time;
- optional delivery/challan reference;
- notes;
- received/recorded actor;
- idempotency fields;
- timestamp.

All deliveries use the request's unit. Unit conversion is excluded. The transaction must lock the request and related purchase/delivery totals before accepting another delivery.

### 8.6 Index and integrity requirements

- composite unique request scope `(id, organization_id, project_id)`;
- list indexes by scope/status/required date and requester;
- same-scope composite foreign keys to Projects and requests;
- active Member/Project assignment validated in service/repository transactions where temporal rules cannot be expressed as foreign keys;
- positive quantity checks;
- non-negative money checks;
- unique Organization-level idempotency key per mutation table;
- no cascade deletion of Materials, timeline, purchase, delivery, or audit history.

## 9. Shared Contract Plan

Create:

- `packages/shared/src/constants/materials.ts`;
- `packages/shared/src/types/materials.ts`;
- exports from shared barrel files;
- permission descriptions and permission-key union entries;
- stable Materials error codes;
- framework-neutral request/response types.

Shared contracts must define:

- workflow modes, states, event types, and allowed transitions;
- approved units of measure;
- list filters, sort keys, pagination, summary, detail, timeline, purchase, and delivery shapes;
- create/update/command DTO contracts;
- idempotency and expected-version fields;
- notification types;
- audit action names;
- machine-readable errors.

Do not expose database rows or `mysql2` types through the shared package.

## 10. Proposed API Surface

Base route:

```text
/api/v1/organizations/:organizationId/projects/:projectId/materials
```

| Method  | Route                            | Permission                        | Purpose                                                    |
| ------- | -------------------------------- | --------------------------------- | ---------------------------------------------------------- |
| `GET`   | `/settings`                      | `materials:read`                  | Read effective Project Materials workflow.                 |
| `PUT`   | `/settings`                      | approved configuration permission | Set workflow mode; exact permission is an open decision.   |
| `GET`   | `/`                              | `materials:read`                  | Paginated Project request list.                            |
| `GET`   | `/summary`                       | `materials:read`                  | Counts/quantities by status and overdue requirement count. |
| `GET`   | `/export`                        | `materials:export`                | Project-scoped CSV using the same filters as list.         |
| `POST`  | `/`                              | `materials:create`                | Create draft with idempotency.                             |
| `GET`   | `/:materialRequestId`            | `materials:read`                  | Detail including timeline, purchases, and deliveries.      |
| `PATCH` | `/:materialRequestId`            | `materials:update`                | Edit only draft/returned fields with expected version.     |
| `POST`  | `/:materialRequestId/submit`     | `materials:update`                | Submit/resubmit and resolve next state server-side.        |
| `POST`  | `/:materialRequestId/verify`     | `materials:approve-level-1`       | Record site verification.                                  |
| `POST`  | `/:materialRequestId/return`     | `materials:reject`                | Return for correction with required comment.               |
| `POST`  | `/:materialRequestId/approve`    | `materials:approve-final`         | Record final commercial approval.                          |
| `POST`  | `/:materialRequestId/reject`     | `materials:reject`                | Terminal rejection with required comment.                  |
| `POST`  | `/:materialRequestId/cancel`     | `materials:update`                | Cancel in an allowed pre-purchase state with reason.       |
| `POST`  | `/:materialRequestId/purchases`  | `materials:record-purchase`       | Record an order/purchase atomically.                       |
| `POST`  | `/:materialRequestId/deliveries` | `materials:record-delivery`       | Record partial/final delivery atomically.                  |

No DELETE endpoint is planned. Corrections after a critical state must be additive and auditable; exact purchase/delivery correction behavior requires contract approval.

## 11. Query And Response Contract

List filters should include:

- status or status group;
- search by material name/reference;
- required-date range;
- requester;
- responsible Contractor Member;
- overdue-only;
- purchase/delivery state;
- page/page size and approved sort keys.

Every list and detail result must be derived inside the authorized Organization/Project scope. Summary and export queries must apply identical scope and filter semantics so hidden records cannot leak through counts.

The detail response should include:

- request and workflow snapshot;
- requester/responsibility display summaries;
- server-derived `availableActions` based on state, permission, actor, and separation rules;
- immutable event timeline;
- purchases and cumulative ordered quantity/value;
- deliveries and cumulative delivered/remaining quantity;
- concurrency version.

Clients should render `availableActions`; they must not independently recreate workflow authorization. The API still revalidates every command.

## 12. Transaction, Idempotency, And Concurrency Rules

Every mutation must:

1. resolve Project access and the command permission;
2. require an active Project for new operational writes;
3. normalize input and calculate a canonical request fingerprint;
4. begin a database transaction;
5. lock an existing idempotency record or request row with `FOR UPDATE`;
6. return the prior result for the same key and same fingerprint;
7. reject the same key with a different fingerprint;
8. validate current state, version, actor eligibility, separation rules, and cumulative quantities;
9. write the domain change and immutable request event;
10. write the reusable audit event using the same connection;
11. create notification records in the same transaction when the reusable Notification repository supports it;
12. commit and return the new detail/available actions.

Use `expectedVersion` for edit and transition commands. A stale version returns a conflict instead of silently overwriting another actor's work.

Purchase and delivery totals must be calculated from locked source rows. Two concurrent deliveries must not over-deliver. Financial and approval writes must not use last-write-wins.

## 13. Validation And Security Rules

- Never trust Organization, Project, actor, status, totals, available actions, or workflow mode from client-calculated values.
- A request and every child record must remain in one Organization and Project.
- A referenced responsible Contractor must be an active Organization Member with a valid Project assignment for the relevant date.
- Builder-controlled separation must prevent the requester from performing level-1 verification or final approval when separation is required.
- Builder Supervisor verification must never imply final commercial approval.
- Draft/returned requests alone are editable; immutable timeline history is never rewritten.
- Quantity is positive with at most three decimal places; money is non-negative with two decimals.
- Delivery quantity cannot exceed the permitted ordered quantity. Unit conversion and over-delivery tolerance are excluded until approved.
- Required dates and Project lifecycle rules must be explicit in the contract; no irreversible date assumption is hidden in DTO validation.
- Notes/comments must have bounded lengths and be safely returned as plain data.
- Unknown request IDs inside an inaccessible tenant/Project must not reveal cross-tenant existence.
- Platform Super Admin must not gain customer Materials access through platform status alone.

## 14. Error Contract Direction

The shared error catalog should include at least:

```text
MATERIAL_REQUEST_NOT_FOUND
MATERIAL_WORKFLOW_NOT_CONFIGURED
MATERIAL_STATUS_TRANSITION_INVALID
MATERIAL_ACTION_NOT_ALLOWED
MATERIAL_SELF_APPROVAL_FORBIDDEN
MATERIAL_RESPONSIBLE_MEMBER_INVALID
MATERIAL_PROJECT_ASSIGNMENT_INVALID
MATERIAL_VERSION_CONFLICT
MATERIAL_IDEMPOTENCY_CONFLICT
MATERIAL_QUANTITY_INVALID
MATERIAL_ORDER_QUANTITY_EXCEEDED
MATERIAL_DELIVERY_QUANTITY_EXCEEDED
MATERIAL_PURCHASE_REQUIRED
MATERIAL_ALREADY_COMPLETED
MATERIAL_CORRECTION_NOT_SUPPORTED
```

Existing generic Project permission and lifecycle errors should be reused instead of duplicated.

## 15. Notification, Audit, And Integration Events

### 15.1 In-app notifications

Required events:

- request awaiting verification;
- request awaiting final approval;
- request returned;
- request approved/rejected;
- purchase recorded, when the responsible site actor needs visibility;
- partial/final delivery recorded.

Recipients must be resolved from active same-Project membership and effective permission, not hard-coded role names alone. Deep links must revalidate current access. Duplicate notification prevention should use the source request event ID plus notification type and recipient.

Push delivery is deferred; the in-app record is the source of truth.

### 15.2 Audit actions

At minimum:

```text
materials.request.created
materials.request.updated
materials.request.submitted
materials.request.verified
materials.request.returned
materials.request.approved
materials.request.rejected
materials.request.cancelled
materials.purchase.recorded
materials.delivery.recorded
materials.request.completed
materials.settings.updated
```

Audit metadata may include state, quantity, unit, and reference identifiers. Sensitive notes or future document contents must not be copied into audit metadata without a redaction decision.

### 15.3 Future domain events

The repository/service boundary should leave room for post-commit publication of stable events, but the first slice must not add a message broker or outbox without a cross-cutting architecture decision.

## 16. API Baseline Decisions Used By The Source

The Product Owner authorized starting API code using the plan's recommended defaults. The current source therefore uses this baseline:

1. One material item per request for MVP.
2. Multiple split purchase/order records in the request unit, with cumulative totals.
3. Optional unit/total purchase cost and reference, with no automatic Expense creation.
4. Editable/resubmittable `RETURNED_FOR_CHANGES` and terminal `REJECTED` are separate.
5. Explicit Project Materials workflow setting with an immutable workflow snapshot per request.
6. Project configuration uses `materials:configure`, not Organization-wide `settings:update`.
7. Project Manager has no final commercial approval by default.
8. Contractor Member and Site Supervisor create/update their own requests by default; they receive no purchase or delivery authority by default.
9. Delivery recording represents physical receipt for MVP. Builder Supervisor may record it; separate evidence verification is deferred.
10. Over-delivery is rejected. Completion requires cumulative delivered quantity to equal the full requested quantity; fully delivering a smaller partial order remains `PARTIALLY_DELIVERED` so another purchase can follow.
11. Critical purchase/delivery records have no edit/delete endpoint. An additive correction contract remains deferred.
12. The shared unit list is fixed for MVP; `OTHER` requires a custom label.
13. Backdated requests, purchases, and deliveries are accepted when the actor is otherwise authorized; every action remains timestamped and audited.
14. Reusable in-app Notification persistence/read APIs and transaction-aware Materials notification writes are included. Push delivery remains deferred.

## 17. Implementation Slices

### Slice M0: Contract and decision gate

- Create and approve `docs/modules/construction/materials/CONTRACTS.md`.
- Resolve section 16.
- Define exact state diagram, role matrix, field rules, correction behavior, units, errors, notification events, and API envelopes.
- Update module index to `contract_approved` only after Product Owner approval.

No source, migration, seed, or database work.

### Slice M1: Shared contracts and role taxonomy

- Add Materials constants/types/errors/permissions.
- Add permission descriptions and exports.
- Prepare role-template permission changes only as approved by the contract.
- Add shared contract tests/type-check coverage.

No database mutation.

### Slice M2: Notification prerequisite

- Approve the reusable Notification contract.
- Add notification persistence, read-state contract, recipient-safe repository, and transaction-aware creation helper.
- Keep push delivery out of scope.
- Verify tenant/user visibility and deep-link reauthorization rules.

This slice should remain reusable and not be embedded inside the Materials repository.

### Slice M3: SQL draft and preflight

- Create the next correctly numbered migration after re-reading the migration directory at implementation time; do not assume `016` if intervening migrations exist.
- Add Materials settings/request/event/purchase/delivery tables and indexes.
- Add a read-only preflight for conflicting tables/columns, invalid scoped references, and supported target capabilities.
- Review migration checksum and downgrade/forward-fix strategy.

Do not run status, migration, or seed commands without fresh exact-target approval.

### Slice M4: API read foundation

- Add `MaterialsModule`, DTOs, controller, service, repository, and AppModule registration.
- Implement settings read, list, detail, summary, and CSV export.
- Enforce Project access and stable filter semantics.
- Add service/repository tests for tenant/Project isolation and counts.

### Slice M5: Request and approval commands

- Implement draft create/update, submit/resubmit, verify, return, final approve, reject, and cancel.
- Add expected-version, idempotency, `FOR UPDATE`, immutable timeline, transaction-scoped audit, and approval notifications.
- Add role/responsibility/separation and invalid-transition tests.

### Slice M6: Purchase and delivery commands

- Implement purchase and partial/final delivery records.
- Add cumulative quantity/cost calculation, concurrency locks, completion transition, audit, and notifications.
- Add duplicate retry, simultaneous delivery, over-delivery, and financial precision tests.

### Slice M7: Seed and target rollout

- Inspect exact configured database target read-only.
- Obtain fresh approval for migration status, migration execution, guarded role synchronization, and any runtime fixtures.
- Apply only approved pending migrations.
- Run guarded seed with demo-user generation disabled unless separately approved.
- Verify tables, constraints, indexes, permission counts, duplicate grants, and empty/expected initial data.

### Slice M8: Authenticated API acceptance and handoff

- Verify direct Independent Contractor flow.
- Verify Builder-controlled final-only flow.
- Verify Builder Supervisor verification followed by separate final approval.
- Verify requester self-approval denial.
- Verify Contractor/Site Supervisor restrictions.
- Verify CUSTOM Project grant narrowing and unassigned/cross-tenant denial.
- Verify purchase/delivery concurrency and idempotent retries.
- Verify in-app recipient visibility and stale deep-link denial.
- Verify CSV scope/filter parity.
- Update current task, progress ledger, module index, OpenAPI/docs, and review report.

## 18. Test Matrix

### Unit/service

- every allowed and forbidden state transition;
- workflow-mode next-state resolution;
- available-actions derivation;
- self-approval/separation rules;
- quantity and cost normalization;
- cumulative ordered/delivered totals;
- expected-version conflicts;
- request fingerprint stability;
- CSV escaping and filter parity.

### Repository/integration

- transaction rollback leaves no request event, audit, or notification orphan;
- same idempotency key/same payload returns the same result;
- same key/different payload conflicts;
- concurrent approval permits one transition;
- concurrent deliveries cannot exceed ordered quantity;
- composite Organization/Project foreign keys reject cross-scope records;
- inactive/ended Member assignment cannot act or be assigned responsibility;
- immutable history has no standard update/delete path.

### Authorization

- Organization Owner/Admin and Independent Contractor Owner paths;
- Builder Supervisor verification but no default final approval;
- Contractor Member and Site Supervisor creation without commercial approval;
- Project Manager policy as approved;
- CUSTOM Project permission narrowing;
- Organization-wide access behavior;
- unassigned Project denial;
- cross-Organization ID manipulation denial;
- Platform Super Admin denial.

### Runtime acceptance

- authenticated workflows against an explicitly approved target;
- duplicate retry after client timeout;
- permission changes reflected after session refresh;
- notification recipient/read/deep-link behavior;
- CSV download and scope;
- no Expenses, Files, Workers, Wages, Kharchi, or Sales side effects.

## 19. Verification Commands

Static and test gates after implementation:

```text
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api test
pnpm --filter @nirman-app/api build
git diff --check
```

Use focused lint if package-wide lint remains noisy from unrelated files. Record package-wide inherited failures separately.

Database commands are separate gated operations:

```text
pnpm db:migrate:status
pnpm db:migrate
pnpm db:seed
```

Each requires fresh target-specific approval. A source build or unauthenticated `401` does not prove authenticated workflow, concurrency, browser, or physical-device acceptance.

## 20. Risks And Mitigations

| Risk                                                         | Mitigation                                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Permission granted but actor is wrong for workflow stage     | Check state, workflow snapshot, responsibility, requester separation, and effective Project permission in service. |
| Operating profile changes alter history                      | Snapshot workflow mode on request creation.                                                                        |
| Approval and audit diverge                                   | Write request event and generic audit in the same transaction.                                                     |
| Notifications duplicate or leak records                      | Deduplicate by source event/recipient/type and revalidate deep-link access.                                        |
| Concurrent deliveries over-deliver                           | Lock request and relevant totals with `FOR UPDATE`; reject stale version/excess.                                   |
| Costs become a second Expense ledger                         | Treat purchase cost as Materials fact only; no Expense side effect before an integration contract.                 |
| Arbitrary file URLs bypass ownership                         | Defer attachments until Files/Media metadata and access control exist.                                             |
| Offline retries duplicate writes                             | Require idempotency and fingerprints now; defer offline UX/storage claims.                                         |
| Role seed becomes over-permissive                            | Approve the actor matrix first and test default plus CUSTOM Project access.                                        |
| Material-only subscription checks diverge from other modules | Fix subscription enforcement in the shared access layer through separate approved work.                            |

## 21. Explicitly Out Of Scope

- Mobile or Web implementation.
- Offline local database, queue, conflict UI, or background sync.
- Push, SMS, email, or WhatsApp delivery.
- Vendor master, purchase orders payable, inventory/stock ledger, consumption, rate comparison, GST accounting, or procurement tendering.
- Automatic Expense creation, payment, reimbursement, or accounting entries.
- Invoice/challan/evidence attachments before Files/Media ownership exists.
- Unit conversion, wastage, stock transfer, returns to vendor, and quality inspection.
- AI estimation or material quantity calculation.
- Plan-specific Materials entitlement or usage billing.
- Database execution without fresh exact-target approval.

## 22. Exit Criteria

The API slice may be called source-complete only when:

- the Materials contract and section 16 decisions are approved;
- shared contracts and permissions are canonical;
- migration and seed changes are reviewed;
- read and write APIs enforce Organization/Project scope and effective permissions;
- workflow, separation, idempotency, optimistic concurrency, purchase, and delivery tests pass;
- timeline, audit, and in-app notifications are transactionally consistent;
- no unapproved Expenses, Files, Offline, or cross-module behavior exists;
- documentation and OpenAPI are updated.

It may be called runtime-verified only after separately approved migration/seed rollout and authenticated role/concurrency acceptance. It may be called fully accepted only after required mobile/web/offline client gates are completed under their own plans.
