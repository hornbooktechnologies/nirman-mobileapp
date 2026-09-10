# Lead Conversion And Booking Linkage Technical Plan

## Status

- Date: 2026-09-03
- Contract authority: `MVP_REQUIREMENTS.md` section 23 and `docs/modules/sales/CONTRACT.md`
- Delivery shape: complete the existing Sales CRM booking slice in place; do not create a parallel module.

## Audit Classification

- `EXISTING`: Project-scoped Lead, Unit, block, interest, booking, cancellation, own/team/all visibility, RBAC, transaction locking, and basic Mobile booking/cancellation UI.
- `NEEDS_CHANGE`: immutable audit integration, concurrent idempotency retry handling, server-authoritative customer snapshotting, conversion/restoration snapshots, booking detail API/UI, and complete retry/success feedback.
- `MISSING`: focused booking repository/runtime verifier and explicit acceptance evidence.
- `DEFERRED`: payments, documents, customer portal, commission calculation, background offline queue, notification delivery, Web Sales UI, and physical-device acceptance.
- `CONFLICT`: none. The requested module is an approved part of Sales CRM.

## Implementation

1. Add migration `021_sales_booking_linkage.sql` for request fingerprints, conversion/restoration snapshots, lead-source snapshot, and status/date lookup index.
2. Keep existing permission keys: `leads:convert` for all bookings and `inventory:book` additionally for Unit-linked bookings.
3. Make the API derive customer name/mobile/source and pre-conversion states from locked Lead/Unit rows.
4. Make retries deterministic by fingerprinting the logical request and returning the existing booking for an identical key/request, including concurrent duplicate-key races.
5. Write `sales.booking-confirmed` and `sales.booking-cancelled` to immutable `audit_events` in the same transaction as Sales state changes.
6. Add booking filters/detail response with actor names, Lead/Unit linkage, snapshots, and cancellation restoration evidence.
7. Add a Mobile booking detail route, retain one idempotency key across retries, validate amount/date, show confirmation feedback, and keep cancellation explicit.
8. Maintain en/hi/gu parity and use existing NirmanSite operational UI primitives and semantic tokens.

## Verification Gates

- Shared/API/Mobile type-check and API build.
- Focused Sales tests and lint; locale validation; Android Expo export; `git diff --check`.
- Guarded migration and seed against the configured target, followed by read-only schema/RBAC verification.
- Authenticated runtime booking, idempotent replay/conflict, audit, cancellation restoration, and visibility smoke where test credentials are available.
- Physical-device, Dynamic Type, screen-reader, dark-mode, and landscape acceptance remain separate manual gates.

## Delivery Evidence

- Implemented in the existing Sales CRM domain rather than as a competing booking model.
- Applied migration `021_sales_booking_linkage.sql`; the configured database reports 22 of 22 migrations applied.
- Re-synced the standard role templates without creating demo users and verified `leads:convert` plus `inventory:book` for the Sales User template.
- Read-only booking verification passed for all six linkage columns and all three booking indexes; the existing target contained no bookings to backfill.
- API type-check, build, full API tests, focused Sales lint/tests, Mobile type-check, locale validation, Android production export, and whitespace validation passed.
- Built-listener smoke confirmed the booking-detail route is registered and rejects an unauthenticated request with `401`.
- Authenticated create/replay/conflict/cancel acceptance remains pending because the configured target has no non-platform test user; device and accessibility review remain manual gates.
