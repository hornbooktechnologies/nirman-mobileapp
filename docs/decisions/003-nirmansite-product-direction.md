# 003. NirmanSite Product Direction

## Status

Partially superseded by `004-database-access-mysql2.md` for database architecture.

## Date

2026-07-18

## Context

The repository began as a reusable enterprise application template with a NestJS API, Next.js web app, Prisma database package, and shared TypeScript package.

The new product direction is NirmanSite, an enterprise Builder SaaS platform for real estate builders. The platform will serve builder owners, administrators, sales teams, finance teams, project managers, site engineers, customer support users, and restricted viewers.

The user requested a Markdown-first planning pass only. Application code, Prisma schema, dependencies, generated output, and mobile app scaffolding must not be changed in this task.

## Decision

Adopt NirmanSite as the product direction for planning and architecture documents.

NirmanSite should be built as a modular SaaS product with:

- NestJS API backend.
- Next.js admin and back-office portal.
- Future Expo / React Native mobile app.
- MySQL/MariaDB database access through `mysql2`.
- Shared contracts, statuses, permissions, and schemas.
- AI-driven Markdown-first development workflow.

## Product Scope

Core modules should include:

- Organization and builder profile management.
- Users, roles, permissions, and audit logging.
- Project, phase, tower, floor, unit, and inventory management.
- Leads, customers, bookings, and buyer profiles.
- Payment schedules, demand notes, receipts, dues, and refunds.
- Documents, verification, approvals, and templates.
- Site progress, tasks, issues, checklists, photos, contractors, and work packages.
- Notifications, reports, dashboards, settings, and master data.

## Responsibility Split

The web portal owns administrative and back-office workflows:

- Organization setup.
- User and role management.
- Project and inventory setup.
- Customer, booking, document, payment, approval, report, and settings workflows.

The mobile app will eventually own field and fast-response workflows:

- Site progress capture.
- Task and issue updates.
- Checklist completion.
- Photo and document upload.
- Sales follow-ups and quick customer views.
- Notifications.

The backend owns:

- Authentication and authorization.
- Business rules and workflow state transitions.
- MySQL/MariaDB persistence through `mysql2` repositories.
- Audit logging.
- File upload orchestration.
- Notification events.
- Shared API contracts.

The shared package owns:

- Permission resources and actions.
- Status constants.
- Domain enums and labels.
- Zod schemas or equivalent validation contracts.
- Shared request/response types where useful.

## Consequences

- Product-specific implementation should now be documented before code changes.
- Existing template package names may stay temporarily until the package rename is approved.
- Prisma is no longer the forward database architecture. Database work must follow `docs/decisions/004-database-access-mysql2.md`.
- `apps/mobile` must not be created until mobile scope and Expo assumptions are approved.
- Generic template documentation can remain only where it describes current inherited foundation or migration work.

## Open Questions

- Should the first release be single-builder per deployment or multi-tenant SaaS?
- Should package scopes become `@nirmansite/*` immediately?
- Which domain module should be implemented first?
- Which database provider and hosting environment are approved for production?
- Does phase one require RERA, GST, demand-note, allotment-letter, or possession-specific compliance fields?
- Should site progress and task updates support offline mobile sync in the first mobile release?
