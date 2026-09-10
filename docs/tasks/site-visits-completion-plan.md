# Site Visits Completion Plan

## Audit

- `EXISTING`: Sales-owned shared statuses, `site-visits:manage`, stable not-found error, migration `011_sales_crm.sql`, NestJS routes/service/repository, timeline events, seed grants, mobile service/types, lead scheduling, list cards, and en/hi/gu copy.
- `NEEDS_CHANGE`: salesperson/status/date filtering, own-user filter hardening, reschedule time, terminal-state integrity, complete outcome capture, attendee entry, salesperson labels, focused tests, and remote verification.
- `DEFERRED`: notification delivery/reminder jobs, offline writes, authenticated write/concurrency smoke, and physical-device/accessibility/fluent-language acceptance.
- `NO DIRECT DEPENDENCY`: wages, Kharchi, materials, expenses, progress, gallery, and inventory state.

## Delivery

1. Extend the existing Sales contract and DTOs without creating a parallel module or table.
2. Add Project-scoped list filters and server-enforced lifecycle rules.
3. Complete the Expo Site Visits workflow with existing operational cards, chips, sheets, tokens, and localization.
4. Reuse migration `011`, run guarded current-state migration and canonical role seed sync, then verify table shape and grants read-only.
5. Run focused API tests, shared/API/Mobile checks, locale parity, export, lint, and whitespace validation; record unrun acceptance gates.
