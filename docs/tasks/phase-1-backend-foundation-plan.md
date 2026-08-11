# Phase 1 Backend Foundation Plan

> Superseded database note: this plan was approved when NirmanSite still expected Prisma. On 2026-07-28, the database direction changed to plain MySQL/MariaDB access through `mysql2`. Do not execute the Prisma-specific sections below. Use `docs/decisions/004-database-access-mysql2.md` as the source of truth for database implementation.

## Status

Previously approved on 2026-07-18. Database portions are superseded as of 2026-07-28.

Implementation may begin in a separate coding task. This document is the approved Phase 1 backend foundation scope.

## Objective

Create the first backend foundation for NirmanSite by adding the minimum domain database structure, shared permissions, API modules, seed data, and verification workflow needed for builder organization setup, project inventory setup, customer/booking foundations, payments/documents foundations, and site operations foundations.

This phase should establish structure and safe contracts. It should not try to complete every business workflow.

## Non-Goals

- Do not create `apps/mobile`.
- Do not implement frontend feature pages beyond any later approved integration needs.
- Do not add advanced reporting, dashboards, analytics, or notification delivery.
- Do not implement offline sync.
- Do not build final legal/compliance document workflows until requirements are approved.
- Do not add third-party payment, SMS, WhatsApp, email, accounting, or RERA integrations.

## Phase 1 Assumptions

- NirmanSite should be modeled as multi-tenant from the start using `Organization` as the tenant boundary.
- Package scopes now use `@nirman-app/*`; product-facing copy may still say NirmanSite where intentional.
- The existing database provider remains MySQL/MariaDB for Phase 1 unless the owner approves a provider change.
- Existing platform models stay in place: `User`, `Role`, `Permission`, `RefreshToken`, `SystemSetting`, `AuditLog`, and `FileAsset`.
- Phase 1 should prefer UUID primary keys and explicit business identifiers such as project codes, unit numbers, booking numbers, demand numbers, and receipt numbers.
- Financial and legal records should not be hard-deleted; deletion behavior needs explicit approval before implementation.

## Prisma Model Plan

### Existing Models To Keep

- `User`
- `Role`
- `Permission`
- `RefreshToken`
- `SystemSetting`
- `AuditLog`
- `FileAsset`

### Existing Models To Extend

`User`

- Add optional organization membership relationship only if `OrganizationMember` is approved.
- Keep existing `roleId` until the team confirms whether users can belong to multiple organizations with different roles.

`FileAsset`

- Keep current polymorphic `context` and `contextId` fields for Phase 1.
- Use typed document records for business document status instead of overloading `FileAsset`.

### New Core Tenant Models

`Organization`

- Purpose: builder company / tenant boundary.
- Suggested fields: `id`, `name`, `legalName`, `slug`, `email`, `phone`, `website`, `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `country`, `gstNumber`, `reraRegistrationNumber`, `isActive`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: users through `OrganizationMember`, projects, customers, leads, contractors, document types, notifications.
- Constraints: unique `slug`; optional unique `gstNumber` and `reraRegistrationNumber` if business confirms uniqueness rules.

`OrganizationMember`

- Purpose: user membership inside a builder organization.
- Suggested fields: `id`, `organizationId`, `userId`, `roleId`, `designation`, `department`, `isActive`, `joinedAt`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: organization, user, role.
- Constraints: unique `organizationId + userId`.
- Approved Phase 1 direction: keep existing global `User.roleId` for compatibility and add `OrganizationMember` for tenant membership. Do not remove `User.roleId` in Phase 1.

### Project And Inventory Models

`Project`

- Purpose: top-level real estate project.
- Suggested fields: `id`, `organizationId`, `name`, `code`, `description`, `reraNumber`, `addressLine1`, `addressLine2`, `city`, `state`, `postalCode`, `country`, `status`, `startDate`, `targetPossessionDate`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: organization, phases, towers, units, document records, tasks, issues, site progress updates.
- Constraints: unique `organizationId + code`.

`ProjectPhase`

- Purpose: optional grouping for large project delivery phases.
- Suggested fields: `id`, `organizationId`, `projectId`, `name`, `code`, `status`, `startDate`, `targetCompletionDate`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: project, towers, units.
- Constraints: unique `projectId + code`.

`Tower`

- Purpose: building/tower inside a project or phase.
- Suggested fields: `id`, `organizationId`, `projectId`, `phaseId`, `name`, `code`, `totalFloors`, `status`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: project, phase, floors, units, progress updates.
- Constraints: unique `projectId + code`.

`Floor`

- Purpose: floor inside a tower.
- Suggested fields: `id`, `organizationId`, `projectId`, `towerId`, `floorNumber`, `label`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: tower, units.
- Constraints: unique `towerId + floorNumber`.

`Unit`

- Purpose: sellable inventory.
- Suggested fields: `id`, `organizationId`, `projectId`, `phaseId`, `towerId`, `floorId`, `unitNumber`, `unitType`, `configuration`, `carpetArea`, `saleableArea`, `price`, `status`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: project, phase, tower, floor, bookings, document records, tasks, issues.
- Constraints: unique `projectId + unitNumber`.

### CRM And Booking Models

`Lead`

- Purpose: sales prospect before conversion.
- Suggested fields: `id`, `organizationId`, `name`, `email`, `phone`, `source`, `requirement`, `budgetMin`, `budgetMax`, `status`, `assignedToId`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: organization, assigned user, follow-up tasks, optional converted customer.

`Customer`

- Purpose: buyer/customer profile.
- Suggested fields: `id`, `organizationId`, `name`, `email`, `phone`, `alternatePhone`, `address`, `city`, `state`, `postalCode`, `country`, `kycStatus`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: organization, bookings, booking buyer records, document records.
- Constraints: consider unique `organizationId + phone`; email uniqueness requires approval.

`Booking`

- Purpose: reserved/booked/sold unit workflow anchor.
- Suggested fields: `id`, `organizationId`, `bookingNumber`, `projectId`, `unitId`, `primaryCustomerId`, `status`, `approvalStatus`, `bookingDate`, `bookingAmount`, `saleAmount`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: organization, project, unit, primary customer, co-buyers, payment schedules, demands, receipts, document records, approval requests.
- Constraints: unique `organizationId + bookingNumber`.

`BookingBuyer`

- Purpose: primary and co-buyer relationship.
- Suggested fields: `id`, `organizationId`, `bookingId`, `customerId`, `buyerType`, `ownershipShare`, `createdAt`, `updatedAt`.
- Relationships: booking, customer.
- Constraints: unique `bookingId + customerId`.

### Finance Models

`PaymentSchedule`

- Purpose: planned booking payment milestones.
- Suggested fields: `id`, `organizationId`, `bookingId`, `name`, `sequence`, `dueType`, `dueDate`, `percentage`, `amount`, `status`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: booking, payment demands.

`PaymentDemand`

- Purpose: demand note issued to customer.
- Suggested fields: `id`, `organizationId`, `bookingId`, `scheduleId`, `demandNumber`, `demandDate`, `dueDate`, `amount`, `taxAmount`, `totalAmount`, `status`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: booking, payment schedule, receipts, document records.
- Constraints: unique `organizationId + demandNumber`.

`PaymentReceipt`

- Purpose: payment received and verification record.
- Suggested fields: `id`, `organizationId`, `bookingId`, `demandId`, `receiptNumber`, `receiptDate`, `amount`, `paymentMode`, `referenceNumber`, `status`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: booking, demand, document records.
- Constraints: unique `organizationId + receiptNumber`.

### Document And Approval Models

`DocumentType`

- Purpose: configurable document requirements.
- Suggested fields: `id`, `organizationId`, `name`, `code`, `module`, `isRequired`, `isActive`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: organization, document records.
- Constraints: unique `organizationId + code`.

`DocumentRecord`

- Purpose: business status around uploaded files.
- Suggested fields: `id`, `organizationId`, `documentTypeId`, `fileAssetId`, `context`, `contextId`, `status`, `remarks`, `verifiedById`, `verifiedAt`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: document type, file asset, verifier.
- Note: `context` should initially support `customer`, `booking`, `project`, `unit`, `payment-demand`, `payment-receipt`, `task`, and `issue`.

`ApprovalRequest`

- Purpose: generic approval workflow for risky changes.
- Suggested fields: `id`, `organizationId`, `context`, `contextId`, `action`, `status`, `requestedById`, `approvedById`, `requestedAt`, `decidedAt`, `remarks`, `createdAt`, `updatedAt`.
- Relationships: organization, requester, approver.
- Note: use for booking approval, payment verification, document rejection/verification, and future site progress approval if needed.

### Site Operations Models

`Contractor`

- Purpose: vendor/contractor master.
- Suggested fields: `id`, `organizationId`, `name`, `contactPerson`, `email`, `phone`, `trade`, `isActive`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: organization, work packages, tasks.

`WorkPackage`

- Purpose: package of site work assigned to a contractor or team.
- Suggested fields: `id`, `organizationId`, `projectId`, `contractorId`, `name`, `description`, `status`, `startDate`, `targetEndDate`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: project, contractor, tasks, progress updates.

`Task`

- Purpose: assigned work item across modules.
- Suggested fields: `id`, `organizationId`, `projectId`, `unitId`, `workPackageId`, `context`, `contextId`, `title`, `description`, `priority`, `status`, `assignedToId`, `dueDate`, `completedAt`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: project, unit, work package, assigned user, issues, checklist runs, document records.

`Issue`

- Purpose: problem or blocker record.
- Suggested fields: `id`, `organizationId`, `projectId`, `unitId`, `taskId`, `title`, `description`, `severity`, `status`, `assignedToId`, `resolvedAt`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Relationships: project, unit, task, assigned user, document records.

`ChecklistTemplate`

- Purpose: reusable checklist structure.
- Suggested fields: `id`, `organizationId`, `name`, `module`, `items`, `isActive`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Note: `items` can begin as JSON in Phase 1 if detailed checklist item tables are not needed yet.

`ChecklistRun`

- Purpose: submitted checklist instance.
- Suggested fields: `id`, `organizationId`, `templateId`, `context`, `contextId`, `status`, `responses`, `submittedById`, `submittedAt`, `createdAt`, `updatedAt`.
- Note: `responses` can begin as JSON in Phase 1.

`SiteProgressUpdate`

- Purpose: structured site progress capture.
- Suggested fields: `id`, `organizationId`, `projectId`, `towerId`, `floorId`, `unitId`, `workPackageId`, `progressDate`, `progressPercent`, `notes`, `status`, `submittedById`, `approvedById`, `approvedAt`, `createdAt`, `updatedAt`.
- Relationships: project, tower, floor, unit, work package, submitter, approver, document/photo records.

### Notification Model

`Notification`

- Purpose: in-app notification record for later delivery.
- Suggested fields: `id`, `organizationId`, `userId`, `type`, `title`, `message`, `context`, `contextId`, `readAt`, `createdAt`.
- Relationships: organization, user.

## Shared Permissions Plan

### Resources

Add these resources to `packages/shared/src/constants/permissions.ts` when implementation begins:

- `organizations`
- `projects`
- `inventory`
- `leads`
- `customers`
- `bookings`
- `payments`
- `documents`
- `approvals`
- `tasks`
- `issues`
- `site-progress`
- `contractors`
- `reports`
- `notifications`

Keep existing resources:

- `users`
- `roles`
- `settings`
- `files`
- `audit-logs`

### Actions

Keep existing actions:

- `create`
- `read`
- `update`
- `delete`
- `manage`

Approved Phase 1 direction: avoid new actions at first and model approval/verification through `approvals:manage`, `documents:update`, and `payments:update` until a later workflow proves it needs separate action keys.

### Role Permission Matrix

`super-admin`

- Full `manage` access to all resources.

`builder-owner`

- Manage organization, projects, inventory, users, reports, settings, approvals.
- Read and manage key operational modules for their organization.

`admin`

- Manage users, projects, inventory, customers, documents, tasks, issues, and settings.
- Read payments and reports unless finance approval says otherwise.

`sales-manager`

- Manage leads, customers, bookings, sales-related documents, and reports.
- Read projects, inventory, payments, tasks, and approvals.

`sales-executive`

- Create/read/update assigned leads and customers.
- Create draft bookings if approved.
- Read available inventory and own follow-up tasks.

`project-manager`

- Manage site-progress, tasks, issues, contractors, work packages, and project execution records.
- Read projects, inventory, documents, reports.

`site-engineer`

- Create/update assigned site-progress, tasks, issues, checklist runs, and photo/document uploads.
- Read assigned projects, towers, floors, units, and work packages.

`finance-manager`

- Manage payments, demands, receipts, payment documents, and finance approvals.
- Read bookings, customers, projects, inventory, and reports.

`customer-support`

- Read customers, bookings, documents, payments, and tasks.
- Create/update customer service issues and document follow-ups.

`viewer`

- Read-only access to approved reports and selected project/customer records.

## API Module Plan

Follow the existing NestJS module shape:

- `*.controller.ts` for HTTP endpoints.
- `*.service.ts` for business rules.
- `*.repository.ts` for mysql2 SQL access. The older Prisma wording in this plan is superseded.
- `dto/` for request validation.
- `types/` for module-specific types.

### `organizations`

- Purpose: tenant and builder profile management.
- Endpoints: list, detail, create, update, activate/deactivate.
- Permissions: `organizations:create`, `organizations:read`, `organizations:update`, `organizations:manage`.
- Notes: this module should define tenant scoping behavior used by all product modules.

### `projects`

- Purpose: project, phase, tower, floor, and unit inventory setup.
- Endpoints: project CRUD, phase CRUD, tower CRUD, floor CRUD, unit CRUD, inventory status update.
- Permissions: `projects:*`, `inventory:*`.
- Notes: keep inventory status transitions in service methods.

### `crm`

- Purpose: leads, customers, and buyer profiles.
- Endpoints: lead CRUD, assign lead, customer CRUD, lead conversion placeholder.
- Permissions: `leads:*`, `customers:*`.
- Notes: booking creation can reference customers but should live in `bookings`.

### `bookings`

- Purpose: booking lifecycle foundation.
- Endpoints: create draft booking, list, detail, update draft, submit for approval, cancel draft.
- Permissions: `bookings:*`, `approvals:read`.
- Notes: final approval workflow can be minimal in Phase 1 but should create `ApprovalRequest` records.

### `payments`

- Purpose: payment schedules, demands, and receipts foundation.
- Endpoints: schedule CRUD, demand CRUD, receipt CRUD, payment status summary.
- Permissions: `payments:*`.
- Notes: avoid accounting integration in Phase 1.

### `documents`

- Purpose: document types and document records.
- Endpoints: document type CRUD, attach file to context, update document status, list documents by context.
- Permissions: `documents:*`, `files:create`, `files:read`.
- Notes: reuse existing upload/file asset foundation.

### `approvals`

- Purpose: generic approval records.
- Endpoints: list pending approvals, detail, approve, reject, cancel.
- Permissions: `approvals:*`.
- Notes: keep approval side effects explicit per context and avoid generic mutation magic.

### `site-operations`

- Purpose: contractors, work packages, tasks, issues, checklists, and site progress.
- Endpoints: contractor CRUD, work package CRUD, task CRUD/status update, issue CRUD/status update, checklist template/run foundation, site progress CRUD/submit.
- Permissions: `contractors:*`, `tasks:*`, `issues:*`, `site-progress:*`.
- Notes: mobile will later consume a smaller subset of this module's API.

### `notifications`

- Purpose: persistent in-app notification records.
- Endpoints: list current user notifications, mark read, create system notification from backend services.
- Permissions: `notifications:read`, `notifications:update`, `notifications:manage`.
- Notes: no push/email/SMS delivery in Phase 1.

## Seed Data Plan

### Roles

Seed approved Phase 1 roles:

- `super-admin`
- `builder-owner`
- `admin`
- `sales-manager`
- `sales-executive`
- `project-manager`
- `site-engineer`
- `finance-manager`
- `customer-support`
- `viewer`

### Permissions

Seed permissions from shared resource/action constants.

- Give `super-admin` all `manage` permissions and, if the app requires action-specific checks, all explicit actions too.
- Give `builder-owner` broad organization-scoped permissions.
- Keep `viewer` read-only.
- Avoid over-permissioning mobile-first roles such as `site-engineer`.

### Organization

Seed one demo organization only for local development:

- Name: `NirmanSite Demo Builder`
- Slug: `demo-builder`
- Country: `India`

### Users

Seed one admin user from `.env` as the initial `super-admin`.

Optional local-only demo users can be added after approval:

- builder owner
- sales manager
- project manager
- site engineer
- finance manager

### Master Data

Seed only stable, low-risk defaults:

- Project statuses.
- Unit statuses.
- Lead statuses.
- Booking statuses.
- Payment statuses.
- Document statuses.
- Task, issue, and approval statuses.

Prefer shared constants for these values so seed data, API validation, web UI, and future mobile UI stay aligned.

## Verification Plan

### Before Coding

- Use the approved multi-tenant model with `Organization` as the tenant boundary.
- Keep package scopes as `@nirman-app/*` during Phase 1 unless a separate package-scope decision is approved.
- Use the mysql2 foundation from `docs/decisions/004-database-access-mysql2.md`; the older Prisma provider instruction is obsolete.
- Use the approved Phase 1 role list in this plan.
- Keep the existing generic permission actions only.
- Implement the proposed Phase 1 model set unless a later task explicitly narrows scope.

### Obsolete Prisma Verification

Do not run historical Prisma generate, push, migrate, or seed commands for current NirmanSite work.

Use the current mysql2/API verification from `docs/tasks/current-task.md` instead.

### After Shared Permission And Status Changes

Run:

```bash
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/shared type-check
```

### After API Module Changes

Run:

```bash
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api lint
pnpm --filter @nirman-app/api test
```

Add targeted unit tests for:

- Permission guards on new routes.
- Tenant scoping in repositories/services.
- Status transition validation.
- Booking approval request creation.
- Payment demand and receipt constraints.
- Document status updates.

### Full Workspace Check

Run before handing off implementation:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

## Recommended Implementation Order

1. Add shared status constants and permission resources.
2. Add approved SQL table plans for tenant and core domain models.
3. Update mysql2 seed/data setup after SQL approval.
4. Implement organization scoping helper/pattern in the API.
5. Implement `organizations` module.
6. Implement `projects` and inventory module.
7. Implement `crm` and `bookings` foundations.
8. Implement `payments`, `documents`, and `approvals` foundations.
9. Implement `site-operations` foundation.
10. Add API tests and full verification.

## Approved Defaults For Phase 1

- Multi-tenancy is approved for Phase 1 using `Organization`.
- Keep both existing `User.roleId` and new `OrganizationMember` in Phase 1.
- Keep package imports as `@nirman-app/*`.
- Include the proposed Phase 1 backend foundation model set.
- Use only `create`, `read`, `update`, `delete`, and `manage` permission actions.
- Use JSON fields for `ChecklistTemplate.items` and `ChecklistRun.responses` in Phase 1.
- Support document contexts for `customer`, `booking`, `project`, `unit`, `payment-demand`, `payment-receipt`, `task`, and `issue`.
- Use Prisma `Decimal` for money fields.
- Include RERA and GST fields as optional Phase 1 fields.
- Seed one local demo organization and the approved roles/permissions.
