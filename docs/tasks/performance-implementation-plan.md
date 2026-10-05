# Performance implementation — approved 2026-10-05

User authorized the prioritized audit recommendations, including the two recommended index changes. Preserve all existing staged source work. No additional optional indexes, drops, server/pool changes, historical backfills or cross-request authorization caches.

1. Batch project summary membership/grant/Material approval reads while preserving owner/delegation/custom/date-window policies. Resolve both payment read/write permissions against one fresh context.
2. Batch source payment histories for Material purchases; keep exact ledger/void behavior and pending-schema compatibility.
3. Lean dated payment summary branches and exact monthly-to-headline reconciliation; prune unselected source list branches without changing lifetime or grouping. Scope dashboard child cost aggregates.
4. Separate Mobile summary/list refresh and abort obsolete reads. Preserve visible same-scope stats/cards during refresh. Reuse bounded scoped Web report reads across detail navigation, with write invalidation and no cross-user data exposure.
5. Prepare additive migration 029 for Materials scope/updated sort and Expenses scope/date sort only; inspect current target/status/index equivalence/metadata snapshot, apply with existing guards after source tests, then verify actual indexes/plans.
6. Run financial/access regression tests, shared/API/Web/Mobile checks, locale/scoped lint and diff checks. Capture sanitized post-change measurements separately from original audit evidence; report request/query count changes and diagnostic timing limits.

Database authorization is the explicit follow-up “yes do please” to the audit recommendation. Rollback client/API optimizations separately; no existing index or financial data removal. Browser/device/production concurrency acceptance remains separately recorded.

## Implementation and rollout evidence

Migration 029 applied 2026-10-05 to `md-in-30.webhostbox.net:3306/vishwlt9_nirmansite` using the guarded migration runner. Preflight private schema/index snapshot: `C:/Users/GENIUS/AppData/Local/Temp/nirman-index-preflight-TSzUpp`. This is scoped metadata, not a financial-data backup. Final migration status: 30 applied, zero pending. `verify-operational-list-indexes.ts` verifies exact columns and that each candidate supplies default ordering without filesort when selected. Application queries do not FORCE INDEX; optimizer choices depend on real selectivity.

### Diagnostic HTTP measurements

Three local authenticated samples per endpoint against the remote DB, medians in milliseconds:

| Read | Audit baseline | After changes |
| --- | ---: | ---: |
| Project access | 465.10 | 220.01 |
| Dashboard | 514.20 | 496.50 |
| Materials list | 290.91 | 268.07 |
| Site Expenses list | 246.08 | 234.41 |
| Total Expenses summary | 313.38 | 267.32 |
| Total Expenses list | 406.25 | 275.99 |

These are small diagnostic samples, not p95, production-load, network/device-render or controlled benchmark acceptance. October paid-report sample is empty. Other live work changed wage payment count from 32 to 33; this slice writes no payment data. Original evidence remains in `performance-index-audit-evidence.json`; new metadata, plans and measurements are in `performance-post-change-evidence.json`. Warm DB round trips remain about 22–25 ms. Two indexes now bring inventory to 412 (original inventory remains the 410-index baseline).

### Verification and remaining gates

44 API suites / 314 tests; 27 Web transport/financial/routing tests; two Mobile summary request tests; API build, Web typecheck/scoped lint and Webpack production build; Mobile typecheck, 19 locale namespaces across en/hi/gu, Android/Hermes export with `--max-workers 1`; actual MySQL SELECT-only payment fixtures and authenticated report reconciliation/access smoke passed. Default Turbopack build failed resolving its generated Google-font import; Webpack succeeded without product code/font changes. Initial parallel Android export exhausted host memory; single-worker retry passed. No browser/device or production concurrency/load acceptance claimed.

Rollback API/client optimizations through reviewed source changes independently of indexes. Leaving additive indexes in place is safe for old application versions; any later index removal requires its own review and authorization. No migration rollback, payment/history removal or data backfill performed.

Read-only live approval-policy equivalence passed for 21 member/project comparisons: batched decisions match the original full-member eligibility query. Synthetic access tests additionally cover custom grants/delegation/role ceilings; existing live personas do not establish all production permission combinations. Final API script/source typecheck and both staged/working diff checks passed.

## Follow-up local acceptance

Installed a temporary agent-browser runner without changing project dependencies. Restarted stopped local API/Web services (API notification delivery disabled; Web uses verified Webpack). Browser owner session prepared with short-lived local JWT and private temporary state; no login/refresh/financial submissions. Verified paid wage cards in All time, wage batch detail selection and Back to Total Expenses filter restoration, category-only summary reuse, explicit refresh (one summary request), scoped financial-event invalidation (one summary request, simulated event only), custom-date validation, unknown-project denial and no browser runtime errors. Desktop and 390x844 Web layouts have no horizontal overflow; narrow screenshot visually inspected. This is responsive Web evidence, not Expo/device acceptance.

Six concurrent authenticated GETs passed total/month/card reconciliation, unique grouped cards and category isolation; optimized Kharchi outstanding sorting and PAID/PARTIALLY_DEDUCTED/DEDUCTED filters passed. A diagnostic run showed roughly 435–493 ms per read; no production-volume or financial write-concurrency claim. New reproducible GET-only browser read script and private auth-fixture helper passed scoped lint; API typecheck passed. ADB is available but lists no connected devices; physical Android/iOS and Hindi/Gujarati device acceptance remain pending. Delegated financial write/void/replacement and production load/deployment acceptance remain separate. Browser closed and temporary token/context files removed; private screenshot retained outside repository.

Reproduce browser GET verification after loading the private state in a local authenticated report: pipe `apps/web/scripts/verify-financial-browser-reads.js` into `agent-browser --session nirman-verification eval --stdin`. `apps/api/scripts/prepare-browser-verification.ts` prepares a private temporary 20-minute existing-owner state only; delete the state/context files and close the browser afterwards. Never commit those files, tokens or screenshots containing customer data. Project dependencies unchanged.
