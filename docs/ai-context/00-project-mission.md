# Project Mission

NirmanSite is a mobile-first construction operating platform for Builder and Independent Contractor customer Organizations.

Its mission is to give Builders and Contractors one controlled operating system for projects, sites, workers, sales, documents, payments, approvals, and field updates across web and mobile teams.

The product should reduce scattered spreadsheet, chat, and paper workflows by centralizing project data, enforcing role-based permissions, and making daily site and back-office status visible to the right users.

## Product Principles

- Builders should be able to manage projects, inventory, customers, users, documents, tasks, and approvals from a secure web portal.
- Site and sales teams should be able to capture updates from mobile-first workflows without depending on full back-office access.
- Shared business language, permissions, statuses, and validation schemas should live in shared packages so web, API, and future mobile apps remain consistent.
- AI assistants should work from Markdown context first, update planning docs before broad implementation, and avoid changing schema or application code without an approved task.

## Approved Initial Commercial Direction

- A Subscription belongs to a `BUILDER` or `CONTRACTOR` Organization; customers buy Organization capacity, not roles.
- Every initial paid plan includes all core MVP modules as released and differs primarily by active-Project capacity, active login-Member capacity, storage, and Subscription validity/status.
- Workers are non-login workforce records, are unlimited for the initial plan model, and do not consume Member seats.
- Roles and Operating Profiles are not premium products. Builder Supervisor and Site Supervisor are distinct responsibilities, and Supervisor capability is available to every paid Organization.
- Initial customer provisioning is manually assisted by the NirmanSite team and Platform Super Admin; automated checkout and billing are deferred.
- Project authorization supports a role-ceiling model: Organization Role permissions are the maximum, Project assignment controls scope, and a `CUSTOM` Project permission matrix may narrow allowed actions per Project. `ROLE_DEFAULT` preserves existing assignment behavior.
- Subscription persistence and configurable active-Project/active-Member capacity are implemented. Storage remains a reported plan value until Files And Media provides durable byte accounting.

See `docs/decisions/006-subscription-capacity-supervisor-commercial-provisioning.md` for the approved decision and unresolved commercial values.

## Current Repository State

This repository currently contains a reusable TypeScript monorepo foundation with:

- `apps/api`: NestJS API foundation.
- `apps/web`: Next.js admin and back-office portal foundation.
- `apps/mobile`: Expo / React Native mobile foundation.
- Database direction: MySQL/MariaDB accessed from the API through the implemented `mysql2` foundation.
- `packages/shared`: Shared constants, schemas, and types.

The product direction is now NirmanSite. Existing generic template wording may remain only where it describes the inherited foundation or migration work that still needs approval.

Prisma is no longer the active runtime/tooling architecture for NirmanSite. Follow `docs/decisions/004-database-access-mysql2.md` before any backend database implementation.
