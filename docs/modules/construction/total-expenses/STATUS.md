# Total Expenses status

## 2026-10-06 Mobile controls and loading feedback

Period/refresh controls and source filters now use even two-column rows instead of spaced wrapping buttons. Shared button labels can shrink/wrap with icons and larger text. The report renders an 88px loader below source filters during initial reads, refresh, category and page changes, including when the summary is cached and the list has been cleared. Refresh shows busy feedback and pagination is disabled while loading. Shared Lottie loading has a native spinner fallback on animation failure; loading states announce busy status. Existing scoped summary reuse, report permissions and financial behavior are preserved.

Verification: Mobile typecheck, en/hi/gu validation (19 namespaces), two existing summary-request tests and diff checks passed. Physical-device visual/animation acceptance remains pending. No API, database or deployment changes. The ui-ux-pro-max companion skill was unavailable; existing theme/components were used.

2026-10-05: implementation_complete_schema_verified_runtime_acceptance_partial.

Migration 028 is now applied following the user’s rollout authorization. Authenticated local owner report reads and failure-path smoke passed. Full browser/device/delegated/payment-write acceptance and remote application deployments remain pending.

API/shared, additive SQL migration, Web and Mobile source are implemented against the approved [contract](CONTRACTS.md). Read-only paid reports include partial payments and exclude unpaid amounts/Kharchi. Payment controls remain in Materials/Expenses; report permission intentionally gives complete cross-source financial visibility, while source detail reads retain independent authorization.

## Automated / read-only evidence

- All 44 API suites, 311 tests pass, including financial/query/access/regression tests.
- 19 focused Web source rules, API adapter and safe report-return tests pass.
- Shared build, API build, Web production build and all three app typechecks pass.
- Scoped API/new module and Web lint pass; locale validation covers 19 namespaces in en/hi/gu.
- Android Expo export produces Hermes bundle; this is bundle verification, not device acceptance.
- Read-only synthetic report fixture checks pass on configured MySQL: exact partial/date/void totals, monthly reconciliation, grouping/pagination and foreign scopes. Only SELECT queries/read-only transactions execute; financial inserts/locks/constraints remain rollout checks.
- Local report URL HTTP 200; git diff checks pass. Prior unrelated staged work preserved.

## Database / deployment gate

Initial source-stage evidence: migration 028 was pending (29 local, 28 applied). Follow-up authorization applied only 028 via guarded runner. Current status: 29 applied, zero pending, no checksum drift. Four empty payment/history tables, source/payment and actor FKs, retry/date indexes and five grants per both owner roles verified. No seed, backfill or payment write executed. Existing source detail reads remain compatible before rollout; pending tracking is explicitly unavailable and reports return typed 503 rather than misleading zero totals.

Exact target/preflight completed; scoped schema/permission metadata snapshot saved locally. This does not claim a full financial-data backup. New schema/grants verified; actual concurrent payment transactions remain before full feature acceptance. Deploy schema/API before clients; refresh owner sessions/access grants. Never infer legacy payments; users explicitly confirm historical payments after duplicate classification review. Rollback hides permissions/feature availability and retains payment/audit history.

## Runtime acceptance remaining

Authenticated owner/delegated report-only/source-reader/source-writer/denied accounts; historical confirmation; material purchase targeting; filter return; source payment/void/replacement and uncertain delivery; actual concurrent overpayment prevention; archived accessible project reads; responsive browser keyboard/accessibility; Android/iOS device navigation, small screens and Hindi/Gujarati readability. Production-volume query plans remain operational verification. No persisted offline feature is claimed.

Companion ui-ux-pro-max skill unavailable; existing UI components/theme patterns followed. No commit, push or deployment performed.

## Follow-up authenticated API evidence

`verify-paid-spending-runtime.ts` passes against the already-running local API: existing active Owner fixture, short-lived JWT following repository convention, summary/category/month/card reconciliation, grouped cards, invalid/one-sided dates and page limits, signed-out denial and foreign-organization denial. No login/refresh or financial mutations and no token/financial amount output. `verify-paid-spending-schema.ts` supports read-only preflight and installed-schema verification. Existing source-stage automated checks remain valid. Browser automation CLI was unavailable; no authenticated browser visual acceptance claimed. Remote application deployment was not performed.

## 2026-10-05 performance implementation

Summary uses one scoped payment-date/month aggregation and exact arithmetic for headline/category totals. Category lists select only relevant payment branches while preserving lifetime totals, grouping before pagination and snapshot reads. Material detail histories and project access grants/approval eligibility are batched without business/permission changes. Mobile period summary reuse cancels stale reads; Web scoped 15-second freshness uses financial write invalidation and scope/logout cleanup. Migration 029 adds only Materials/Expenses operational sort indexes and is applied. See [performance verification](../../../tasks/performance-implementation-plan.md); browser/device/load acceptance remains separate.

## Follow-up browser acceptance (2026-10-05)

Installed a temporary agent-browser runner without changing project dependencies. Restarted stopped local API/Web services (API notification delivery disabled; Web uses verified Webpack). Browser owner session prepared with short-lived local JWT and private temporary state; no login/refresh/financial submissions. Verified paid wage cards in All time, wage batch detail selection and Back to Total Expenses filter restoration, category-only summary reuse, explicit refresh (one summary request), scoped financial-event invalidation (one summary request, simulated event only), custom-date validation, unknown-project denial and no browser runtime errors. Desktop and 390x844 Web layouts have no horizontal overflow; narrow screenshot visually inspected. This is responsive Web evidence, not Expo/device acceptance.

Six concurrent authenticated GETs passed total/month/card reconciliation, unique grouped cards and category isolation; optimized Kharchi outstanding sorting and PAID/PARTIALLY_DEDUCTED/DEDUCTED filters passed. A diagnostic run showed roughly 435–493 ms per read; no production-volume or financial write-concurrency claim. New reproducible GET-only browser read script and private auth-fixture helper passed scoped lint; API typecheck passed. ADB is available but lists no connected devices; physical Android/iOS and Hindi/Gujarati device acceptance remain pending. Delegated financial write/void/replacement and production load/deployment acceptance remain separate. Browser closed and temporary token/context files removed; private screenshot retained outside repository.

This supersedes earlier browser-CLI-unavailable evidence for this local owner/read-only subset. Overall module acceptance remains partial: no connected physical device, delegated persona write/void/replacement acceptance, actual concurrent financial command acceptance or remote deployment/production-load acceptance.

## 2026-10-05 Site Expense payment API follow-up

Expense details read version, recognized amount and ledger in one snapshot; existing mutation transaction locks remain in use. API payment amount/calendar-date/reason validation and Web error-status/408 handling verified with 340 API tests, isolated HTTP coverage and client static checks. Vercel production API inspected: main commit 49b3f5e lacks ledger response fields; local API supports them. Application rollout remains required. No database mutations or deployment performed.
