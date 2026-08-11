# Project Mission

NirmanSite is an enterprise Builder SaaS platform for real estate builders.

Its mission is to give builders one controlled operating system for projects, sites, customers, documents, payments, tasks, approvals, and field updates across web and mobile teams.

The product should reduce scattered spreadsheet, chat, and paper workflows by centralizing project data, enforcing role-based permissions, and making daily site and back-office status visible to the right users.

## Product Principles

- Builders should be able to manage projects, inventory, customers, users, documents, tasks, and approvals from a secure web portal.
- Site and sales teams should be able to capture updates from mobile-first workflows without depending on full back-office access.
- Shared business language, permissions, statuses, and validation schemas should live in shared packages so web, API, and future mobile apps remain consistent.
- AI assistants should work from Markdown context first, update planning docs before broad implementation, and avoid changing schema or application code without an approved task.

## Current Repository State

This repository currently contains a reusable TypeScript monorepo foundation with:

- `apps/api`: NestJS API foundation.
- `apps/web`: Next.js admin and back-office portal foundation.
- `apps/mobile`: Expo / React Native mobile foundation.
- Database direction: MySQL/MariaDB accessed from the API through the implemented `mysql2` foundation.
- `packages/shared`: Shared constants, schemas, and types.

The product direction is now NirmanSite. Existing generic template wording may remain only where it describes the inherited foundation or migration work that still needs approval.

Prisma is no longer the active runtime/tooling architecture for NirmanSite. Follow `docs/decisions/004-database-access-mysql2.md` before any backend database implementation.
