# Total Expenses implementation plan

Approved source scope: API/shared/migration files, Web and Mobile, 2026-10-05. Contract: docs/modules/construction/total-expenses/CONTRACTS.md.

1. Add shared report/payment contracts, exact money/date helpers, permissions and retired creation categories.
2. Prepare migration 028 with two payment tables, two immutable void tables, constraints/indexes and owner permission grants. Do not execute or backfill.
3. Implement scoped payment repository/service/controllers, transaction locks, idempotency/version checks and audit. Enrich source details; guard expense adjustments.
4. Implement report repository/service/controller with repeatable-read grouped SQL, dated partial payments and readable destinations.
5. Implement Web report/project navigation and source-detail payment panels.
6. Implement Mobile report/navigation, source payment sheets and en/hi/gu strings using existing UI primitives (ui-ux-pro-max unavailable).
7. Verify focused financial/access tests, all workspace typechecks/builds, scoped lint, locale parity and diff checks. Record unrun database/authenticated/device gates separately.

## Rollout and rollback
Separately authorize exact-target migration 028 after status/preflight, deploy API then Web/Mobile. Existing records have no inferred payments. Rollback via permissions/feature availability and compatible prior client; retain all payment/audit data. No destructive down migration.

## Current evidence
Source implementation complete. See [module status](../modules/construction/total-expenses/STATUS.md) for separated evidence and runtime gates.

Verified: 311 API tests in 44 suites; 19 focused Web tests; shared/API/Web builds; API/Web/Mobile typechecks; scoped lint; 19 locale namespaces in en/hi/gu; Android Hermes export; read-only inline synthetic SQL fixtures on configured MySQL; diff checks. Browser route responded HTTP 200 but authenticated visual/payment acceptance was not run.

Migration status read with bootstrap disabled: local 29, applied 28, pending 028 only. Migration/seed/backfill/payment writes not run. Readiness is source-complete, not schema-installed or runtime-accepted.

## Authorized rollout checklist (next stage)

1. Obtain separate exact-target database authorization and inspect status/checksum, backups, scoped FK types/collations and grants. Do not combine authorization with historical backfill.
2. Apply only migration 028; verify all four tables, source/actor FKs, retry/date/source indexes and owner permission grants. Record migration checksum/state.
3. Deploy API; refresh sessions. Verify missing-schema compatibility ceases and actual ledger/report reads reconcile.
4. On authorized non-production fixtures, run simultaneous payment requests, overpayment/version/retry conflicts, audited void/new replacement, approved-adjustment floor and tenant/project/source isolation. Validate rollback/atomicity with failures.
5. Deploy Web then Mobile. Check authenticated report-only and source-read/write personas, archived project reads, purchase detail targeting and return filters. Separately record browser responsive/keyboard and physical-device en/hi/gu/network-retry acceptance.
6. Historical confirmation is a separate explicit business action by authorized users after duplicate legacy review. Never infer prior payment from workflow dates.

Rollback: revoke new delegated feature permissions/hide navigation or restore compatible clients/API as needed; retain new tables/payments/voids/audit. Never delete financial rows or apply a destructive down migration.


## Authorized follow-up rollout result — 2026-10-05

Applied only migration 028 to configured `md-in-30.webhostbox.net:3306/vishwlt9_nirmansite`, through existing confirmation/remote guards and migration lock. Preflight: no drift/other pending files, scoped source key types/collations compatible, metadata snapshot saved outside Git. Current 29/29 applied, zero pending. Four new empty payment/history tables, scoped FKs/indexes and five grants for both owner templates verified. No seed/backfill/financial payments.

Actual-schema report reads and authenticated existing local Owner report GET smoke passed, including monetary/month/card reconciliation and date/page/auth/foreign-scope failures. Runtime script uses existing short-lived JWT verification convention without printing tokens or financial values. Remote API/Web/Mobile deployment, delegated accounts, real concurrent payment writes, browser and physical-device acceptance are still separate unrun checks. Existing local servers were preserved.
