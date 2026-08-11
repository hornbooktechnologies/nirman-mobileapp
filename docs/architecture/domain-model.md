# Domain Model

This document proposes NirmanSite's initial domain model. It is planning-only and should not be treated as an approved database schema.

NirmanSite no longer uses Prisma as the forward database architecture. Treat model names below as domain concepts that should become SQL table proposals and repository contracts using `mysql2`.

## Domain Areas

- Organization: builder company, branches, teams, and users.
- Access control: roles, permissions, audit logs, and activity history.
- Project setup: projects, phases, towers, floors, units, amenities, and milestones.
- Sales CRM: leads, customers, follow-ups, bookings, and buyer profiles.
- Finance: payment schedules, demands, receipts, dues, refunds, and ledger references.
- Documents: document types, uploaded files, verification, approvals, and templates.
- Construction operations: work packages, contractors, tasks, issues, checklists, site progress, and photos.
- Notifications: reminders, assignments, approval requests, and status changes.

## Initial SQL Table Proposal

Keep existing foundation table concepts:

- `users`
- `roles`
- `permissions`
- `role_permissions`
- `refresh_tokens`
- `system_settings`
- `audit_logs`
- `file_assets`

Add product table concepts after approval:

- `Organization`: builder company profile and tenant boundary.
- `OrganizationMember`: user membership, organization role, and active status if multi-tenant membership is needed.
- `Project`: project identity, RERA details, address, status, start date, and possession target.
- `ProjectPhase`: optional phase grouping for large projects.
- `Tower`: building/tower within a project.
- `Floor`: floor metadata within a tower.
- `Unit`: sellable inventory with number, type, carpet area, saleable area, status, price, and ownership state.
- `Lead`: sales prospect with source, requirement, budget, assignee, and follow-up status.
- `Customer`: buyer profile with contact, KYC summary, and relationship to bookings.
- `Booking`: reserved or sold unit with customer, project, unit, amount, date, status, and approval state.
- `BookingBuyer`: supports primary and co-buyer relationships.
- `PaymentSchedule`: milestone-based demand structure for a booking or project.
- `PaymentDemand`: demand note issued against a booking.
- `PaymentReceipt`: payment received, reference number, mode, amount, and verification state.
- `DocumentType`: configured document requirement by module or workflow.
- `DocumentRecord`: uploaded document linked to customer, booking, project, unit, or task.
- `ApprovalRequest`: generic approval workflow record for bookings, payments, documents, and operational changes.
- `Task`: assigned work item with due date, priority, module context, and status.
- `Issue`: site or customer issue with severity, owner, photos, comments, and resolution status.
- `ChecklistTemplate`: reusable checklist definition.
- `ChecklistRun`: checklist instance for a project, unit, task, or site visit.
- `SiteProgressUpdate`: progress percentage, note, date, project/tower/floor/unit scope, submitted by, and approval status.
- `Contractor`: contractor or vendor record.
- `WorkPackage`: package of construction work assigned to contractor or internal team.
- `Notification`: user-facing notification record.

## Core Status Families

- Project status: planned, active, on-hold, completed, archived.
- Unit status: available, blocked, reserved, booked, sold, cancelled.
- Lead status: new, contacted, site-visit-planned, negotiation, converted, lost.
- Booking status: draft, pending-approval, approved, active, cancelled, completed.
- Payment status: pending, partially-paid, paid, overdue, refunded, cancelled.
- Document status: required, uploaded, verified, rejected, expired.
- Task status: open, in-progress, blocked, done, cancelled.
- Issue status: open, assigned, in-progress, resolved, closed.
- Approval status: draft, submitted, approved, rejected, cancelled.

## Modeling Notes

- Use UUID primary keys consistently unless a business requirement needs numeric sequences.
- Keep human-facing numbers such as project codes, booking numbers, demand numbers, and receipt numbers separate from primary keys.
- Prefer audit columns on product models: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
- Add soft delete or archival behavior only after approval; some financial and legal records should not be deleted.
- Model multi-tenancy explicitly before adding domain tables. Most product tables should likely belong to `Organization`.
