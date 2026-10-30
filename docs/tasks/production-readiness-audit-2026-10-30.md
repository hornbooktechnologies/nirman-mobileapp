# Production readiness audit — 2026-10-29–30

Status: implemented fixes and local automated verification; **production acceptance pending**.

## Scope and boundaries

Audited the API, shared package, customer and administration Web routes, native Mobile modules, and the public website. Preserved existing staged customer-platform work and its approved contracts. This pass does not change financial calculations, approvals, permissions, project lifecycle policy, or worker deactivation policy.

Used the NirmanSite module-development, verification, and React review skills. The optional UI/UX companion skill is unavailable; existing components and design tokens remain the reference.

No migrations, seeds, production writes, real financial commands, email deliveries, or deployments were executed. A build/test result is not authenticated browser or physical-device acceptance.

## Findings and fixes

| Classification | Finding | Result |
| --- | --- | --- |
| NEEDS_CHANGE → verified | Website hero spread Next-generated image props across incompatible installed React type definitions; production compilation failed | Forward generated intrinsic image attributes explicitly; responsive picture sources and visual styles retained; website build and typecheck pass |
| NEEDS_CHANGE → verified | Optional saved Wage rate-breakdown JSON accepted malformed array entries | Validate entry shapes and finite day counts before returning this optional metadata; retain saved gross/net/paid amounts; nine repository regression cases pass |
| NEEDS_CHANGE → verified | Attendance, Calendar, Wages and Workers queries erased row types with `any` | Added explicit DB row types and nullable return contracts; SQL, locks, assignments, totals and transitions preserved |
| NEEDS_CHANGE → verified | Web Sales form dirty ref propagated through render callbacks and failed React lint | Store the UI dirty flag in state; preserve the synchronous submit lock; browser tests cover edits, checkbox values, discard confirmation, duplicate submit, pending dismissal and clean state after save |
| NEEDS_CHANGE → verified | Proxy configuration test omitted Node module context; four older native Sales harnesses omitted current hooks and assumed obsolete assignee loading | Updated harness context and expectations against current source; all client tests and native harnesses pass |
| NEEDS_CHANGE → verified | Full Web lint included generated `.next-dev` output and a CommonJS-only harness import pattern | Ignore the generated development directory alongside `.next`; harness uses dynamic imports; no source lint rules disabled |
| NEEDS_CHANGE → verified | API formatting and unsafe test-fixture types prevented repository lint | Mechanical formatting and typed fixtures; full API lint passes without warnings |
| NEEDS_CHANGE → verified | API startup smoke mock left notification background work trying to use an incomplete fake database | Stub that worker in the HTTP harness; apply the production prefix, guard, filter and validation settings; check 49 protected routes with missing and invalid tokens, plus health and invalid public auth bodies |
| NEEDS_CHANGE → verified | Public brochure share view could retain component state across different share tokens | Key the view by token; use unoptimized Next Image for expiring same-origin media URLs |
| NEEDS_CHANGE → partially verified | Production dependency audit reported 106 findings, including seven critical | Applied reviewed direct upgrades and scoped compatible transitive overrides; final audit has zero critical, zero moderate, one high and one low finding; remaining findings described below |
| EXISTING | Tenant/project access services, permission enforcement, financial history, idempotency, exports, cross-client parity | Existing behavior retained; current automated suites pass; live role/data/concurrency acceptance remains pending |

Formatting spans existing API files because the repository's full lint gate includes Prettier. Changes to migration runner/source files in this pass are formatting; no migration SQL was changed or executed. Existing staged work has not been discarded or committed.

## Dependency remediation

Updated Next and eslint-config-next to **16.4.1**, Web Axios to **^1.20.0**, Web Zod to **^4.6.6**, API Multer to **^2.5.0** and Nodemailer to **^10.1.4**. The lockfile records the resolved versions. Scoped overrides in `pnpm-workspace.yaml` also fix older compatible transitive XML, HTTP/parser, proxy-address, shell-quote, compression and build-tool packages, including Nest's nested Multer copy.

The Next update addresses current vendor advisories, including [image-optimization RCE](https://github.com/advisories/GHSA-2464-fhr4-w9xw) and [cache-function RCE](https://github.com/advisories/GHSA-673q-mjm6-r5xr). Nodemailer's [major-version release notes](https://github.com/nodemailer/nodemailer/blob/master/CHANGELOG.md) require Node 20 or newer; repository Docker images use Node 22. Invitation and password-reset templates also serialize successfully through its in-memory transport, without SMTP or delivery.

The final `pnpm audit --prod --json` still exits 1 for:

| Remaining package | Severity | Scope and disposition |
| --- | --- | --- |
| Zod 3.25.76 — [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | High | Expo CLI dependency. The current upstream CLI metadata still declares Zod 3. The patched release is Zod 4.6.6; replacing a parent's Zod major without migrating its API is not a compatible fix. Track the upstream change and repeat the audit. |
| deepmerge 4.3.1 — [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | Low | Expo configuration tooling dependency; the advisory lists no published patched release. Track upstream remediation. |

The final findings list contains no API/Web/website dependency paths. Both native export source maps were inspected: Android has 1,869 source entries and iOS has 1,867; neither contains Zod or deepmerge. This supports a tooling-scope assessment for these exports, not a statement that the advisories are fixed. The findings remain open and need release-owner disposition.

## Verified gates

| Gate | Result |
| --- | --- |
| Shared TypeScript build | PASS |
| API full lint | PASS, zero errors/warnings |
| API typecheck and Nest production build | PASS |
| API Jest unit suite | PASS: 59 suites, 454 tests |
| Isolated API HTTP suite | PASS: 53 tests; database and notification worker mocked |
| Shared/Web/Mobile Node test suite | PASS: 211 tests |
| Web full package lint and typecheck | PASS |
| Web production build on updated Next | PASS |
| Website production build and typecheck on updated Next | PASS |
| Existing website activation harness | PASS, mocked invitation transport |
| Isolated browser form harness | PASS: 25 checks; real Chromium with local fixture callbacks and a React Native DOM adapter |
| Mobile typecheck | PASS |
| Mobile locale validation | PASS: 19 namespaces, English/Hindi/Gujarati keys and placeholders match |
| All ten native verification scripts | PASS: Attendance loading, customer parity, gallery queue, project creation, Sales loading/time/sheets, Wages parity |
| Android and iOS Hermes export after dependency updates | PASS; production API URL configured for the export; source maps generated locally |
| Expo dependency check | PASS with offline-mode reliability warning; not a substitute for online doctor or native build acceptance |
| Nodemailer in-memory transport | PASS: invitation and recovery content/address serialization; no network delivery |
| Local public reachability | Health and Web/website shells responded before final build; not authenticated acceptance |
| Git whitespace validation | PASS |

An isolated repeat of full Web lint passed after a prior Windows native-process exit during concurrent build work. Build-time Google Fonts fetches and headless browser/Metro workers needed approved network/process access. These were local builds, not deployments.

Evidence logs and JSON reports are under ignored `.tmp/production-audit-2026-10-29/`. The final dependency evidence is `dependency-audit-final.json`; final API evidence is `api-tests-release.json` and `api-e2e-release.log`; native scope evidence is `native-tooling-scope.json`. These local artifacts are not committed release assets.

## Required acceptance gates still open

1. Confirm a non-production API/database target and normal signed-in test session for the owner-identified account. The supplied email alone did not identify the environment or authorize credential handling.
2. Run authenticated, role-specific list/detail/actions across Web and Mobile using the existing [testing guide](../testing-guide/README.md), including organization/project switching and cross-tenant denial.
3. Inspect migration status/schema on the explicitly approved target. Do not infer rollout state from repository migration files or old status notes.
4. Separately authorize dedicated test-data writes before exercising financial commands, lifecycle changes, concurrency/idempotency, invitation/reset delivery, uploads/storage deletion and cleanup.
5. Validate actual Android/iOS installation, native picker uploads, notifications, offline/reconnect, date pickers, file export/share and accessibility/localization on devices. Hermes exports do not verify native permissions or signed binaries.
6. Build and smoke-test the deployment containers, deployed proxy/TLS/environment settings and release artifacts. Docker is unavailable in this workstation; no container build or deployment was performed.
7. Resolve or explicitly accept the two open upstream tooling advisories; keep the audit visible rather than suppressing it.

Automatic approval review rejected the proposed live-account helper because it would connect to an unspecified external database using environment credentials, mint/store a test token, and inspect organization data without explicit approval of the target and credential-handling approach. No connection or token issuance succeeded. That helper has been discarded. Authenticated runtime work remains pending; use an approved environment and the normal login flow for the next pass.

Production is **not cleared** by this audit. The local checks above are verified; the unrun acceptance gates and two upstream findings remain open.
