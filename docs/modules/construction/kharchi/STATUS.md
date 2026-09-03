# Kharchi / Worker Advances Module Status

> Contract status: approved.
>
> Implementation status: `IMPLEMENTATION COMPLETE — AUTHENTICATED AND DEVICE ACCEPTANCE PENDING`.
>
> Last reconciled: 2026-09-01 against the current checkout and recorded remote rollout evidence.

## Source Of Truth

The business rules are governed by `CONTRACTS.md`; the Mobile behavior is governed by
`MOBILE_INTEGRATION_CONTRACT.md`. Implemented fact is governed by the active shared, migration,
API, and Mobile source. Static checks and route registration do not replace authenticated,
concurrent-database, or physical-device acceptance.

## Delivered Scope

| Area | Current implementation | Verification boundary |
| --- | --- | --- |
| Shared contract | Canonical permissions, payment methods, balance statuses, errors, and API types | Shared/API compilation and focused tests were recorded during the API slice |
| Audit foundation | Durable audit events share the financial transaction for advance, adjustment, and Wage allocation writes | Source and mocked transaction tests passed; live rollback fault injection remains pending |
| Database | `012_audit_foundation.sql` and `013_kharchi.sql` define Audit and Kharchi persistence | Separately approved migrations applied to `md-in-30.webhostbox.net / vishwlt9_nirmansite`; four Kharchi/Audit tables and migration rows were verified |
| Authorization | Project-scoped `kharchi:read`, `create`, `adjust`, and `export`; approved default grants | 22 approved live grants were verified; authenticated role/project matrix remains pending |
| API | List, summary, detail, record-paid advance, immutable adjustment, CSV export, idempotency, assignment-date validation, and tenant/project scope | API/database health returned `200`; unauthenticated Kharchi route returned `401 AUTH_SESSION_REQUIRED`; authenticated and concurrency acceptance remains pending |
| Wages integration | Wage confirmation allocates oldest outstanding Kharchi first and records traceable allocations without making net wages negative | Source/tests recorded; authenticated end-to-end Wage/Kharchi confirmation remains pending |
| Mobile navigation | Permission-aware Menu destination and routes use active Project permissions | Source and Mobile type-check passed; physical role/device matrix remains pending |
| Mobile list | Project context, server summary, paginated list, refresh, search, export, empty/error/read-only states, and operational cards | Mobile type-check and Android Expo export passed |
| Mobile filters | Shared search/filter toolbar, active count, labelled bottom-sheet groups, 48dp radio rows, Apply/Clear actions, and removable applied filters | Locale/type/export checks passed; Clear all immediately removes applied filters and chips; device/Dynamic Type review remains pending |
| Mobile mutations | Record already-paid Kharchi, date-valid Worker selection, retry-safe idempotency, immutable detail, adjustment history, and Wage allocation history | Static and bundle checks passed; timeout retry and physical-device acceptance remain pending |
| Localization/accessibility | English, Hindi, and Gujarati resources; semantic roles/states, wrapping labels, theme tokens, and touch targets | Locale key/placeholder parity passed; fluent-language, TalkBack/VoiceOver, contrast, and largest-text review remains pending |

## Important Product Meaning

- `Date paid` is the date money was actually given or transferred to the Worker.
- Creating a record does not initiate payment; it records an already-completed payment and
  immediately increases outstanding Kharchi.
- `recordedAt` is separately the server timestamp when the record was added to NirmanSite.
- There is no request, approval, later mark-paid, cancel, edit, or delete flow.
- Corrections are immutable signed adjustments.
- Wage deduction calculation and allocation remain server-owned.

## Source Map

```text
packages/shared/src/constants/kharchi.ts
packages/shared/src/types/kharchi.ts
apps/api/src/database/sql/migrations/012_audit_foundation.sql
apps/api/src/database/sql/migrations/013_kharchi.sql
apps/api/src/modules/audit/
apps/api/src/modules/kharchi/
apps/mobile/app/(app)/kharchi.tsx
apps/mobile/app/(app)/kharchi-detail.tsx
apps/mobile/src/features/kharchi/
apps/mobile/src/components/ui/list-filter-controls.tsx
apps/mobile/src/i18n/locales/{en,hi,gu}/kharchi.json
```

## Recorded Verification

- Audit and Kharchi migrations applied only after exact-target approval.
- Four expected Kharchi/Audit tables and the `012`/`013` migration records were verified.
- Exactly 22 approved `kharchi:*` role grants were synchronized and verified.
- API and database health returned `200`/`ok`.
- Rebuilt Kharchi routes returned `401 AUTH_SESSION_REQUIRED` without authentication, proving
  route registration rather than authenticated behavior.
- Shared/API source checks and focused Kharchi/Audit/Wages tests were recorded in the API plan.
- Mobile locale validation passed for all namespaces across English, Hindi, and Gujarati.
- Mobile type-check, Android Expo export, and `git diff --check` passed for the Mobile slice.

## Remaining Acceptance Gates

- authenticated create/read/adjust/export role and Project-scope matrix;
- same-key retry and conflicting-key behavior against the live database;
- concurrent adjustment and Wage-allocation balance protection against live MySQL;
- automatic Wage deduction reflected in Kharchi after authenticated confirmation;
- physical small/large phone and tablet review in portrait/landscape;
- TalkBack/VoiceOver, largest text, contrast, keyboard avoidance, slow network, and timeout retry;
- fluent construction-domain review of Hindi and Gujarati terminology.

## Next Action

Run the authenticated role/workflow and live concurrency matrix with approved disposable records,
then complete physical-device accessibility and multilingual acceptance. Do not mark the module
`verified` or `accepted` from static checks or an unauthenticated route response alone.
