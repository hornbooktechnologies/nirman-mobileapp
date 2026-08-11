# Planning

## Current Goal

Establish NirmanSite as an enterprise Builder SaaS product on top of the inherited full-stack monorepo foundation.

## Foundation Modules

- Authentication and session refresh
- Users
- Roles and permissions
- Settings
- Profile
- Upload storage utilities
- Shared UI components
- Shared permission constants
- MySQL/MariaDB database foundation using API-local `mysql2`
- Mobile app foundation with Expo, React Native, TypeScript, and Expo Router

## Product Modules To Plan

- Builder organizations
- Projects, phases, towers, floors, units, and inventory
- Leads, customers, bookings, and buyer profiles
- Payment schedules, demand notes, receipts, dues, and refunds
- Documents, verification, approvals, and templates
- Site progress, tasks, issues, checklists, photos, contractors, and work packages
- Notifications, reports, dashboards, and activity timelines

## Planning Rules

1. Define the module contract before building new modules.
2. Keep API, web, database, shared contracts, and mobile responsibilities explicit.
3. Add permissions and navigation as configuration.
4. Do not use Prisma for new NirmanSite work; plan SQL tables and `mysql2` repositories before coding.
5. `apps/mobile` is approved for mobile foundation work only; do not add NirmanSite business modules until their contracts are approved.
6. Keep verification green after implementation work begins.
7. Update `docs/tasks/current-task.md` for active implementation work.

## Current Database Direction

Prisma has been removed from NirmanSite's active runtime/tooling path. The implemented foundation uses plain MySQL/MariaDB access through `mysql2`, with all runtime database access kept inside `apps/api` repositories.

Follow `docs/decisions/004-database-access-mysql2.md` before any database implementation task.
