## 2026-10-09 - Expo web login CORS follow-up

Resolved reported stale localhost:3000 allow-origin response for Expo web login by giving local Expo web a separate 127.0.0.1 API address. Current API correctly permits localhost:8081; native/remote/production URL behavior preserved. Configuration tests, Mobile typecheck and served web bundle checks pass. Real Edge preflight/POST reaches login DTO validation without CORS failure; no credentials or session mutation. Actual user login after bundle reload remains acceptance.

## 2026-10-09 - Mobile login Hornbook attribution

Owner follow-up: simplified Mobile attribution to Powered by + logo and added the same linked SVG attribution to Web login. Company text remains in accessible labels only. Web/Mobile typechecks, scoped Web lint and local login/asset HTTP checks passed; auth flow unchanged.

Implemented owner's mobile-login-only Powered by Hornbook Technology Pvt Ltd footer, original bundled SVG and external website link with localized accessibility/error labels. Reused theme and react-native-svg without dependency/config changes; source uses the footer only in LoginScreen. Mobile typecheck/locales and served Android bundle verification passed. No Web/API/auth-flow changes. Physical-device rendering and browser opening remain acceptance checks.

## 2026-10-09 - Total Expenses Materials tab

Mobile runtime follow-up: corrected LAN Expo's development API upstream using ignored `.env.development.local`, preserving production configuration. Verified actual Android bundle embeds local API and LAN manifest maps to the computer address; authenticated Materials/project report GET checks pass via LAN. App bundle reload required; no device-interaction acceptance, DB mutation or remote deployment.

Local runtime follow-up: corrected ignored Web API upstream from deployed Web to localhost:4000 and reloaded Next configuration. Authenticated GET-only verification through localhost:3000 passed for the screenshot project and reconciled material quantities/costs; existing paid totals remain intact. Extended the runtime script with optional project targeting and overview checks. No remote deploy/data mutation; browser/device rendering remains separate.

Implemented API/shared/Web/Mobile all-time material overview under existing report access, including unpaid requests, quantity milestones and separate estimated/committed/paid/due amounts. Kept paid totals/date semantics and existing source payments unchanged; explicit unknown costs and localized en/hi/gu UI. Shared/API builds, API/Web/Mobile typechecks, scoped lint, 111 API tests, six client regressions, locales and diff checks passed. Actual MySQL SELECT-only inline fixtures verified 50/30/20 example, child aggregation/void/tenant isolation, missing costs and pagination. No schema/data mutations or deployment; new-endpoint authenticated browser and physical-device acceptance remain separate. Contract, plan and status synchronized.

## 2026-10-08 - Kharchi export recorder names

Fixed the shared server-generated Kharchi PDF/CSV table using the existing `recordedByName` supplied by its scoped repository query for Recorded By, instead of the internal recorder UUID. Missing/blank names use `Name unavailable`; actor IDs remain available in API audit records. Existing report columns, amounts, filtering, authorization and layout are preserved for both Web and Mobile downloads. No schema, data writes or deployment.

Verification: API typecheck and 28 scoped Kharchi/repository/PDF service/controller tests passed. Regression cases cover actual recorder names in CSV and null/undefined/blank-name report fallbacks without UUID leakage. Scoped ESLint has no errors and retains five existing fixture warnings. Real PDF rendering tests passed with synthetic reports; authenticated Kharchi download/device verification was not performed. Download an updated report to see the corrected column; already downloaded files remain unchanged.

## 2026-10-08 - Web/Mobile refresh request lifecycle

Implemented the authorized project-wide refresh behavior with existing buttons, icons and native list controls. Shared per-control refresh locks coalesce repeated synchronous taps and release after success/failure. Web RefreshButton and native RefreshButton/RefreshIconButton retain layouts and mark busy controls disabled; native pull refresh controls use the same guard without showing an extra spinner during initial loading. Existing query/screen loading flags also prevent refresh while another read is running. Refresh callbacks return their actual promises. Grouped reads (Sales/site-visit option catalog, Kharchi, Materials, Expenses, Gallery, Workers, dashboard, notifications and totals) wait for every request to settle; native parallel reads preserve their existing error handlers while awaiting failed siblings. Scoped Progress refresh no longer invalidates unrelated modules. Access refresh and stale-record review controls are covered; navigation-only actions and financial write/retry semantics are preserved.

Verification: shared build, Web/Mobile typechecks, scoped Web UI/features/hooks ESLint, 172 client/shared regression tests and diff check passed. Four new shared tests cover duplicate taps, success/error release, unsubscribe and failed parallel reads. Real headless Edge exercised the production button in an API-free development fixture: five rapid clicks produced one request, busy/disabled persisted through both reads, failure stayed disabled until the slower sibling finished, and retry succeeded in starting a new logical refresh. Updated the existing PDF fixture dependency map for the previously added native Kharchi search helper. Full Web lint retains one pre-existing no-assign-module-variable error in financial-events.test.mjs; unrelated source was not changed to address it. Authenticated network/data and physical-device acceptance were not performed. No database/API/deployment changes or generated dump files. Existing design primitives and React review applied; ui-ux-pro-max companion unavailable.

## 2026-10-08 - Stable Site Visits salesperson filter options

Fixed Web Site Visits building salesperson choices from the currently filtered results. A separate unfiltered Site Visits read within the same existing access scope now supplies the distinct named option catalog, so selecting a salesperson/status/date/search does not remove other options when reopening the drawer. Cached catalog labels remain during list refetches; initial loading and unavailable selected values use readable labels instead of exposing UUIDs. Loading/error feedback is visible, and Refresh retries the directory as well as the results. Existing layouts, applied values, permissions and API behavior remain unchanged.

Verification: Web typecheck/scoped Sales lint and Sales regression tests passed, including an actual Visits component render with mocked scoped reads that checks options after combined filters and verifies own-scope users do not load/expose the team directory. Live authenticated browser verification remains pending; no data changes/deployment. Existing design primitives retained; ui-ux-pro-max unavailable.

## 2026-10-08 - Debounced Web/Mobile search and full API results

Audited all existing production search fields. Added shared 300 ms trailing search scheduling and platform hooks/primitives: input remains immediate, whitespace is trimmed, clear/Enter apply immediately, pending timers cancel on reset/disable/unmount, Web IME composition waits until completion, and parent acknowledgements retain newer typed text. Web collection toolbars and standalone member/worker/Sales/form selectors use SearchInput; native SearchField covers lists and collection pickers. Existing Attendance debounce is retained without stacking a second delay. Expenses/Materials apply the debounced search and reset page together; Clear all also discards pending text. Layouts and permissions preserved. Existing ui-ux-pro-max companion unavailable; repository primitives used, React checklist applied.

Fixed full-results gaps: native Workers and Kharchi worker picker read every returned page instead of only the first 100 and send search text to the existing Workers API. Native Workers requests and picker reads ignore stale responses; roster cache is scoped and retained only within the same access context. Worker API search also includes trade, preserving existing mobile search behavior alongside name/code/mobile. Added validated search to Sales follow-ups/site visits and matching Web/Mobile adapters/query keys; parameterized predicates match customer/mobile and visit salesperson without widening existing scope. Complete unpaginated member/team/choice datasets continue local filtering; phone/email matches are included where available. No new global search workflow or database schema/write/deployment.

Verification: shared build and Web/Mobile/API typechecks passed; 84 client/shared tests and 76 scoped API tests passed. Real headless Edge checks against the development collection fixture passed immediate typing, trailing apply, page reset, clear, IME completion and absence of runtime exceptions. Scoped Web lint and Sales API lint passed. Workers repository retains baseline 44 lint errors/12 warnings and its existing spec retains one unsafe-assignment finding, outside the new search code. Device and authenticated cross-module API/data acceptance are not claimed. No generated export/dump files were added to source control.

## 2026-10-08 - Local project Kharchi route 404 recovered

The source route existed, but the running Next development server returned framework 404 for project Kharchi and Wages while top-level routes worked. Restarted only the identified local Web dev process, retaining source and configuration. The exact reported project Kharchi URL now returns HTTP 200 with the Kharchi route component; project Wages also returns 200. No Kharchi workflow/data changes or deployment. This verifies route recovery, not authenticated financial operations.

## 2026-10-08 - Sales cross-client parity implementation

Implemented the approved client-first Sales checklist across Leads/Activities, Follow-ups, Site Visits, Inventory/interests/holds/CSV and Bookings. Mobile now exposes missing server filters, later lead pages, supported fields, existing authorized workflow actions and linked-record information; Web adds validated Call and follow-up customer search. Both retain established layouts. Organization-timezone schedules, active/read-only gates, scoped refresh, stale-record review, duplicate-submit/discard guards and immutable booking retries were aligned. English labels and en/hi/gu resources updated. Existing Kharchi work preserved.

Verification: 44 focused/existing Sales tests pass (35 Web + 9 Mobile/cross-client), final Mobile typecheck, Web production build/typecheck, scoped Web Sales ESLint, Android Expo export, 19-namespace locale validation and diff check passed. No Mobile ESLint configuration exists. Authenticated same-fixture role/workflow, narrow-browser and physical-device/native-sharing/Indic acceptance remain pending; static success does not establish 100% runtime parity. Existing API access/concurrency/assignee/follow-up gaps are explicitly API-blocked in [Sales parity checklist](sales-cross-client-parity.md). No API/database/production-write/deployment changes in this task. ui-ux-pro-max was unavailable; existing design-system components used.

## 2026-10-08 - Web Kharchi information matches Mobile

Audited Mobile English locale/list/detail/forms against Web and the approved Kharchi contract. Web now displays PAID as Deduction pending, PARTIALLY_DEDUCTED as Partly deducted and DEDUCTED as Fully deducted on list/detail badges and filter options. One typed Web mapping also preserves Cash, UPI, Bank transfer and Other across list/detail/filter/form. Aligned balance, adjustment, payment/history and record-action wording; adjustment history explicitly identifies Increase/Decrease; removed stale CSV filter copy for the current PDF export. Server amounts/status enums, permissions, retry safeguards and financial calculations remain authoritative. Existing additional Web ledger/context information is retained.

Verification: Web typecheck, scoped Kharchi ESLint, five existing rules tests, direct equality comparison with Mobile English status/payment-method resources and diff check passed. React checklist reviewed; ui-ux-pro-max companion unavailable, existing design components used. No API/Mobile/database changes or deployment. Authenticated browser/cross-client and device acceptance remain pending.

## 2026-10-07 - Branded transactional email UI

Applied the supplied cream/dark-brown/orange reference to the owner invitation, member invitation, password reset and password changed scenarios through one shared API HTML layout. Reused the approved horizontal logo from the public Web origin, table-based layout, serif header with italic orange accent, detail rows, olive callout, rounded CTA buttons and brand footer. Subjects, plain-text bodies, dynamic role/account instructions, activation/reset destinations and sending/authentication behavior remain unchanged. No DB or client workflow changes.

Verified: four focused API suites / 21 tests, API typecheck, scoped email ESLint and diff check passed. Browser screenshot reviewed at 390px; logo loaded and page width stayed 390px. Four sample-only HTML previews are in docs/design/email-previews. Real SMTP/inbox rendering (including Outlook) and deployment were not performed. Shared layout uses an absolute PUBLIC_WEB_APP_URL brand image with the existing production Web URL as fallback. The ui-ux-pro-max companion skill was unavailable; supplied references and approved repository artwork guided the presentation.

## 2026-10-06 - Mobile Total Expenses controls and loader

Aligned source filters and period/refresh buttons into even two-column rows, enabled constrained label wrapping, added visible list loading for initial/refresh/category/page requests, Refresh busy feedback and animation failure fallback. Mobile typecheck, 19-namespace en/hi/gu validation, two existing summary-request tests and diff checks passed. Physical-device visual/animation acceptance remains pending; no API/DB/deployment change.

## 2026-10-05 - Cross-client Site Expenses audit and remaining parity fixes

Audit classifications: EXISTING approved create/draft/edit/submit/approve/reject/cancel/adjust, immutable payment/void endpoints, ledger snapshots, safe expense retries and timeline; NEEDS_CHANGE payment conflict review, Mobile workflow retry/permissions, recorder/sort filters and scope cleanup; DEFERRED offline writes/receipts and physical-device acceptance. Dependencies remain Project Access, Audit, Calendar, source payments and Total Expenses; no new cross-module writes or schema changes.

API: inactive-project detail exposes no write actions; create/edit/signed adjustment DTOs enforce DECIMAL(14,2) bounds. Web/Mobile: shared payment failure classification distinguishes conflicts requiring fresh-ledger review, denied access, uncertain retries and correctable rejection. Both payment forms show explicit refresh/review for stale versions; Web offers refresh when ledger fields are missing. Mobile workflow settings now preserve original payload/key, guard duplicate taps/dismissal, respect effective configuration permission, and reset by scope. Mobile adds Web-equivalent project-member recorder filtering and four sort fields/ascending-descending order, with localized search, filter chips, reset, member-read permission and retry states. Mobile detail ignores obsolete reads, resets on project/expense changes and preserves mounted forms during same-scope refresh so uncertain retry commands survive.

Verification: shared build, API build/typecheck, Web production build with Webpack, Web/Mobile typechecks, scoped API/Web lint, 46 API suites / 354 tests (99 focused payment/expense tests), 11 Web expense adapter/rule tests, two Mobile retry tests, 19-namespace en/hi/gu validation and diff checks passed. Authenticated browser first confirmed the unavailable-ledger state against the configured remote proxy, then used a temporary in-browser XMLHttpRequest override to read the updated local API without changing environment files: Record Payment enabled and opened, six payment methods present, zero amount rejected before submission, cancellation worked, no runtime errors and no horizontal overflow at 390x844. Screenshot inspected; browser closed and private auth fixture removed. This is Web evidence, not Expo/device acceptance. No financial mutations or database rollout performed.

Root operational blocker remains old production API: both deployed origins omit payment ledger fields while localhost returns them. Local Web configuration also proxies to the old remote origin. User was asked asynchronously whether to publish verified API/Web, including the pending paid-spending dependency; no reply/production authorization received yet. Production publishing and Mobile rollout/device acceptance remain pending; environment values were preserved.

## 2026-10-05 - API Site Expense payment safeguards and client parity

User authorized API and necessary companion changes. Existing SourcePaymentsModule registration, scoped record/void endpoints and expense ledger integration retained. Expense detail now reads record/version/cost, events, adjustments and payment ledger within one read-only repeatable-read transaction; mutation callers reuse their existing locked connection. Source payment service rejects non-positive, malformed, excessive-precision and over-width decimal amounts with PAYMENT_AMOUNT_INVALID before repository writes. Expense create/update and date filters reject impossible dates and timestamp inputs; cancel/reject reasons require at least two trimmed characters to match client forms.

Web payment handling now reads ApiError.statusCode correctly, retains the original command on HTTP 408/transport/server failure, releases definite 4xx failures, guards duplicate submissions, validates bounded decimal input, resets payment form defaults and separates confirmed-write refresh errors from uncertain delivery. Mobile safeguards from the prior entry remain intact.

Verification: 45 API suites / 340 tests, including 12 isolated HTTP route/permission/validation/error/void tests; API typecheck/build, scoped API/Web lint, Web/Mobile typechecks, eight Web expense rules tests and diff checks passed. Authenticated GET-only smoke verified local ledgers and totals/month/card reconciliation and scope denial. No production financial writes, schema changes, migrations, seeds or application deployment were performed.

Connected Vercel inspection confirms the live API still serves main commit 49b3f5ea4e6d7497b1aa6350a5a36a40f0a9497f, before paid-spending support. Both deployed API origins return no payment ledger fields; local returns all required fields. The existing paid-spending API release must be deployed to enable the live Record Payment button. Re-deploying that older commit will not include the uncommitted fixes. Production rollout and Android/iOS acceptance remain pending.

## 2026-10-05 - Mobile Site Expenses payment investigation and form parity

Authenticated GET-only checks confirmed both deployed API origins return approved expense details without paymentStatus, payments or remainingAmount; the local API returns all ledger fields. The disabled Record Payment button therefore requires rollout of the existing paid-spending API release. No API deployment or financial/database mutation was performed.

Mobile payment forms now explain unavailable/inactive/denied/settled states, offer refresh for unavailable tracking, reset payment date/method/reference on opening, constrain required payment dates and payment input size, guard duplicate taps, and retain the original command on HTTP 408. Expense create/edit, submit/approve/reject/cancel and adjustment forms now freeze original payload/version/idempotency key across uncertain retries, require explicit reload/review after conflicts, preserve inputs on reload, enforce effective project permissions, guard dismissal while saving/retrying, and confirm discarding unsaved changes. Forms are keyed by project/expense; recovery copy is present in en/hi/gu. Existing field/category/workflow rules and server authority are preserved. Companion ui-ux-pro-max unavailable; existing operational components/theme used.

Verification: Mobile typecheck, 19-namespace en/hi/gu locale validation, two focused retry/concurrency/failure-classification tests and diff whitespace checks passed. React checklist reviewed. Live deployment, authenticated payment writes and physical Android/iOS acceptance remain pending; source changes do not enable the older deployed API.

## 2026-10-05 - Follow-up authenticated browser and concurrent read verification

Installed a temporary agent-browser runner without changing project dependencies. Restarted stopped local API/Web services (API notification delivery disabled; Web uses verified Webpack). Browser owner session prepared with short-lived local JWT and private temporary state; no login/refresh/financial submissions. Verified paid wage cards in All time, wage batch detail selection and Back to Total Expenses filter restoration, category-only summary reuse, explicit refresh (one summary request), scoped financial-event invalidation (one summary request, simulated event only), custom-date validation, unknown-project denial and no browser runtime errors. Desktop and 390x844 Web layouts have no horizontal overflow; narrow screenshot visually inspected. This is responsive Web evidence, not Expo/device acceptance.

Six concurrent authenticated GETs passed total/month/card reconciliation, unique grouped cards and category isolation; optimized Kharchi outstanding sorting and PAID/PARTIALLY_DEDUCTED/DEDUCTED filters passed. A diagnostic run showed roughly 435–493 ms per read; no production-volume or financial write-concurrency claim. New reproducible GET-only browser read script and private auth-fixture helper passed scoped lint; API typecheck passed. ADB is available but lists no connected devices; physical Android/iOS and Hindi/Gujarati device acceptance remain pending. Delegated financial write/void/replacement and production load/deployment acceptance remain separate. Browser closed and temporary token/context files removed; private screenshot retained outside repository.

## 2026-10-05 - Approved performance improvements and index rollout

Implemented batched project grants/Material approval eligibility and purchase payment histories, one-query dated paid-summary aggregation, source-specific list branches, scoped Dashboard/Kharchi child aggregates, and one-context payment permission validation. Mobile reuses period summaries across category/page changes, cancels obsolete reads and keeps same-scope data visible during refresh. Web uses user/organization/project-scoped report caching (15-second freshness), financial mutation invalidation and logout/scope cleanup.

Migration 029 applied through guarded runner to `md-in-30.webhostbox.net:3306/vishwlt9_nirmansite`: only the two approved Materials/Expenses sort indexes. Exact columns and sort-aligned EXPLAIN scans verified; 30 migrations applied, none pending. No seeds, backfills, payment writes, index drops, pool/server changes or persistent authorization caches. Original audit evidence retained; post-change evidence saved separately. Live row counts changed externally (wage payments 32 to 33), so measurements are diagnostic rather than controlled benchmarks.

Verification: 44 API suites / 314 tests; 27 Web tests; two Mobile summary-request tests; API build, Web production build with Webpack (default Turbopack hit existing Google font resolution error), Mobile typecheck and 19 locale namespaces across en/hi/gu; Android export with one worker (initial parallel export exhausted machine memory); financial SQL fixtures, authenticated owner report smoke, scoped lint and diff checks. Browser/device, large-volume/concurrency and remote application deployment acceptance remain unrun. See [implementation/evidence](performance-implementation-plan.md).

## 2026-10-05 - Read-only database/index and refresh performance audit

Audited all 63 live tables / 410 indexes, query patterns across all 24 API repositories, auth/project-access behavior and Web/Mobile refresh/cache paths. Saved complete per-table index inventory and sanitized EXPLAIN/metadata/measurements. Warm SQL round trips approximately 21–23 ms; three local authenticated samples per populated-owner context show medians 246–514 ms across six read endpoints. These are small diagnostic samples, not production-load or device-render acceptance; selected paid-report month is empty. Main proposals: two sort-aligned Materials/Expenses indexes, access/history query batching, scoped report/child aggregate rewrites, separated Mobile summary/list refresh, and scoped client freshness/invalidation. Optional Sales/Notifications indexes and overlap removals require workload proof. No index/schema/cache/pool/server/business-data mutation or migration under this audit. Existing staged work preserved. See [audit and prioritized plan](performance-index-audit.md), [all-table inventory](performance-index-inventory.md) and [sanitized evidence](performance-index-audit-evidence.json). Read-only audit script passed scoped lint/typecheck; diff check passed.

## 2026-10-05 - Total Expenses schema rollout and authenticated API smoke

User follow-up authorized the pending rollout. Migration 028 applied through the guarded repository runner to `md-in-30.webhostbox.net:3306/vishwlt9_nirmansite`; only that migration was pending, no checksum drift. Preflight verified source key types/collations and saved a scoped schema/permission metadata snapshot to a private local temporary directory (not a full financial-data backup). Post-rollout state: 29 applied, zero pending; four empty payment/history tables, scoped source/payment and actor FKs, retry/date indexes, and all five grants for both owner role templates verified. No seed, backfill or financial payments written.

Actual-schema report SELECTs and authenticated local owner GET smoke passed: total/category/month/card reconciliation, grouping/category selection, invalid dates/page limits, signed-out denial and foreign organization denial. Short-lived JWT verification follows the existing repository runtime-script pattern; no login/refresh mutation, token logging or financial amounts printed. Local API already serves the report. Remote application deployment, delegated personas, actual payment/concurrency writes, authenticated browser and physical-device/Indic acceptance remain unrun. Browser CLI unavailable in this environment. See total-expenses module STATUS and implementation plan.

## 2026-10-05 - Total Expenses across API, Web and Mobile

Implemented the owner-approved paid-only project report for Wages, Materials and Site Expenses, excluding Kharchi. Added exact dated partial payments, immutable audited void/replacement tracking, source locks/version/idempotency safeguards, expense paid-floor checks, dedicated owner/default and delegated permissions, snapshot aggregation and grouped pagination. Web and Mobile have four stats, monthly spending bars, period/category filters, source details with return restoration, payment/history/correction controls, explicit project routing and legacy-review guidance; Mobile en/hi/gu parity is complete. Existing unrelated staged Materials UUID cleanup and its task note were preserved.

Verification: all 44 API suites / 311 tests; 19 focused Web source/return tests; shared build; API/Web builds and API/Web/Mobile typechecks; scoped lint; 19 locale namespaces across three languages; Android Expo/Hermes export; SELECT-only synthetic payment/report fixtures against configured MySQL; diff checks. Local report route responded HTTP 200. These do not establish authenticated/browser/device acceptance or real concurrent database command acceptance.

Migration `028_paid_spending.sql` is prepared, pending and NOT executed; no seed/backfill or historical payments were written. Database status was read with bootstrap disabled. Activation requires separately authorized exact-target schema rollout, then API deployment before clients and refreshed owner grants/session. Existing costs need explicit historical payment confirmation. Actual FK/locking/concurrency, authenticated owner/delegated/denied workflows, responsive/keyboard/browser and physical-device/Indic visual acceptance remain pending. Missing ui-ux-pro-max companion skill was handled using repository UI patterns. See [implementation and rollout plan](total-expenses-implementation-plan.md) and [module status](../modules/construction/total-expenses/STATUS.md).

## 2026-10-01 - Readable Web lead history

Fixed exposed UUIDs on Web lead details: the lead API now includes convertedByName, and activity reads enrich booking references/dates, unit numbers and assignment names through project/organization-scoped related records. Web renders labeled activity fields and readable stages instead of raw JSON; unavailable names use explicit fallback text. No database mutations or migrations. API/Web type-checks, 19 Sales API tests, three activity-formatting tests, scoped Web lint and diff checks passed. Authenticated browser acceptance remains pending. ui-ux-pro-max companion skill was unavailable; existing Web UI patterns were followed.

## 2026-10-01 - API-generated PDF exports, no report persistence

Supersedes the earlier frontend PDF rendering slice. Attendance, Wages, Kharchi, Materials, Expenses and Progress now expose permission-protected /export/pdf endpoints (Wages beneath batches/:batchId). CSV and PDF share structured authorized report datasets; the API renders PDF bytes in memory using bundled Latin/Hindi/Gujarati fonts and sends a private/no-store attachment. No PDF database rows, server temp files, S3 writes or migrations. Headings retain project names and batch dates/status. Explicit PDF row/concurrency limits prevent silent truncation or unbounded rendering. Web only downloads API blobs; Mobile downloads exact bytes into a temporary device-cache file for Android folder save/native sharing. Preparation popups, elapsed time, cancellation, timeouts and duplicate-tap guards remain; client pdfmake/Expo Print renderers and Web font assets are removed. API/Web builds, all three type-checks, locale parity, new PDF code/scoped Web lint, 273 API tests and 14 client/adapter tests passed. Broad API lint still reports seven pre-existing errors and one warning in Attendance/Wages services, confirmed against HEAD. Live authenticated/browser/device/fluent-language/large-volume acceptance remains pending. Deploy API with packaged fonts before deployed clients. See docs/tasks/pdf-export-implementation-plan.md.

## 2026-10-01 - Readable wage PDF identity

Wage PDF headings on Web and Mobile now show the project name and selected batch period start/end instead of internal UUIDs. Download filenames use the batch dates. Web reuses the already authorized project-access name and verifies that the loaded batch matches the selected batch.

## 2026-10-01 - Web and Mobile PDF exports

Implemented frontend PDF exports for Attendance, Wages, Kharchi, Materials, Expenses and Progress using the existing permission-protected CSV APIs. Web export buttons download paginated PDFs with bundled Latin/Hindi/Gujarati fonts and a compact elapsed-time progress dialog. Mobile now creates PDF files, offers Android folder saving and native save/share, and includes Attendance's previously missing full-period export action. The en/hi/gu preparation sheet supports fetch cancellation, duplicate-tap guards, a fetch deadline and temporary-file cleanup. Shared CSV utilities retain every API field, quoted multiline text and both wage tables; numbered rows and worker identifiers repeat across wide-table groups. API, financial calculations and database are unchanged. Shared build, Web/Mobile type-checks, Web production build, scoped lint, locale parity, five PDF/CSV/native utility tests and two existing Progress adapter tests passed. Authenticated browser, fluent Indic typography and physical Android/iOS acceptance remain pending; new native packages require an app rebuild. See docs/tasks/pdf-export-implementation-plan.md.

## 2026-10-01 - Web session refresh race safeguards

Investigated reported AUTH_SESSION_REQUIRED after local login on project-access/me. Local env targets localhost:4000 via /api/v1; the supplied failing URL is the deployed Web origin, so the exact reported request remains unconfirmed. Unified startup and interceptor refreshes under one in-flight request; stale refreshes cannot overwrite a newer login token or clear its session. Provider revision guards prevent startup/profile responses from overwriting a newer login. Four transport tests cover concurrent refresh, rejected sessions, login-overlap token preservation and protected project-access retry with the new bearer token. Web type-check and scoped lint passed. Authenticated local/live acceptance remains pending; backend auth enforcement is unchanged.

## 2026-10-01 - Web loader WASM fetch fix

The shared Web Lottie loader now sets a same-origin WASM URL before mounting. Web dev/build scripts copy the exact installed renderer binary into an ignored public asset, avoiding external CDN downloads and version mismatch. Animation JSON is bundled to avoid fetch-abort console errors when short-lived loading screens unmount. Web type-check, scoped lint, WASM compilation and local HTTP 200/application-wasm verification passed. Browser signed-out Members-to-Login flow requests only the local WASM and reports no WASM/download/abort errors after the fix. Authenticated workflows remain unverified.

## 2026-10-01 - Invitation Web activation destination

Changed `PUBLIC_ACTIVATION_WEB_URL` in local `.env` and `.env.example` to `https://nirman-mobileapp-web.vercel.app`; updated the existing activation-origin test and identity-access contract. Organization owner/member invitation emails generated by either client use this API setting and retain `/activate?token=...`. Deployed API environment rollout/restart remains pending; previously sent emails retain their original URLs.

## 2026-10-01 - Web square icon and favicon update

User requested `apps/web/public/brand/app-icon.png` for all square Web identity placements, superseding the previous sidebar image. Sidebar, design-preview mark, browser favicon/shortcut/Apple touch icon and legacy square theme aliases now use that original file. Horizontal Web logos are unchanged. Browser visual acceptance remains pending.

## 2026-10-01 - Unified Mobile branding; Web reverted

Mobile uses the user-approved `app-icon.png` for launcher/iOS variants/Android adaptive foreground/splash/favicon/loading identity and `horizontal-logo.png` for auth and activation. Legacy Mobile theme keys alias these files. Web branding changes were reverted at the user's request; prior Web artwork and placements are restored. Mobile type-check and resolved Expo configuration passed. Device visual acceptance remains unrun; native launcher/splash require a rebuilt installed app. See docs/design/brand-assets.md.

## 2026-09-28 - Site Expenses owner approval

Authorized API fix: eligible Builder Organization Owners and Independent Contractor Owners with effective expenses:approve can explicitly approve their own pending expenses. Existing Mobile and Web server-driven Approve actions are reused; Web workflow guidance is corrected. Non-owner self-approval and all self-rejection remain forbidden. Transactional recorder checks, versions, idempotency and audit history remain intact; owner approval adds an audit basis. No schema, migration, seed, commit, push or deployment. All 258 API tests (21 Expenses tests), 11 Web Expenses tests, API/Mobile/Web type-checks, Web lint, scoped API lint, API build, Web production build and git diff --check passed. Web build passed after a network-enabled Google Fonts retry. Authenticated browser/device/cross-client acceptance remains pending. See docs/modules/construction/expenses/STATUS.md.

## 2026-09-28 - Mobile Wages overlap validation on Generate

Generate now fetches current project wage batches before requesting a preview. An inclusive overlap with a non-cancelled batch shows the existing en/hi/gu error beneath Generate without a preview or Confirm button. Cancelled batches and non-overlapping periods retain preview/confirmation. Failed batch reads stop calculation; duplicate taps are guarded and date/project changes discard stale responses. A concurrent server duplicate rejection also clears the preview. API, Web, database and calculations are unchanged. Mobile type-check, locale validation (18 namespaces in 3 languages), five focused tests and git diff --check pass; physical-device acceptance remains pending.

## 2026-09-28 - Official Mobile and Web logo pack

Integrated the supplied named logo pack through both app theme exports. Mobile auth and Web auth/sidebar/browser identity use official variants. Existing Expo icon/splash paths resolve to the updated assets. Both app type-checks, asset existence, resolved Expo configuration and diff checks passed. Browser/device visual acceptance remains unrun; native launcher/splash updates require a new build. See docs/design/brand-assets.md for placement rules. Supplied artwork and unrelated edits were preserved.

## 2026-09-23 - Web UX acceptance follow-up

Local API-isolated browser verification covered phase 2-8 synthetic previews at four viewport widths, shared drawer interactions, synthetic read-only/restricted states and public/auth-guard navigation. No horizontal page overflow or browser error overlay was observed. The Administration fixture now visibly follows applied filters; Worker Detail passes the API-supported workerId to Kharchi. Real 200% zoom, reduced motion, authenticated persona/data and cross-client tests remain open. See web-ux-phase9-acceptance.md.

## 2026-09-23 - Web UX Phase 9 route audit and consolidation

All production Web route groups and four persona journeys were audited against current source, behavior tests and a successful production-build route list. The unused responsive filter duplicate was removed, while the design-system reference FilterBar remains. Full Web type-check, lint, build, 119 behavior tests and diff check passed. Browser/role, responsive, keyboard, zoom, reduced-motion and cross-client acceptance remain unrun because no local server or authorized role sessions were available. Phase 9 is statically verified, not accepted. See web-ux-phase9-acceptance.md.

# NirmanSite Progress Ledger

## 2026-09-23 - Web UX Phase 8 administration and remaining forms

Migrated Organizations, Members, Users/Roles, Notifications and subscription-plan collections to supported shared filters; Users now uses server search, role and pagination across application identities. Details and forms show identity/context and visible labels, preserve validated return state, and separate access-changing work. Settings General and Email saves no longer submit each other’s unsaved values. Existing invitation, CUSTOM access, capacity, password and notification target safeguards remain API-owned. Full Web type-check, scoped lint and focused behavior tests passed. The Phase 8 synthetic preview remains unverified in a browser because no local server was available and prior server-start approval was rejected; authenticated role and cross-client acceptance remain open. No production account/billing writes. Next: Phase 9 on explicit instruction.

## 2026-09-23 - Web UX Phase 7 Sales workflows

Leads, Follow-ups, Site Visits, Inventory and Bookings now share the filter drawer and retain list state through validated same-project return links. Lead/unit/booking details present customer, owner, status, next actions and related records before secondary administration; Sales tabs and domain status tones are explicit. API-owned stage, availability, hold, conversion, permission and uncertain-retry rules remain unchanged. Full Web type-check, scoped lint and 19 focused tests passed. The synthetic preview is unverified in a browser because no local server was available and prior server-start approval was rejected; authenticated role and cross-client acceptance remain open. No production Sales writes. Next: Phase 8 on explicit instruction.

## 2026-09-23 - Web UX Phase 6 Progress, Gallery and Calendar

Progress history and Gallery collections now use the shared filter drawer; stage status, immutable update history, photo captions and review metadata are clearer. Permission-gated navigation connects Progress, project Gallery, Work Calendar and Attendance, with same-project return context. Calendar editing and Gallery upload/retry workflows remain unchanged. Full Web type-check, scoped lint and 21 focused tests passed. Phase 6 browser checks remain open because approval to start the local dev server was rejected; authenticated and cross-client acceptance also remain open. Next: Phase 7 on explicit instruction.

## 2026-09-23 - Web UX Phase 5 Materials and Expenses

Web lists now use the shared search/filter drawer and retain applied query state on record return. Materials distinguishes requested, ordered, delivered and outstanding quantities; Expenses keeps original, signed adjustments and recognized cost separate. Detail actions remain API-derived and existing two-mode Materials approval/delegation work was preserved. Focused Web type/lint and return-path tests passed. Synthetic browser fixture checked drawer behavior and 360px/1366px reflow; real project route redirected to login. Authenticated role, history and mutation acceptance remain open. Next: Phase 6 on explicit instruction.

## 2026-09-23 - Web UX Phase 4 Wages and Kharchi

Organized Wages into calculation period, readiness/preview, confirmation and saved batch/payment stages; historical multi-rate snapshots and net/paid/remaining amounts are explicit. Kharchi now uses the shared collection drawer, accurately scopes its summary and links permitted Worker, Attendance, Wage and advance history. Existing financial API rules, immutable records and uncertain-write recovery remain authoritative. Fourteen focused tests, full Web TypeScript and focused ESLint passed. Synthetic browser checks passed at 360px/1366px and for filter draft/apply behavior; the live Wages route redirects to login. Authenticated acceptance is recorded in the [redesign plan](web-ux-redesign-plan.md). No financial payment was executed. No API/Mobile/database/dependency/Git integration work; unrelated dirty changes preserved. Stop before Phase 5.

## 2026-09-22 - Web UX Phase 3 Dashboard and project navigation

Replaced operational sample metrics/projects/approvals with an authorized, project-scoped dashboard: real pending-record previews and detail/full-queue links, verified workflow/progress/gallery summaries, explicit unavailable Attendance/finance values, and safe project context/query isolation. Dashboard and Project Detail now reuse shared effective-permission navigation; sidebar retains explicit project context. Nineteen focused tests, full Web TypeScript and focused ESLint passed. Development browser fixture checks passed at 360px/1366px, including restricted and archived states; actual /dashboard redirects to login. Detailed evidence is recorded in the [redesign plan](web-ux-redesign-plan.md). Dashboard API gaps are documented rather than repaired in Web. Authenticated role/data/switching/detail acceptance remains open. No API/Mobile/database/dependency or Git integration changes; unrelated dirty work and earlier phase entries preserved. Stop before Phase 4.

## 2026-09-22 - Web UX Phase 2 Workers, Projects and Attendance

Implemented the bounded Web reference journey: Workers shared search/filter drawer, semantic desktop rows/narrow cards, safe URL/return state and explicit page-local assignment filtering; read-first Worker Detail with reused Project Team assignment/rate workflows, related work and separate history/management; Project Detail navigation separated from lifecycle actions; Attendance filter drawer and permitted assignment/calendar recovery navigation. Automatic presence, absence writes, effective-date rates and existing mutation guards remain unchanged. Twelve focused behavioral tests, full Web TypeScript and focused ESLint passed; final verification is recorded in the [redesign plan](web-ux-redesign-plan.md). Browser fixture checks passed at desktop/tablet/narrow/reflow widths with keyboard/draft/focus/scroll and read-only navigation checks. Actual Workers redirects to login: authenticated roles/data/mutations/detail journeys, native zoom and runtime reduced-motion remain unaccepted. No API/Mobile/database/dependency or Git integration work performed; unrelated dirty changes preserved. Stop before Phase 3.

## 2026-09-22 - Web UX Phase 1B collection and filter foundation

Implemented the production Drawer accessibility/focus/scroll safeguards and reusable search/filter toolbar with independent drafts, Apply and draft-only Reset. Projects is the sole migrated collection, with API pagination, scoped URL state, safe detail/back restoration, user-scoped list cache and reliable-total guards. Shared controls/table typography retain Manrope and the palette. Seven focused tests passed; full Web type-check and focused lint passed in the final verification pass. Project Detail retains its pre-existing setForm-in-effect lint failure. Browser fixture checks passed for keyboard/drafts/scroll and 1366/768/683/360px layouts; 683px is a zoom reflow approximation. Real Projects redirects to login: authenticated queries/roles/returns, native 200% zoom and runtime reduced-motion preference checks remain pending. See [redesign evidence](web-ux-redesign-plan.md). Phase 2 was not started. API/Mobile/database/dependencies and unrelated work were preserved.

## 2026-09-22 - Web UX Phase 1A validation pass

Re-audited the existing three-file foundation implementation and its production consumers. No additional application-code corrections were justified by source evidence; existing uncommitted work was preserved. Focused ESLint, source-only TypeScript (zero diagnostics) and scoped whitespace checks passed. The initial full Web check reconfirmed malformed generated Next dev types; a final full Web type-check passed after Next dev regenerated them, without manual generated-file edits. The approved local dev server started, but browser navigation/inspection timed out during Workers compilation; responsive, long-content and 200% zoom acceptance remain open. Detailed evidence is in the [redesign plan](web-ux-redesign-plan.md#phase-1a-validation-pass--2026-09-22). Phase 1B was not started and must recheck those visual gates before adoption.

## 2026-09-22 - Web UX redesign, Phase 1A

Recorded the [design contract and phased rollout](web-ux-redesign-plan.md). Started shared typography, wrapping headers and organization-selector containment. Palette, font family and business behavior preserved; existing Materials work preserved. Verification is tracked in the plan; authenticated visual acceptance remains pending.

## 2026-09-22 - Materials two-mode approval and delegation

Implemented Direct/Final approval settings across shared/API/Mobile/Web, Owner-managed project delegation, both organization-owner self-request exceptions, final decision/notification eligibility parity and readable approval responsibility. Migration 027 is prepared to convert pending verification with immutable history and notification backfill; it has NOT been executed. The full API suite passed (37 suites / 246 tests), API build and Mobile type-check passed, Web source-only type-check/scoped lint and six Materials rule tests passed, and all 18 locale namespaces validated. Normal Web type-check is blocked by malformed generated .next/dev types. Final focused verification and rollout evidence are tracked in [Materials approval plan](materials-two-mode-approval-plan.md). Authenticated DB/API/browser/device acceptance remains pending; no deployment, commit or push.

## 2026-09-21 - W8 Web Notifications

Implemented recipient-scoped inbox, unread filter/count/badge, pagination, mark one/all read and fresh authorized target navigation. Scoped cache clears on sign-out/context changes. Eight focused tests and scoped lint passed. Existing whole-Web type/lint/build blockers, Gallery exact-entry metadata API requirement and pending authenticated/browser/cross-client acceptance are recorded in [W8 Notifications parity](web-w8-notifications-parity.md). Web/docs only; concurrent work preserved; no backend/Mobile/database changes, commit, push or deployment.

## 2026-09-21 - W7d Web Bookings

Implemented project-scoped booking list/search/status/date filters, detail/linkage/history, lead conversion with or without a unit, exact uncertain retries, and cancellation with explicit restoration. Effective permissions, ownership, isolated caches and existing Sales components are preserved. Thirteen focused tests and scoped lint passed; whole-Web Workers/Attendance and other lint blockers remain. Authenticated/browser/cross-client acceptance and Sales API CUSTOM/TEAM read limitations are tracked in [W7d Bookings parity](web-w7d-bookings-parity.md). Web/docs only; no backend/Mobile/database changes, commit, push or deployment.


## 2026-09-18 - W6 Web Gallery

Implemented project-scoped Gallery, private grouped photos, filters/summary/pagination, metadata details, browser upload/capture, durable scoped retry queue and compatibility review. See [W6 Gallery parity](web-w6-gallery-parity.md) for verification, pending acceptance and the standalone entry-link API requirement. Unrelated work preserved; no backend/Mobile/database edits or commit/push/deployment.


## 2026-09-18 - W4 Web Site Expenses

Implemented project-scoped Web settings, filtered list/summary/pagination/CSV, draft/create/edit, all server-authorized transitions, signed immutable adjustments and full history. Effective project grants, server totals/actions, expected versions, isolated caches and exact uncertain retries are preserved. Eleven focused tests and scoped lint passed. Whole-Web type-check/lint/build have existing unrelated blockers; authenticated browser, responsive/accessibility and Web/Mobile acceptance remain pending. See [W4 Expenses parity and review](web-w4-expenses-parity.md). No backend change required; no Mobile/API/database changes, commit, push or deployment.

## 2026-09-17 � W2 Web Kharchi

Implemented project-scoped Kharchi list/summary/filter/pagination/CSV, eligible Worker selection, record-paid advances, immutable corrections, and complete deduction/reversal history using existing APIs. Effective permissions, isolated context caches and stable uncertain retries are included. Five focused tests passed; whole-Web checks expose unrelated existing errors, and authenticated/cross-client acceptance remains pending. See [W2 Kharchi parity and review](web-w2-kharchi-parity.md). No Mobile/backend/database changes, commit, push or deployment.


## 2026-09-17 - W1 Web Work Calendar and Attendance parity

Extended existing Web Calendar/Attendance with effective CUSTOM Project permission guards, authorized selectors/navigation, Organization working-timezone defaults, selectable Calendar day details and explicit week presets, server daily totals and supported filters, Attendance-only Worker history via the existing panel, context-preserving links, safer form/error handling, and Calendar-to-Attendance cache invalidation. Existing calendar/absence CRUD, summaries, pagination, history and CSV export remain in place. Only Web and implementation documentation changed.

Current API reasons/notes remain optional; locked-period correction is reserved and unsupported. Mobile's daily future-date cap and fixed/device-local timezone assumptions differ from API behavior; Web keeps the API authoritative. See [W1 Calendar and Attendance parity](web-w1-calendar-attendance-parity.md) for endpoint traceability, limitations, and pending acceptance.

**Verification was not run as explicitly requested:** no tests, type-checks, lint, builds, browser/runtime checks, diff checks, or other verification commands. Source inspection only; implementation is not marked verified or accepted. No commit, push, or deployment. Other W1 slices retain their own status.


## 2026-09-17 - W1 Web Workers functional parity

Extended existing Web Workers with primary-project history/create/correct/end and effective-date transfer, actual-start onboarding, explicit linked-period ending consent, effective project permissions, preserved form input and mutation feedback, project roster pagination, and attendance links. Existing worker CRUD, duplicate warnings, filters, rate changes and destructive confirmations are preserved. Only Web and implementation documentation changed. Detailed rate history is blocked because Workers exposes no history read endpoint; the smallest proposed backend addition is recorded in [W1 Workers parity](web-w1-workers-parity.md) and requires explicit authorization.

**Verification was not run as explicitly requested:** no tests, type-checks, lint, builds, browser/runtime checks, or other verification commands. Implementation is not marked verified or accepted; W1 as a whole remains incomplete.


## 2026-09-17 — W1 Web Wages functional parity

Extended the existing Wages implementation with unpaid cancellation/read-only history, server rate breakdowns, payment history, paginated Kharchi allocation/reversal inspection, effective CUSTOM project access, isolated workspace cache/state, and stable uncertain payment retries. Existing preview/confirmation/adjustments/export and unrelated dirty work are preserved. Only Web and documentation changed. See [W1 Wages checklist and verification](web-w1-wages-parity.md); authenticated browser/device/cross-client acceptance remains pending. This does not mark all of W1 or W0 complete.


## 2026-09-15 — Database migrations 024-026

- Applied `024_password_recovery.sql`, `025_worker_assignment_rate_history.sql`, and `026_wage_batch_cancellation.sql` to the explicitly approved configured remote development database.
- Read-only preflights found no negative Worker assignment or Wage rates and no existing Wage cancellation grants. The 43 assignments with current rates were eligible for baseline history; one assignment without a rate was preserved without inventing a value.
- Post-migration status is 27 local / 27 applied / zero pending / zero drafts / current. Read-only verification confirmed `password_reset_requests`, `worker_assignment_rate_periods`, `kharchi_deduction_allocation_reversals`, `wage_items.rate_breakdown`, `wage_batches.cancellation_reason`, 43 rate-history baselines, and one `wages:cancel` grant for each approved owner role.
- No seed or business workflow mutation was run. Authenticated password recovery, Worker rate change, Wage cancellation/concurrency, browser, and physical-device acceptance remain pending.

## 2026-09-14 — Backdated Worker Onboarding And Primary Allocation

- Mobile Worker creation now collects the actual selected-Project start date instead of hardcoding today.
- API create-and-assign atomically creates the assignment and its initial primary-Project period from the same date, so the builder does not repeat the primary-selection step.
- Mobile primary-Project correction now permits prior dates covered by an active assignment, retains API overlap/window validation, and warns that earlier Attendance totals can change.
- No migration, seed, database execution, Attendance UI, Web, Wages, Kharchi, dependency, or lockfile change belongs to this slice.
- Verification passed: 18-namespace en/hi/gu locale parity, shared build, API type-check, focused Workers service/repository suites (46 tests), Mobile type-check, and `git diff --check`. Authenticated API/database and physical-device acceptance were not run.

## 2026-09-14 — Unpaid Wage Batch Cancellation

- Added owner-only `wages:cancel` and `POST .../wages/batches/:batchId/cancel` with mandatory reason and stable paid-batch conflict handling.
- Cancellation retains the immutable Wage snapshot, blocks after any payment, releases Kharchi through append-only allocation reversals, records same-transaction audit events, and unlocks the period for regeneration.
- Added Mobile cancellation confirmation/read-only states and reversed Kharchi history in English, Hindi, and Gujarati.
- Shared/API/Mobile type-checks, API production build, 16 focused tests, locale parity, and whitespace checks pass. Focused lint remains blocked by pre-existing Wages `any` debt. Migration `026` was applied and verified read-only on 2026-09-15; authenticated concurrency and physical-device acceptance remain pending.

## 2026-09-14 — Worker assignment rate security and history

- Replaced the stale `workers:assign-project`-only rate guard with attendance-aware RBAC: started/history-bearing assignments require `workers:update-rate`, while unstarted assignments retain the normal assignment permission. Effective dates must be within the assignment and no later than today.
- Added migration `025_worker_assignment_rate_history.sql` and its read-only preflight. New assignments create a baseline rate event; changes upsert the effective-date event transactionally. Derived Attendance/Wages now resolves the applicable per-date rate, calculates multi-rate periods correctly, and snapshots the breakdown on confirmed Wage items.
- Added Mobile Worker-detail and Web Project-Team rate forms using existing sheets/dialogs, inline validation, loading states, and effective Project permissions. Mobile en/hi/gu keys and API-error mappings are included. Migration `025` was applied and verified read-only on 2026-09-15; authenticated role/runtime, browser, and physical-device acceptance remain pending.

## 2026-09-11 — Password recovery and account security

- Added role-neutral `POST /auth/forgot-password` and `POST /auth/reset-password` flows with generic request responses, 15-minute hashed single-use tokens, normalized-email/IP throttling, transactional completion, refresh-session revocation, and existing-SMTP web/mobile links. Authenticated password change now requires the current password, revokes refresh sessions, clears the Web refresh cookie, and sends a security notice when SMTP is configured. Generated passwords and OTP/2FA are not part of this slice.
- Mobile exposes Forgot password on Login, handles reset deep links, and provides Account & Security to every customer role from Menu with en/hi/gu parity. Web has matching forgot/reset pages and current/new/confirm password controls in Profile.
- Migration `024_password_recovery.sql` was applied and verified read-only on 2026-09-15. Shared/API/Mobile/Web type-checks, API/Web production builds, 6 focused API tests, locale parity, focused new API/Web lint, and whitespace checks passed. Real SMTP delivery, authenticated browser/device flows, and physical-device accessibility/large-text/landscape/dark-mode acceptance remain pending.

## 2026-09-11 — Mobile project creation access and Web form parity

- Reused the existing API/form behind a shared CreateProjectSheet on Home and Project. Added an explicit Add project entry available before the first project, clarified the Home shortcut, and included Web's address line 2. Required fields retain asterisks while optional fields use plain labels without redundant Optional suffixes. Existing organization permissions, subscription capacity, Draft/Active rules, and date validation remain authoritative.
- Refreshes authorized session access and selects/opens the created project; a successful POST followed by failed refresh has a dedicated recovery state that does not repeat creation. Added synchronous duplicate-tap protection and blocked dismissal during save.
- English/Hindi/Gujarati key and placeholder parity passed. `node apps/mobile/scripts/verify-project-creation.cjs` passed isolated Builder/Contractor, denied permission, rapid-submit, dismissal, create failure, refresh retry, and authorized Draft selection checks. `pnpm --filter @nirman-app/mobile type-check` and whitespace checks passed; authenticated workflows and physical-device keyboard, large-text, and accessibility acceptance unrun.

## 2026-09-10 — Mobile brand assets

- Wired supplied horizontal-logo.png into Login and invitation activation with responsive contain sizing; primary-logo.png into splash; app-icon-light.png into default/Android/favicon; app-icon-dark.png into iOS dark appearance. Kept original PNGs, backgrounds, existing flows, and unrelated work intact.
- Mobile type-check, resolved Expo configuration, and whitespace checks passed. Native launcher/splash and physical-device visual acceptance require a new native build and remain unverified.
- Android export stalled after Metro startup and was interrupted; bundle validation remains pending.

## 2026-09-10 — Login background restored

- Restored the original `assets/brand/background.png` behind the redesigned Login form at full opacity with cover sizing. Retained the form, small gradient accent, keyboard handling, and disabled/loading submission behavior.

## 2026-09-10 — Login redesign and submission loading

- Redesigned Mobile Login with the existing logo, subtle theme gradient, centered width-constrained form, light fields, restrained shadows, saffron invitation action, and existing language selector. Added safe-area/keyboard-aware scrolling and explicit input accessibility/autofill properties. Existing en/hi/gu copy and authentication routing/error mapping are preserved.
- Added an opt-in shared Button loading state with spinner, disabled/busy semantics, and visual dimming. Login uses it and a synchronous ref guard to prevent duplicate requests; fields and invitation navigation are disabled during submission and restored after failure.
- Mobile type-check, locale parity, and whitespace checks passed. Isolated actual-component browser fixtures passed 320/375/425px across en/hi/gu, disabled/busy semantics, duplicate submission prevention, failed-request recovery with password retained, and successful retry routing. See `artifacts/login-redesign/README.md`.
- Physical-device keyboard/autofill and screen-reader acceptance and live authenticated sign-in remain unverified. No API, credential, dependency, or generated asset changes.

## 2026-09-10 — Shared Mobile action links

- Extended the existing deep saffron `color.text.link` to shared TextLink default/accent variants, text-only Button ghost labels/icons (including invitation activation, calendar Today and dismiss actions), and the shared compact Switch project action.
- Preserved muted/destructive link variants, filled buttons, icon-only controls, selectors, and status/category/type colors. TextLink currently has no screen consumers; ghost buttons and ProjectContextCard provide the active screen coverage.
- Mobile type-check and diff whitespace checks passed. Styling only; no copy, layout, navigation, API or data changes. Physical-device visual review remains pending.

## 2026-09-10 — Subtle dashboard saffron accents

- Applied approved concepts 1/2/3: deep saffron links and action icons, warm icon wells, soft selected dashboard tabs, white dashboard surfaces, and a restrained olive/ivory/warm gradient on Project Progress with a dynamic olive-to-saffron progress fill.
- Added semantic `color.text.link`, `gradient.summarySurface`, and `gradient.progressAccent` using existing theme colors. Inner-screen status/category/type mappings, dashboard status indicators, primary buttons, and the approved bottom navigation are preserved. No generated concept images were imported.
- Shared build, Mobile type-check, locale parity, and whitespace checks passed. Actual component fixtures passed nine width/language combinations (320/375/425px, en/hi/gu), with no page errors, horizontal overflow, or sub-50px/off-screen interactive targets; Actions/Attention tab selection passed. See `docs/tasks/artifacts/dashboard-accents/README.md`.
- Physical-device, authenticated workflow, native font scaling, and screen-reader acceptance remain pending.

## 2026-09-10 — Bottom navigation selected color

- Changed the shared navigation selected background from olive to the existing palette's `supportingPalette.constructionOrange` (`#D88032`), with `textPalette.inverse` (white) icons and labels as requested.
- Shared build, Mobile type-check, and diff whitespace checks passed. Physical-device visual verification remains pending.

## 1. Purpose

This ledger records the path followed to build NirmanSite.

AI agents must update this file after every approved contract, implementation slice, verification pass, or blocker.

## 2. Current Gate

Current gate:

```text
Role-specific Dashboard contract/API, migration `023`, guarded role sync, aggregate Expo integration, and premium layered Mobile presentation are verified. Supervisor/Sales role matrix and physical-device acceptance remain pending.
```

Next recommended task:

```text
Run authenticated Supervisor and Sales dashboard responses, then complete narrow/large-phone, accessibility, reduced-motion, landscape, and en/hi/gu device review.
```

## 3. Completed Path

| Order | Stage | Status | Evidence | Verification |
| --- | --- | --- | --- | --- |
| 1 | MVP requirements baseline | completed | `MVP_REQUIREMENTS.md` | Documented baseline |
| 2 | MVP phase plan | completed | `docs/phases/MVP_PHASES.md` | Planning review |
| 3 | Phase 0 alignment | completed | `docs/tasks/current-task.md`, updated templates/docs | Documentation review |
| 4 | Identity Access contract | completed | `docs/modules/foundation/identity-access/CONTRACTS.md` | Contract review |
| 5 | Project Setup And Assignment contract | completed | `docs/modules/foundation/project-access/CONTRACTS.md` | Contract review |
| 6 | Phase 1 technical plan | completed | `docs/tasks/phase-1-identity-project-technical-plan.md` | Planning review |
| 7 | Slice 1 shared constants | completed | `packages/shared/src/constants` | `pnpm --filter @nirman-app/shared type-check` |
| 8 | Slice 2 SQL draft | completed | `apps/api/src/database/sql/migrations/001_phase1_identity_project_setup_draft.sql` | Draft review |
| 9 | Slice 2A SQL compatibility | completed | revised SQL draft and `docs/tasks/current-task.md` | Non-mutating review |
| 10 | Slice 3 API foundation | completed | `apps/api/src/modules/organizations`, `apps/api/src/modules/projects`, `apps/api/src/modules/project-access` | API type-check and build passed |
| 11 | Slice 4 safe DB verification and seed update | completed | `apps/api/scripts/seed.ts`, safe DB work reported by prior AI chat | Safe DB/API details should be summarized in foundation review |
| 12 | Slice 5 web admin integration | completed | `apps/web/src/features/organizations`, `apps/web/src/features/projects`, web routes/navigation | Web/API type-check and API build passed |
| 13 | Slice 6 mobile session and project switcher | completed | `apps/mobile/src/providers/session-provider.tsx`, `apps/mobile/src/features/projects` | Mobile/shared/API type-check passed |
| 14 | mysql2 migration runner tooling | completed | `apps/api/src/database/migrations`, `apps/api/scripts/migrate.ts`, `apps/api/scripts/migration-status.ts`, `docs/tasks/mysql2-migration-runner-implementation-plan.md` | API type-check/build passed; safety probes passed |
| 15 | Phase 1 remote schema migration | completed | `apps/api/src/database/sql/migrations/000_inherited_foundation_compatibility_tables.sql`, `apps/api/src/database/sql/migrations/001_phase1_identity_project_setup.sql`, `schema_migrations` on `vishwlt9_nirmansite` | `pnpm db:migrate:status`, `pnpm db:migrate`, final status current; seed not run |
| 16 | Remote foundation seed | completed | `apps/api/scripts/seed.ts`, `role`, `permission`, `systemsetting`, `user` on `vishwlt9_nirmansite` | `pnpm db:seed`; non-secret DB summary confirmed 3 roles, 37 role-permission links, 15 settings, 1 active admin |
| 17 | Package identity rename | completed | `package.json`, workspace package manifests, shared constants, imports, docs, `pnpm-lock.yaml` | `pnpm install`, `@nirman-app/*` shared/API/web/mobile checks, `git diff --check` passed |
| 18 | Repository state and Workers contract drafting | completed | `docs/execution/CURRENT_REPOSITORY_STATE.md`, `docs/modules/MODULE_CONTRACT_STANDARD.md`, `docs/modules/construction/workers/CONTRACT.md`, `docs/modules/construction/workers/DECISIONS.md`, `docs/modules/construction/workers/IMPLEMENTATION_PLAN.md` | Type-check/build/migration status recorded; lint/test gaps documented; no Workers implementation started |
| 19 | Role and permission model gate | completed | `docs/modules/foundation/role-permission-model/PLAN.md`, `docs/architecture/auth-rbac.md`, updated Workers role sections | Platform-vs-customer decision approved on 2026-08-10 |
| 20 | RBAC preparation Slices A-C | completed | aligned requirements/docs, `packages/shared/src/constants/permissions.ts`, `apps/api/scripts/seed.ts` | Shared type-check/build and API type-check passed; no seed, migration, or DB mutation |
| 21 | RBAC runtime visibility and role-user seed | completed | API platform-only session boundary, web/mobile permission visibility, guarded mysql2 seed, 11 role logins | Remote seed committed on explicit approval; API/web/mobile checks passed; live login/session verification passed |
| 22 | Platform-provisioned primary Owner onboarding | implementation_complete_migration_applied | shared invitation contracts, migration 003, transactional API invitation flow, Super Admin web form/link handoff, web/mobile activation screens | Migration 003 explicitly applied; status reports 4/4 current; automated end-to-end invitation smoke remains unrecorded |
| 23 | RBAC Slice D/E/F source correction | implementation_complete_seed_pending | platform-prefixed global administration, membership-authoritative web session, profile validation, protected Owner fixes, web/mobile boundary corrections | Shared/API/web/mobile type-checks and API/web builds passed; focused lint/test retain documented baseline failures; no seed or database mutation in this slice |
| 24 | Platform Roles and Permissions restoration | implementation_complete | protected Platform Super Admin role-management compatibility, custom-role permission editor, requirement clarification | Shared/API/web type-checks and focused API/web lint passed; no seed, migration, or database mutation |
| 25 | Custom role lifecycle controls | implementation_complete | custom-role name/description editing, guarded deletion dialog, transactional permission cleanup | API/web type-checks and focused lint passed; no role record was changed during verification |
| 26 | Custom role list actions | implementation_complete | edit/delete icons moved to the Roles list Actions column; system roles remain action-free | Web type-check and focused lint passed; no database mutation |
| 27 | Profile action layout refinement | implementation_complete | balanced Profile cards, consistent section headers, bottom-aligned responsive Save Profile and Change Password actions | Web type-check, focused lint, diff check, and live route HTTP 200 passed |
| 28 | Primary Owner invitation email delivery | implementation_complete_runtime_pending | post-commit SMTP delivery, shared delivery status, HTML/text onboarding email, unchanged manual web/mobile link fallback | Shared/API/web checks and pure fallback/template runtime probes passed; focused Jest remains blocked by the pre-existing Jest runtime mismatch; no DB write or real email was performed |
| 29 | Platform Settings access restoration | completed | added the missing `platform-settings:read` and `platform-settings:update` live grants to the existing Platform Super Admin role | Read-only role-permission query confirmed both grants; API health and web Settings route returned HTTP 200; no seed or migration |
| 30 | Platform Settings save correction | implementation_complete_browser_confirmation_pending | removed the unbound service-method failure, allowed blank optional emails, added save feedback and SMTP field guidance | API/web type-checks, API build, focused lint, validator probe, diff check, and live HTTP checks passed; no setting row was changed during verification |
| 31 | Gmail SMTP delivery diagnosis | code_hardened_external_credential_pending | confirmed Gmail `535 5.7.8`, normalized App Password display spaces, improved configuration/failure guidance | SMTP endpoint was reachable but rejected both raw and normalized saved credentials; static checks and API health passed; no email or DB write |
| 32 | Expo Go invitation email button | implementation_complete_device_confirmation_pending | HTML `Open Mobile App` button plus optional local `EXPO_GO_PROJECT_URL` and installed-app scheme fallback | API/mobile checks, generated HTML/link probes, diff check, and API/web/Metro HTTP 200 passed; no invitation or email was created during verification |
| 33 | Owner activation login prefill and identity reuse | implementation_complete_runtime_pending | optional existing-account acceptance password, automatic second-membership activation, web/mobile Login redirect with invited email | Static and pure service checks passed; no invitation, membership, organization, user, seed, migration, or other DB write during verification |
| 34 | Workers vertical-slice reconciliation and completion | partial_owner_decision | shared/API/web/mobile corrections, API tests, `docs/modules/construction/workers/STATUS.md`, `REVIEW.md` | Shared/API/web/mobile gates and API unit/E2E pass; no DB mutation; deactivation lifecycle decision remains |
| 35 | Mobile customer-product refocus and implementation plan | implementation_complete_plan_review | approved internal Contractor membership decision, real-data permission-aware Expo shell, `mobile-customer-experience-implementation-plan.md` | Mobile type-check and non-mutating source checks passed; no DB operation; device/role matrix pending |
| 36 | Mobile customer foundation parity | implementation_complete_device_verification_pending | mobile Organization Members, subscriptions capacity, project create/edit, Draft Team access, member permissions, and Worker assignment lifecycle | Shared/API/mobile static checks and 57 API tests passed; Expo web export timed out without output; no database write; authenticated physical-device matrix pending |
| 37 | Mobile Localization Foundation contract | contract_approved | `docs/modules/foundation/localization/CONTRACTS.md`, `GLOSSARY.md`, and `docs/tasks/mobile-multilingual-implementation-plan.md` | Documentation/source/font coverage review; no dependency, asset, application, API, schema, seed, or database change |
| 38 | Mobile Localization common/auth/navigation pilot | implementation_complete_native_review_pending | Expo localization/i18next/AsyncStorage runtime, local Manrope/Noto fonts, typed locale resources, formatters, localized API error mapping, Login/activation/navigation/Menu selectors | Locale key/placeholder validator, mobile/shared type-checks, Expo config resolution, scoped literal review, Expo web export, and diff check passed; browser unavailable; physical device and fluent review pending |
| 39 | Mobile Localization Home/dashboard namespace | implementation_complete_native_review_pending | localized welcome/workspace copy, Project context switcher, access/status/scope/count labels, metric cards, empty state, and accessibility labels | Locale parity, mobile/shared type-checks, Expo web export with bundled Noto fonts, scoped literal review, and diff check passed; physical-device layout, screen-reader, and fluent review pending |
| 40 | Mobile Localization Projects namespace | implementation_complete_native_review_pending | localized Project Detail, Add/Edit Project form, validation/recovery copy, enum display mappings, shared modal/card typography, and responsive field/chip wrapping | Six-namespace locale parity, mobile/shared type-checks, Expo web export with eight Noto fonts, scoped literal review, and diff check passed; physical-device layout, screen-reader, and fluent review pending |
| 41 | Mobile Localization current customer surface completion | implementation_complete_native_review_pending | localized Members/invite/access/Project assignments, Team/Assign/permission editor, Workers/Add-Edit-Assign-End, shared sync/progress/form/card/header UI, errors/statuses, and accessibility copy | Nine-namespace locale parity, mobile/shared type-checks, full mobile literal audit, Expo web export with eight Noto fonts, and diff check passed; authenticated device, screen-reader, large-text, and fluent review pending |
| 42 | Organization-owner permanent Worker deletion | implementation_complete_seed_runtime_pending | organization-wide `workers:delete`, dependency-ordered API transaction, Web danger action/confirmation/success state, Workers contract and decision update | Shared/API/web type-checks, 18 API suites with 98 tests, API and isolated web production builds, focused web lint, and diff check passed; no seed, database deletion, or authenticated browser flow was run |
| 43 | Kharchi / Worker Advances API and runtime prerequisites | implementation_complete_runtime_acceptance_pending | direct-paid endpoints, immutable signed adjustments, idempotency fingerprints, transactional audit events, automatic oldest-first Wage allocations, migrations `012`/`013`, and 22 approved grants | Shared/API checks and focused tests passed; approved remote migrations/tables/grants verified; health `200` and unauthenticated route `401`; authenticated role/concurrency pending |
| 44 | Kharchi Mobile integration | implementation_complete_device_acceptance_pending | permission-aware navigation, summary/list/search/filter/export, record-paid flow, immutable detail/adjustment/Wage history, shared list-filter controls, and en/hi/gu | Locale parity, Mobile type-check, Android Expo export, and diff check passed; authenticated physical-device, accessibility, largest-text, timeout, and fluent-language review pending |
| 45 | Site Expenses API foundation | runtime_registered_authenticated_acceptance_pending | approved Direct/Approval contract, shared contracts, guarded roles, migration `018`, transactional API, immutable adjustments/audit, notifications, scoped idempotency, and concurrency guards | Shared/API checks plus 143 tests passed; approved target is 19/19 current, five tables and grants verified; current listener health `200` and unauthenticated Expenses route `401`; authenticated acceptance pending |
| 46 | Site Expenses Mobile integration | implementation_complete_device_acceptance_pending | permission-aware navigation, spend summary, list/search/filter/export, workflow settings, create/draft/edit, detail/actions, immutable adjustments/timeline, error mapping, and en/hi/gu | Locale parity, Mobile type-check, Expo web and Android production exports, and diff check passed; authenticated API/device, accessibility, largest-text, landscape, timeout, and fluent-language acceptance pending |
| 47 | Project Progress API and database | runtime_verified_write_acceptance_pending | contract/plan, shared nine-stage contracts, migration `019`, immutable/idempotent/concurrency-safe API, Audit integration, guarded role sync, summary/history/export/portfolio | Remote 20/20 current, table/grants verified, 27 suites/149 tests and API build passed; health and authenticated read summary `200`; authenticated business-data writes pending |
| 48 | Project Progress Mobile integration | implementation_complete_device_acceptance_pending | permission-aware route/Menu/Home data, overall/stage cards, stage-filtered history, export, update sheet, errors/success, and en/hi/gu | 17-namespace parity, Mobile type-check, Android Expo export, and diff check passed; physical-device/accessibility/large-text/landscape/fluent review pending |
| 49 | Notifications vertical slice | implementation_complete_device_acceptance_pending | formal contract, shared contracts/errors, migration `022`, recipient-safe list/read/summary/device APIs, transactional Expo push outbox with retry, nine customer role grants, localized Mobile inbox/badge/deep links | Remote 23/23 current; schema/grants verified; focused 5/5 and full 31-suite/164-test API passes; shared/API/Mobile checks, 18-namespace locale parity, Android Expo export, and diff check passed; authenticated real-device push/accessibility acceptance pending |
| 50 | Role-specific Dashboards vertical slice | implementation_complete_device_acceptance_pending | shared role/profile/action contract, aggregated permission-aware API, migration `023`, nine operational role grants, single-request Expo integration, layered blueprint background, role command hero/actions, en/hi/gu | Remote 24/24 current; grants/four indexes verified; focused 2/2 API test, API build/type-check, authenticated Owner six-section smoke, Mobile type-check and locale parity passed; Supervisor/Sales and physical-device acceptance pending |
| 51 | Password recovery and account security | implementation_complete_migration_runtime_pending | generic role-neutral email recovery, hashed expiring single-use tokens, DB-backed throttling, session revocation, SMTP web/mobile links, Mobile en/hi/gu recovery/account UI, and Web recovery/secure Profile change | Focused 2-suite/6-test API pass plus Shared/API/Mobile/Web type-checks; migration 024, real SMTP, authenticated runtime, browser/device/accessibility acceptance pending |

## 4. Verification Commands Recorded

Commands run during this development path include:

```bash
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/mobile type-check
```

Runtime smoke tests depend on a confirmed local or throwaway database and should be summarized in the foundation review.

The mysql2 migration runner adds the intended command flow:

```bash
pnpm db:migrate:status
pnpm db:migrate
pnpm db:seed
```

Do not run these database commands against a remote, shared, staging, or production target without explicit approval. `pnpm db:migrate` also requires confirmation environment variables before mutation.

On 2026-07-31, the user explicitly approved running the Phase 1 migration on `vishwlt9_nirmansite`. The remote database now has these tables:

```text
organizations
organization_members
permission
projects
project_members
refreshtoken
role
schema_migrations
systemsetting
user
```

Applied migration records:

```text
000_inherited_foundation_compatibility_tables.sql
001_phase1_identity_project_setup.sql
```

`pnpm db:seed` was later run after explicit user request. It seeded:

```text
Roles: Member, Super Admin, User Manager
Role-permission links: 37 total
System settings: 15
Admin users: 1 active System Administrator
```

The seed source is `apps/api/scripts/seed.ts`. Password values must be read from the local environment/source by the repository owner and should not be pasted into chat.

On 2026-08-05, repository assessment and first mature business-module contract drafting were completed. `pnpm db:migrate:status` reported the remote development database current with 2 local migrations, 2 applied migrations, 0 pending migrations, and 0 draft migrations. No migration, seed, schema, API, web, or mobile implementation changes were made for Workers.

On 2026-08-10, the product owner approved the platform-vs-customer RBAC decision and preparation Slices A-C. Shared permissions were separated into platform, organization, project, legacy user-management compatibility, and Workers groups. The mysql2 seed now prepares distinct platform and organization role templates and synchronizes system-template defaults so Platform Super Admin has no normal Workers permissions. The seed was not run and no database or migration command was executed. Shared type-check/build and API type-check passed after rebuilding shared before the API check.

Later on 2026-08-10, the product owner explicitly authorized the seed and the web/mobile visibility correction. The configured remote development target `vishwlt9_nirmansite` was current with 3 applied migrations before the run. The guarded mysql2 seed committed successfully, created or rotated 11 role-user logins, prepared two demo organizations/projects for customer-role testing, and left Platform Super Admin with 0 Workers permissions. Live API verification confirmed Platform Super Admin resolves no customer workspace while all 11 generated accounts can log in with their expected role. No migration was executed.

Later on 2026-08-10, migration 003 was explicitly approved and applied to `vishwlt9_nirmansite`; read-only status then reported 4 local, 4 applied, 0 pending, and 0 draft. A subsequent read-only RBAC audit found that operating profiles were metadata-only, global Roles/Settings were not tenant-safe customer surfaces, web used inherited global-role permissions, invalid organization/profile combinations existed, Owner counting treated every system role as an Owner, and assigned-project users could create unassigned workers. Slice D/E/F source corrections now address those foundation boundaries. The updated seed was not run and no database row was changed during that correction slice.

Static verification for the Slice D/E/F correction passed shared/API/web/mobile type-checks plus API and web production builds. Focused API semantic lint passed when the repository's existing Prettier mismatch was disabled. Focused web lint remained blocked only by the known synchronous form-hydration effects, and the focused onboarding test remained blocked before test execution by the existing Jest 30/ts-jest `clearMocksOnScope` incompatibility. `git diff --check` passed within the tracked portion of this mostly untracked checkout.

The Platform Super Admin Roles & Permissions surface was subsequently restored as a protected platform capability. The web navigation now consistently exposes the surface to Platform Super Admin, custom roles can be created and assigned permission sets, system role templates remain read-only, and the API enforces the platform-role boundary even for pre-seed compatibility sessions. Customer `roles:*` permissions do not authorize the global platform role manager.

Custom-role lifecycle management now includes editing role details and deleting unassigned custom roles from the same permission screen. The API continues to reject system-role changes and assigned-role deletion, while repository deletion removes dependent permission rows and the role in one mysql2 transaction.

## 5. Open Decisions

- Authentication beyond the approved email/password-first Owner activation: whether and when to add OTP.
- Mobile refresh strategy.
- Cross-organization Contractor project sharing remains deferred; the MVP internal `Contractor Member` model is resolved.
- Organization-scoped custom-role persistence and migration design.
- Permission override scope for member/project grants and denials.
- Active organisation/project persistence strategy.
- Support/admin impersonation scope.
- Session expiry and permission refresh interval.
- Outbound SMTP provider credentials and delivery monitoring remain environment/operations configuration; secure manual activation-link handoff remains the fallback.
- Target MySQL/MariaDB version and whether DB-level `CHECK` constraints should be reintroduced.
- Whether `fileasset` or a future `file_assets` table is active before adding logo/cover image foreign keys.
- Workers: when deactivating a worker with active assignments, choose block, atomic end-after-confirmation, or preserve active assignments while roster filtering follows worker status.
- Workers: which Expo-compatible offline database/sync library should be used.
- RBAC: decide whether support impersonation/access is included in MVP or deferred.
- RBAC: decide whether mobile blocks platform-only users after login or shows a no-field-workspace state.
- RBAC: review and explicitly run the updated platform-prefixed permission seed, then execute the runtime role matrix.

## 6. Next Task Template

For the next AI chat:

```text
Read MVP_REQUIREMENTS.md, docs/decisions/005-internal-contractor-membership.md, docs/tasks/mobile-customer-experience-implementation-plan.md, docs/modules/MODULE_INDEX.md, docs/tasks/PROGRESS_LEDGER.md, and docs/tasks/current-task.md.

Review and approve Mobile Slice 1: multi-organization switching. Implement it without starting later operational modules, then update the plan evidence and request approval for Slice 2 Members/Invitations.

Do not begin Attendance, Wages, Kharchi, Materials, Expenses, Progress, Gallery, Sales, Audit, Offline Sync, or another operational module during these foundation slices.
```

On 2026-08-10, primary Owner onboarding gained additive post-commit SMTP delivery. The email contains the organization and Owner access context, login email, expiry, and both existing activation links, but no password. Missing SMTP configuration returns `MANUAL`; SMTP failure returns `EMAIL_FAILED`; neither condition rolls back organization creation or removes the manual links. Shared/API/web static checks and pure runtime fallback/template probes passed. No migration, seed, organization creation, database write, or real outbound email was run.

Later on 2026-08-10, the user explicitly requested Platform Settings access. A read-only audit showed that the live `Platform Super Admin` role had no `platform-settings` grants even though the checked-in seed already defines them. Exactly two permission rows, `platform-settings:read` and `platform-settings:update`, were inserted into `vishwlt9_nirmansite`. No seed, migration, credential rotation, or organization data mutation was performed. A post-write query confirmed both grants.

The Settings save path was then corrected after its mutation callback was found to depend on an unbound `this`, preventing requests from being issued. Optional blank email fields now pass validation, the UI reports success or the API error, and SMTP examples are shown inline. Static checks and pure validation passed; no setting row was changed during verification.

Live email delivery was subsequently diagnosed against the configured Gmail SMTP endpoint. Gmail was reachable but rejected authentication with `535 5.7.8`; the saved password had the visual shape of a grouped Google App Password, but the same credential was also rejected after removing display spaces. NirmanSite now removes those spaces automatically, while the external account owner must generate a new App Password for the exact SMTP Username. No message was sent and no credential or setting row was changed during diagnosis.

The onboarding email's mobile target is now rendered as an `Open Mobile App` button. In the current local environment it uses Expo Go's `exp://192.168.1.33:8081/--/activate?token=...` route; without `EXPO_GO_PROJECT_URL`, the existing `nirmansite://` installed-app scheme remains active. Metro, API, and web were all reachable after the API restart, while a physical-device button tap remains the final confirmation.

Primary Owner activation now sends both successful client paths directly to Login with the invited email pre-filled. New or inactive identities must create a password; an existing active identity accepts the linked additional organization membership using the invitation token without re-entering or changing its password, then signs in with that existing password. Acceptance remains token-bound, expiring, single-use, and non-authenticating. No database write was performed while implementing or statically verifying this behavior.

On 2026-08-12, the product owner resolved the Contractor model: Builders invite hired individuals as internal `Contractor Member` memberships, while independently subscribed Contractors own isolated `CONTRACTOR` organizations. The Expo customer shell was then cleaned of demo routes, fake data, and dead navigation. Home and Project now use only live session/project data and permission-backed routes. The mobile implementation plan sequences organization switching, member invitations, project assignments, Workers completion, role-aware Home, and device/authorization verification. No database operation was performed.

The supporting web workspace now treats INR as fixed MVP configuration instead of an arbitrary onboarding input. Project list/create/detail use the authenticated active organization: single-active-membership users see organization context without a page filter, while users with multiple ACTIVE memberships in ACTIVE organizations switch once in the shared header. Organization create/update DTOs reject non-INR currency values. Web/API type-checks, the web production build, 11 focused organization tests, DTO validation probes, and `git diff --check` passed. No database, seed, or migration command was run.

## 2026-08-14: Project Team, Project Grants, And Subscription Capacity

The Project Team and subscription contracts were approved and implemented. Project assignments now support `ROLE_DEFAULT` compatibility or `CUSTOM` permission grants intersected with the Organization Role ceiling. Web has a dedicated Project Team route with Members/Workers tabs, Project-specific permission editors, responsibility/date/status editing, and shared ellipsis row actions. Member-to-many-Projects and Project-to-many-Members transaction boundaries both exist.

Builder Supervisor is now a distinct Builder-side oversight role. Contractor Member is an operational assigned-Project ceiling and can be narrowed by the Project permission matrix. Broad Organization invitation authority was not added to Contractor Member.

Subscription persistence and Platform administration now support configurable active-Project, active-Member, and storage capacity without hard-coded commercial plan values. Active Project and invitation-activation capacity checks lock the Organization subscription row transactionally. Workers remain unlimited, and storage enforcement remains deferred to Files And Media accounting.

Migration `004_project_permissions_subscriptions.sql` was applied to `vishwlt9_nirmansite`; read-only status reported 5 local, 5 applied, 0 pending, 0 draft, and current. The guarded mysql2 seed completed. Live verification confirmed the new tables, nine existing Project assignments preserved as `ROLE_DEFAULT`, the Builder Supervisor permission foundation, the operational Contractor Member ceiling, and zero seeded commercial plans.

Static/runtime verification: shared build, API/web/mobile type-checks, 50 API tests, web production build, `git diff --check`, live API/database health, and route registration passed. The in-app browser had no available backend, so authenticated visual verification did not run. Physical-device verification and disposable-data authorization matrices remain outstanding.

## 2026-08-17: Project Team Assignment UX And Date Enforcement

The Project Team Members flow now distinguishes searching the assigned roster from finding
an Organization Member to assign. The assignment modal has a searchable member picker,
available/already-assigned context, visible Start/End Date labels, clearer access-mode and
preset wording, human-readable permission actions, a selected-access summary, and a Draft
Project warning. Assignment configuration is progressively disclosed after selecting a
member.

Optional assignment start/end dates now participate in Project discovery and authorization;
an `ACTIVE` assignment outside its date window no longer grants access. Site Supervisor was
narrowed from the Contractor Member ceiling to Project/Team read plus Worker
read/create/update/Project-allocation. The guarded seed synchronized this role on the
configured remote development database, and a read-only query confirmed the intended nine
permissions.

Verification passed: API/web type-checks, 12 API suites with 54 tests, API and web production
builds, migration status current, `git diff --check`, and restarted API health with database
status `ok`. The in-app browser again reported no available browser backend, so an authenticated
visual click-through remains outstanding.

## 2026-08-17: Worker Row Assignment And Base Daily Rate

The Project Team Workers tab now lists active Organization workers rather than only the
current Project roster. Assigned rows show assignment state and retain edit/end operations
in the ellipsis menu; unassigned rows expose a visible `Assign` CTA. The Assign dialog asks
only for the start date. Assignment editing asks only for start/end dates. Search covers the
Organization worker list, and scheduled future assignments remain classified as Assigned in
this management view.

Migration `005_worker_base_daily_rate.sql` added the optional Worker-master
`base_daily_rate` and backfilled it from each Worker's latest available assignment rate.
Worker create/edit owns trade and base daily rate. New Project assignments copy that rate into
the existing assignment snapshot while storing no duplicate role label. Historical assignment
role/rate values remain intact for future Attendance/Wages compatibility.

Verification passed: shared build; API/web/mobile type-checks; 12 API suites with 57 tests;
API and web production builds; migration status current with 6 local and 6 applied migrations;
live read-only rate-backfill verification; restarted API/database health; and `git diff --check`.
The in-app browser reported no available backend, so authenticated visual verification did not
run.

## 2026-08-26: Sales CRM API Vertical Slice

The Sales API contract and source implementation now cover Project-scoped Leads, own/team/all
visibility, assignment history, timeline activities, follow-ups, site visits, unit inventory,
transactional unit blocking, and idempotent booking conversion/cancellation. Shared canonical
statuses, permission keys, stable errors, and Project-delegatable Sales permissions were added.

Migration `011_sales_crm.sql` defines the eight Sales tables, composite Organization/Project
foreign keys, one-active-block and one-confirmed-booking constraints, booking idempotency, and
default customer-role grants while excluding platform roles. Mobile/Web Sales clients,
notifications, background expiry jobs, commission calculation, and Audit integration remain
outside this API slice.

Verification recorded for the source slice: shared build, API type-check, focused Sales lint,
seven focused Sales service tests, all 19 API suites/105 tests, and API production build passed.
The source slice initially ran no database or runtime verification. On 2026-08-27, migrations
`010` and `011` and the updated guarded seed were explicitly approved and completed against
`md-in-30.webhostbox.net/vishwlt9_nirmansite`; see the runtime addendum below.

## 2026-08-27: Worker Permission And Sales Server Rollout

Read-only status first confirmed the configured remote target, 12 local/10 applied migrations,
and exactly `010` and `011` pending. A read-only preflight confirmed MySQL `5.7.23-23`, zero
Sales tables, both required Project indexes, and zero existing Sales grants for the checked
roles. After explicit approval, the guarded migration runner applied both files in order and
reported 12 applied, zero pending, zero drafts, and current state. The updated seed committed
with `SEED_ROLE_USERS=false`, so no demo-user generation or password-output flow ran.

Post-write verification confirmed all eight Sales tables, two stored generated columns, three
required unique workflow indexes, zero duplicate role permissions, 15 Sales grants each for
Organization Owner/Builder Admin/Independent Contractor Owner, nine for Sales User, and zero
for Site Supervisor/Platform Super Admin. Migration `010` left exactly one `workers:delete`
grant on each owner/admin role. All Sales tables contain zero rows. API health reports
app/database `ok`; the registered Sales Leads route returns `401` without authentication.
Authenticated Sales behavior, live block concurrency, browser, and device acceptance were not
run.

## 2026-08-31: Sales Unit Interest, Inventory Import, And Pricing

Sales inventory now supports non-exclusive interest from multiple Leads, approval-based
exclusive holds, manual Unit entry, and an all-or-nothing CSV import of 1-500 Units. The mobile
import flow validates locally, previews server conflicts, and confirms one transactional insert.
Pricing is explicit: `TOTAL` accepts Rupee/Lakh/Crore input normalized to rupees, while
`PER_SQFT` requires positive area and rate and derives the stored total server-side. Mobile
pricing and status categories use wrapped chips and existing NirmanSite operational primitives.

After separate exact-target approvals, migrations `014_sales_unit_interest_hold_workflow.sql`
and `015_sales_unit_pricing.sql` were applied to
`md-in-30.webhostbox.net/vishwlt9_nirmansite`. The guarded runner reports 16 local and 16
applied migrations with zero pending/draft files. Read-only verification confirmed
`price_basis VARCHAR(20) NOT NULL DEFAULT 'TOTAL'`, nullable `rate_per_sqft DECIMAL(15,2)`,
and one pre-existing Unit retained with the `TOTAL` default; migration `015` inserted no
business records.

Verification passed: shared build, API/mobile type-checks, focused Sales lint, en/hi/gu locale
parity, all 21 API suites/120 tests, Android Expo export, and `git diff --check`. Authenticated
role/workflow, live hold concurrency, and physical-device acceptance remain pending.

## 2026-09-01: Kharchi Runtime And Mobile Delivery Reconciliation

The Kharchi documentation was reconciled with the delivered API, approved remote rollout, and
Mobile source. The direct-paid meaning remains authoritative: `Date paid` is when money was
actually given or transferred, while the server timestamp records when the entry was added to
NirmanSite. There is no request, approval, later mark-paid, edit, cancel, or delete workflow;
corrections remain immutable adjustments.

Separately approved migrations `012_audit_foundation.sql` and `013_kharchi.sql` were applied to
`md-in-30.webhostbox.net / vishwlt9_nirmansite`; four expected Kharchi/Audit tables, both migration
records, and 22 approved role grants were verified. API/database health returned `200`/`ok`, and
the rebuilt unauthenticated Kharchi route returned `401 AUTH_SESSION_REQUIRED` rather than `404`.
This proves runtime registration, not authenticated role or concurrency acceptance.

Mobile now includes permission-aware navigation, Project summary, paginated list, search and
shared filters, CSV integration, record-paid form, immutable detail/adjustment history, and Wage
allocation history. The shared listing-filter pattern provides an active count, labelled sheet
groups, 48dp radio rows, Apply/Clear actions, and removable applied chips; Clear all immediately
clears committed filters and listing chips. English, Hindi, and Gujarati locale parity, Mobile
type-check, Android Expo export, and diff checks passed. Authenticated workflows, live concurrency,
physical-device/accessibility/large-text/timeout testing, and fluent Hindi/Gujarati review remain
pending. See `docs/modules/construction/kharchi/STATUS.md` for the reconciled evidence matrix.

## 2026-09-02: Site Expenses API Foundation

The Product Owner approved all Site Expenses contract decisions. The API-first implementation adds
Direct and Approval-required Project workflow settings; draft, pending, approved, rejected, and
cancelled states; fixed categories/payment methods; Project list, summary, detail, CSV, review, and
immutable signed-correction flows. Approved originals plus adjustments are the only recognised cost.

Shared permissions and guarded customer-role defaults are present. Platform Super Admin receives no
customer Expense permission. The additive `018_site_expenses.sql` draft creates workflow settings and
immutable setting history, expenses, domain events, and adjustments. Project Access, reusable Audit,
and Notifications are integrated transactionally with scoped retry fingerprints and row locking.

Shared/API compilation, focused lint, 10 focused tests, the full 25-suite API run, production build,
and whitespace validation passed. After exact-target approval, migration `018` and the guarded full
seed ran with `SEED_ROLE_USERS=false`. The remote ledger is 19/19 current; five tables, expected
role grants, zero permission duplicates, and zero Expense business rows were verified. Health is
`200`/`ok`. The API listener was restarted from the current `dist` build and the unauthenticated
Expenses route now returns `401 AUTH_SESSION_REQUIRED`, confirming route registration. Authenticated
workflow, Web, offline, browser, and Mobile physical-device acceptance remain pending.

## 2026-09-02: Site Expenses Mobile Integration

The approved API contract is now consumed by an Expo vertical slice. The Mobile app adds Expenses to
permission-aware navigation and exposes a compact Project-scoped spend summary, paginated operational
cards, search, status/category/payment/date filters, refresh, and CSV export. Authorized users can
configure Direct or Approval-required workflow, record or draft an expense, edit server-eligible
records, and execute only server-derived submit/approve/reject/cancel/adjust actions. Detail preserves
the original amount while presenting recognized spend, immutable signed adjustments, and the event
timeline.

The UI reuses established NirmanSite primitives and semantic tokens, keeps one primary action per
surface, provides inline field errors and explicit destructive confirmations, and ships complete
English/Hindi/Gujarati navigation, screen, accessibility, and API-error copy. Mobile locale parity,
TypeScript, Expo web (1,075 modules) and Android (1,444 modules) production exports, and whitespace
validation pass. Authenticated
runtime, physical-device, screen-reader, largest-text, landscape, slow-network, and fluent-language
acceptance remain separate pending gates.

## 2026-09-02: Project Progress Vertical Slice

The Product Owner authorized the Project Progress contract, database rollout, seed synchronization,
API integration, and Mobile UI in one delivery. The module uses the MVP's nine fixed stages and
retains every update. Overall completion is the equal-weight mean of the latest stage values, with
untouched stages at zero. A reduction is a new correction requiring a note; no history is edited or
deleted.

Migration `019` is applied to the configured remote database and the ledger is 20/20 current. The
new table and intended Progress grants for eight customer role templates are verified. Platform
Super Admin and Sales User remain outside this customer operational module. The current built API
listener reports database health `ok`; unauthenticated access returns `401 AUTH_SESSION_REQUIRED`,
and a read-only authenticated Project summary returns `200` with all nine stages.

The Expo screen reuses NirmanSite semantic tokens and operational primitives for the overall card,
horizontal stage progress, immutable history, export, and an update bottom sheet with quick presets,
exact percentage, date, notes, inline errors, concurrency recovery, and explicit success. English,
Hindi, and Gujarati navigation/screen/accessibility/error copy is complete. Shared/API/Mobile static
checks, 27 API suites with 149 tests, API build, locale parity across 17 namespaces, Android export,
and whitespace checks pass. Authenticated write testing against deliberate business fixtures and
physical-device/accessibility/large-text/landscape/fluent-language acceptance remain pending.

## 2026-09-03: Site Gallery / Project Diary Vertical Slice

The full Gallery contract, Files/Media ownership subset, shared vocabulary/RBAC, migration 020,
NestJS API, guarded role seed, and multilingual Expo capture/queue/direct-publish Gallery experience
are implemented. The remote target is 21/21 current; both new tables and the intended eight customer
role grants are verified, with no demo users created.

Shared/API/Mobile type checks, API build, 28 suites/153 tests, 18-namespace locale parity, Android
Expo export, API/database health, and the unauthenticated Gallery guard pass. On 2026-09-07 a
dedicated private development S3 bucket was configured; a real upload/read/integrity/public-denial/
delete smoke passed under the Organization/Project asset hierarchy. A real `raxorg1@yopmail.com`
upload and authenticated media read were confirmed. The Gallery now uses a dense month/day thumbnail
grid with category/date filters and tap-to-open details. Direct-publish replay and physical-device/
accessibility/fluent-language acceptance of the redesign remain pending.

## 2026-09-03: Site Visits Completion

An audit confirmed that Site Visits already existed inside the Sales CRM contract, migration `011`,
NestJS API, seed, and Expo Sales screen. The existing slice was completed rather than duplicated:
Project lists now filter by status, salesperson, and schedule range; own-salesperson scoping cannot be
overridden; rescheduling requires a new time; terminal outcomes are immutable; and the mobile workflow
captures all statuses, attendee count, feedback, objections, and next action in English, Hindi, and Gujarati.

The configured remote target remains 21/21 current with no pending/draft migrations. The guarded role
seed was synchronized, an unintended Viewer `site-visits:manage` grant was removed, and read-only
verification confirmed all 15 table columns, the four intended operational role grants, and zero Site
Visit business rows. Shared/API checks, focused lint, 28 API suites / 156 tests, Android export,
locale parity, and whitespace checks pass. Mobile type-check passed for this slice, then a final rerun
reported only two concurrently introduced Expenses style errors outside Site Visits. Authenticated write
and physical-device/accessibility acceptance remain pending.

## 2026-09-03: Unit Inventory And Unit Blocking Reconciliation

The requested Unit Inventory and Unit Blocking module was found already implemented within the
Sales CRM vertical slice and was completed in place rather than recreated. Current source includes
Project-scoped manual and CSV inventory, total/per-square-foot pricing, non-exclusive Lead interest,
approval-based exclusive holds, direct manager blocks, release/expiry reconciliation, booking
conversion, transactional row locking, unique active-workflow indexes, audit/timeline evidence,
permission-aware Expo workflows, and English/Hindi/Gujarati copy.

The approved remote target remained 21/21 current after the guarded migration runner. The guarded
seed synchronized successfully with demo-user generation disabled. A repeatable read-only verifier
now confirms the four Unit inventory/hold tables, pricing columns, all four unique workflow indexes,
admin and Sales User inventory grants, removal of `inventory:block` from Sales User, and exclusion
of Platform Super Admin. The target contains one existing Unit and zero active blocks; verification
did not mutate business data. Focused Sales tests (16/16) and shared/API/Mobile type checks pass.
Authenticated approval/release/booking workflows, a live concurrent-hold race, and physical-device,
screen-reader, large-text, landscape, dark-mode, and fluent-language acceptance remain pending.

## 2026-09-03: Lead Conversion And Booking Linkage Completion

The requested Lead conversion/booking module was found inside the Sales CRM vertical slice and was
completed in place. The API now exposes filtered booking lists and visible booking detail, derives
customer and Lead-source snapshots from locked server records, fingerprints logical booking requests,
returns the existing row after identical concurrent retries, and records confirmation/cancellation in
immutable `audit_events` within the same transaction as Lead, Unit, block, interest, and Booking state.

Migration `021_sales_booking_linkage.sql` was the only pending migration and was applied to the
approved remote target. The guarded seed synchronized with demo-user generation disabled. The target
is 22/22 current; read-only verification confirms all six linkage/restoration columns, all three
booking integrity/query indexes, `audit_events`, the intended Sales User booking grants, no Platform
Super Admin booking grants, and zero existing Booking rows. Mobile now keeps one idempotency key across
uncertain retries and adds a multilingual Booking detail/cancellation experience using existing
NirmanSite operational primitives. API/Mobile type checks, locale parity, and focused Sales tests pass.
Authenticated live booking/idempotency/cancellation workflows and physical-device, screen-reader,
large-text, landscape, dark-mode, and fluent-language acceptance remain pending.

## 2026-09-09 — Dashboard asset redesign

Completed the requested reference-led Mobile dashboard with 38 separate PNG assets in ten folders, including the user-approved project-card background, reusable Dashboard components, live permission-aware metrics/actions, actual Gallery previews, project location and en/hi/gu copy. Existing header, footer menu and bottom navigation are preserved. No API/schema/dependency changes were required; unrelated dirty work remains intact.

Mobile TypeScript, locale parity, focused lint, PNG validation and Expo web/Android exports passed. All nine 320/375/425px language fixtures passed overflow, 50px target and tab checks. Authenticated location/Gallery reads, physical-device performance, native accessibility/large text/reduced motion and fluent-language acceptance remain pending. See [implementation report](dashboard-asset-redesign.md) and [screenshots](artifacts/dashboard-redesign/README.md).

## 2026-09-17 - W3 Web Materials

Implemented the full Materials Web workflow: settings, project navigation, filtered list/summary/sort/pagination/CSV, request drafts/edit/submission/approval decisions/cancellation, split purchases, partial deliveries and timeline. Effective project access, isolated caches, server actions/versions and stable uncertain retries are included. Six focused tests passed; whole-Web type-check/lint/build expose unrelated existing Workers, Attendance and foundation errors. Authenticated/browser/cross-client acceptance remains pending. See [W3 Materials parity and review](web-w3-materials-parity.md) for exact evidence, the Mobile/API/Web checklist and optional API follow-ups. Only Web and documentation changed; no backend/Mobile/database mutation, commit, push or deployment.


## 2026-09-18 - W5 Web Project Progress

Implemented summary/stages, filtered paginated history, updates/regressions, exact retries/conflict review, CSV and authorized portfolio. Seven focused tests and scoped lint pass; whole-Web type/lint/build have existing Workers/Attendance and other baseline errors. Authenticated/browser/cross-client acceptance remains outstanding. See [W5 Progress parity](web-w5-progress-parity.md). No backend requirement or out-of-scope changes.


## 2026-09-18 - W7a Web Sales Leads, Activities and Follow-ups

Implemented project-scoped lead list/detail/create/edit/stages/assignment, activity timeline and follow-up scheduling/status updates using existing APIs. Seven focused tests and scoped lint passed; whole-Web baseline failures, pending authenticated/cross-client acceptance and exact backend visibility/transition/retry/assignee limitations are recorded in [W7a Sales parity](web-w7a-sales-parity.md). Unrelated work preserved; this slice changed Web/documentation only, with no commit/push/deployment.


## 2026-09-18 - Materials Builder Owner approval gap

Product Owner approved an exception for Builder Owner-created requests. Current Builder Organization Owner membership plus effective `materials:approve-final` permission now enables own draft/returned submissions to become `APPROVED`. Existing own pending verification/final requests expose `APPROVE` and can recover through the normal command endpoint. The repository checks ownership under its row lock, preserves creator/workflow/history/version/idempotency, and records `BUILDER_OWNER_REQUEST` in audit metadata. Other members' requests retain configured stages; self-verification remains forbidden.

Mobile and Web already consume server `availableActions`; no client-side permission bypass, schema change, migration or data backfill is needed. Saving still records a draft; open it and submit, or use Final approve for an existing pending request. Materials tests: 2 suites / 29 tests passed. API type-check, build, scoped Materials ESLint and diff check passed. Authenticated API and physical-device acceptance have not been run; running API must load the updated source/build before mobile sees the fix.

## 2026-09-21 - W7b Web Site Visits

Implemented Web scheduling, scoped list/detail/filters, reschedule/outcomes and history integration. Twelve focused Sales tests and scoped lint passed. Whole-Web baseline failures, pending authenticated cross-client acceptance and API concurrency/retry/effective-scope requirements are recorded in [W7b Site Visits parity](web-w7b-site-visits-parity.md). Web/task documentation only; Mobile/EAS work preserved; no commit/push/deployment.

## 2026-09-21 - W7c Web Unit Inventory / Import / Holds / Blocking

Implemented Inventory list/detail/create/edit, total/per-area pricing, CSV preview/import, Lead interests, hold requests/decisions, direct blocking/release and server expiry refresh. Eight focused tests and scoped Sales lint pass; whole-Web baseline errors and authenticated acceptance remain open. See [W7c Inventory parity](web-w7c-inventory-parity.md) for the Mobile/API/Web checklist and backend concurrency/idempotency/CUSTOM requirements. Existing concurrent work preserved; no Mobile/API/database edits, commit, push or deployment.

## 2026-10-01 - Web dashboard authentication recovery

Investigated dashboard project-access/me, organizations and notifications/summary 401s after successful login. Login is public; these endpoints require bearer authentication. The screenshot shows direct localhost-to-Vercel requests, which cannot reliably use the API's SameSite=Strict refresh cookie. Web now always uses its same-origin /api/v1 rewrite; absolute legacy NEXT_PUBLIC_API_BASE_PATH values configure the proxy upstream, with trailing API paths normalized. Delayed 401s retry a newer bearer token before refresh, and overlapping refresh/login returns the current login token. Existing uncommitted session restoration changes were preserved.

Verification: seven API-client/proxy regression tests, Web type-check and scoped ESLint passed. Restart the Web server to load the rewrite and sign in again to create the cookie on the Web origin. Authenticated browser acceptance remains pending; no API, Mobile or database changes.


## 2026-10-05 — Simplified Site Expense details (Web/Mobile)

Fixed missing paymentStatus runtime failure by checking complete payment-ledger availability before rendering or permitting payment recording. Approved expense details now use Record adjustment / Record payment, permission-gated, with one newest-first timeline for workflow, signed adjustments, payments and historical voids. Removed the separate payment summary/history, void button and adjustment section from Site Expenses; retained required draft/pending approval actions and existing financial API protections. Materials keeps its existing payment presentation. Added en/hi/gu payment timeline labels and shared regression coverage. No API/database mutations or deployment.

Passed: shared build; Web/Mobile typechecks; scoped Web ESLint; 13 expense adapter/rules/ledger/timeline tests; locale parity (19 namespaces, 3 languages); diff checks. Authenticated payment-write/browser visual/physical-device acceptance remains unrun for this change. ui-ux-pro-max unavailable; existing UI components used; React best-practices review applied.


### 2026-10-05 Mobile timeline/payment follow-up

Adjustment rows are now canonical whenever detail adjustments exist; ADJUSTED workflow events remain fallback-only. Timestamp differences between the audit event and adjustment no longer render two entries. Mobile timeline cards stack title, timestamp, signed amount and actor, with shrinking card width to prevent overflow. Organization working timezone is used. Both clients keep Record payment visible in compact expense controls; it is disabled for incomplete/unavailable ledgers, absent grants, inactive sources or no remaining payable amount. No financial state is inferred from an older API response.

Shared build, Web/Mobile typechecks, scoped Web lint, timeline/ledger regression tests and en/hi/gu locale validation passed. Read-only configured remote DB inspection found all four payment tables; the initial rollout checker stopped because it assumes zero payments and existing site expense payments are present. This is not a missing-table finding. Mobile is configured to the live Vercel API; its authenticated deployed expense ledger/permission response and deployed API/database alignment remain to verify. No DB writes, migrations, deployment or physical-device visual acceptance were performed.


### 2026-10-05 Record payment live blocker confirmed

Authenticated GET-only comparison, using an existing active Owner/approved expense and a short-lived in-memory JWT, confirms both live Web-proxied and direct API expense details return HTTP 200 but omit payments, paymentStatus and remainingAmount. Local API returns the complete ledger for the same expense. Vercel production API is still deployed from commit 49b3f5e (older source); no client-side financial defaults can safely restore recording against that API. No tokens, expense amounts or personal data are printed by the new reproducible read-only verification script.

Current API build and all four focused expense/source-payment suites (40 tests) passed. Production API rollout to nirman-mobileapp-api remains required; no deployment, financial writes, migrations or session mutations were performed. Current local API and ledger UI retain existing version, permissions, overpayment and idempotency checks.

## 2026-10-06 SMTP sender configuration

At the owner's explicit request, configured contact@hornbooktechnologies.com as the SMTP username and sender in both git-ignored API environment files and the seven existing email settings in the configured database. Retained smtp.gmail.com with port 587 and required STARTTLS. Used the supplied credential without recording it in tracked source or documentation. SMTP connection/TLS/authentication verification passed; database setting readback passed. No email was sent, migrations executed, or deployment performed. Invitation/reset inbox delivery and production API database/environment alignment remain to verify. Previously identified settings API password exposure/storage hardening remains outstanding.

## 2026-10-06 Live email destinations

Configured both git-ignored environment files and the environment example to use https://nirman-mobileapp-web.vercel.app for invitation and recovery Web links, with nirmansite installed-app links and no local Expo override. Auth/onboarding email URL defaults now use the live Web origin instead of FRONTEND_URL/localhost; production ignores Expo Go overrides. API type-check, 14 existing auth/onboarding tests and four direct URL checks passed. No email sent or deployment performed; deployed API environment/restart and installed-device acceptance remain pending. Previously sent messages keep their original links.

## 2026-10-06 Live reset-email investigation

Confirmed local Web targets the live API through the live Web proxy; local source/env corrections therefore do not establish production email behavior. Vercel project nirman-mobileapp-api was identified, but environment inspection was rejected with 403 for the hornbooktechnologies-projects scope. CLI fallback has no existing credentials and awaits user device authorization. No production setting/deployment changed and no reset email triggered. Production PUBLIC_WEB_APP_URL/PUBLIC_ACTIVATION_WEB_URL and installed-app scheme must be applied and activated by redeployment before new mail can be verified.

## 2026-10-06 Production email URLs activated

After user-completed Vercel authorization, updated nirman-mobileapp-api PUBLIC_WEB_APP_URL and PUBLIC_ACTIVATION_WEB_URL to https://nirman-mobileapp-web.vercel.app and MOBILE_APP_SCHEME to nirmansite. Rebuilt the existing production deployment with current project environment settings; deployment dpl_6BoxKbT4RyUunoSMFTE26gErCgab reached READY and owns nirman-mobileapp-api.vercel.app. No local uncommitted source uploaded. Live activation and reset Web routes returned HTTP 200. No email sent, invitation generated, password reset requested, database migration or financial write performed. Actual new-email href/inbox and physical-device app opening remain user acceptance checks; old messages retain their original URLs.

## 2026-10-06 Password reset email runtime fix

Investigated live reset requests and confirmed SMTP authentication passes; production logs include accepted SMTP delivery. Found DB session timestamps are IST while deployed Node binds UTC Date values, extending the nominal 15-minute email/IP throttle by 5.5 hours. AuthRepository now measures both windows with database CURRENT_TIMESTAMP and a parameterized minute interval. AuthService awaits password-reset SMTP completion so serverless response completion cannot suspend the send. Generic responses and existing limits preserved. Corrected read-only repository query returned zero recent requests for the screenshot account. API type-check, six auth tests including delayed SMTP regression, and diff checks passed. Deployed isolated snapshot of existing production commit ea1ee805 with only auth repository/service/test and prior onboarding URL changes; dpl_EwF2XXgbbvBEXwte9vFPSgWXXKin READY and aliased to nirman-mobileapp-api.vercel.app. No reset email initiated, credential changed, migration, financial write, or unrelated workspace source deployed. New-email inbox/device acceptance remains user verification.
