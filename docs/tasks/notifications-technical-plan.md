# Notifications Vertical Slice Technical Plan

Authorized 2026-09-03: contract, shared types, additive SQL, guarded migration/seed sync, NestJS API and Expo push delivery, localized Mobile inbox/navigation, and verification without intermediate approval pauses.

## Audit

- `EXISTING`: migration 016 notification rows; recipient-safe list/read API; transactional Materials, Expenses, and Gallery producers.
- `NEEDS_CHANGE`: shared typing, unread summary, operational role grants, importance, error codes, and route consistency.
- `MISSING`: device registrations, push outbox/worker, localized mobile inbox, badge, push response handling, tests/docs.
- `DEFERRED`: producers owned by unfinished modules, Web inbox, preferences, non-push channels, generic offline sync, receipts/analytics.

## Delivery sequence

1. Contract/shared contract and migration 022.
2. Recipient/device/outbox API plus Expo worker with retry.
3. Seed operational `notifications:read` grants.
4. Expo Notifications provider, badge, inbox, localized copy, safe routing.
5. Static/tests, guarded migration and seed, schema/runtime checks, docs status.

## Integrity rules

Preserve user/Organization isolation; never expose create APIs or tokens; enqueue in producer transactions; deduplicate at database boundaries; target APIs reauthorize; keep push failure independent from committed business actions and in-app visibility.
