# Workers Module Status

> Contract status: approved.
>
> Implementation status: `PARTIAL — REQUIRES OWNER DECISION`.
>
> Last reconciled: 2026-09-16 against the current checkout; the configured remote development database was last verified on 2026-09-15.

## Source Of Truth

### 2026-09-18 — Required daily rate on creation

At the owner's request, Mobile and Web creation forms require a daily rate and show a required indicator. Mobile reuses localized required-field validation in en/hi/gu. API creation rejects omitted, null, blank, non-numeric, and negative rates; explicit zero remains valid under the existing non-negative rule. Existing records and edit behavior are unchanged, and existing missing assignment rates still need correction before Wages confirmation. No database migration or data mutation is needed.

Validation: API and Mobile type-checks, 63 DTO/service/repository tests (including 10 rate-validation cases), locale key/placeholder validation, and diff checks passed. Web build/browser checks, authenticated creation, and phone/tablet acceptance remain pending.

Desired behavior is governed by `MVP_REQUIREMENTS.md`, approved decisions, and the Workers contract. Implemented fact is governed by the active migration and executable shared/API/web/mobile source. Documentation does not replace source or verification evidence.

## Reconciliation Matrix

| Contract area | Current source | Verification | Remaining gap or dependency |
| --- | --- | --- | --- |
| Shared permissions, statuses, errors, inputs, and responses | Implemented | Shared type-check/build passed | Runtime schemas were not introduced because the shared package has no adopted schema runtime |
| Organization worker list, search, filters, sorting, pagination | API and web implemented | API tests and web build passed | None in approved MVP scope |
| Manual roster refresh | Web header refresh refetches the current filtered query. Mobile provides a toolbar refresh action in standalone and embedded rosters plus pull-to-refresh on the standalone list; loaded rows remain visible during refresh. | Web type-check and focused lint, Mobile type-check, and en/hi/gu locale validation passed on 2026-09-16 | Authenticated browser and physical-device interaction remain pending |
| Duplicate candidate warning and acknowledgement | API, web, and mobile implemented; duplicates remain warning-only | Service tests passed | None |
| Worker create, detail, update, generated immutable code | Implemented | Service/repository tests passed | Database migration was not executed in this task |
| Worker-code concurrency | Bounded retry on the organization/code unique key | Repository tests passed | A live concurrent database smoke was not run |
| Worker deactivation | Soft deactivation implemented; default active roster excludes inactive workers | Service tests passed | Owner must choose how active assignments are handled at deactivation |
| Active/current project roster | API filters worker/assignment status and dates, and derives whether each selected-Project assignment is primary for the evaluated date. Mobile distinguishes `Working Here`, `Assigned Here`, `Assigned Elsewhere`, and `Not Assigned`. | 48 focused Workers tests, monorepo type-check, shared build, and en/hi/gu locale validation passed on 2026-09-16 | Authenticated physical-device status-label acceptance remains pending |
| Assign existing worker and create-and-assign | Web Project Team lists assigned/unassigned Organization workers with row-level Assign; assignment inherits Worker trade/base rate. Mobile create-and-assign accepts the actual start date and the API atomically creates the selected Project's initial primary period from that date. | Focused repository test, API/Mobile type-checks, shared build, and en/hi/gu locale parity passed | Mobile existing-worker assignment is outside approved quick-flow scope; authenticated physical-device acceptance remains pending |
| Update/end assignment and effective-dated rate change | API enforces `workers:update-rate` after work has started, records rate history transactionally, and rejects future/out-of-assignment dates. With explicit confirmation, a linked current primary period and assignment end atomically on the same date; future primary periods remain protected. Mobile provides the confirmation and impact message. | 52 focused Workers tests, monorepo type-check, shared/API builds, and en/hi/gu locale validation passed on 2026-09-16; migration `025` applied with 43 baseline histories verified on 2026-09-15 | Authenticated role/browser/device acceptance pending |
| Permission plus organization/project scope | API uses permission guard, membership/project access, and worker visibility checks; clients gate actions | Service tests passed | Full live role/scope matrix needs approved disposable data |
| Stable API errors | Global filter emits canonical nested error plus legacy compatibility fields; Workers emits stable codes | Filter and service tests passed | Other modules may still use compatibility fields |
| Web loading, empty, error, forbidden, read-only, and action states | Implemented for list, detail, assignment, rate, end, and deactivate workflows | Focused lint, type-check, and production build passed | Authenticated browser interaction was not run |
| Mobile roster and quick create | Implemented with 401/403 handling, validation, duplicate acknowledgement, stale in-memory roster, and online-only writes | Mobile type-check passed | No persisted cache, connectivity library, queue, idempotency, or sync foundation exists |
| Audit events | Explicit no-op integration boundary only | Source reviewed | Deferred to Audit Foundation; no persistence is claimed |
| Organization-owner permanent deletion | Organization-scoped `workers:delete`, transactional API removal, Web destructive confirmation, and existing-role RBAC backfill migration implemented | Shared/API/web checks passed; migration `010` applied and owner/admin grants verified on 2026-08-27 | Refresh the owner session, then run the authenticated Web confirmation flow |
| Automated API verification | Jest aligned with ts-jest; Workers service/repository/filter tests added; health E2E isolates the database | 5 unit suites / 32 tests and 1 E2E test passed | No disposable-DB integration suite exists |

## Owner Decision Required

Choose one rule for deactivating a worker who still has active project assignments:

1. Block deactivation until assignments are ended.
2. End all active assignments atomically after explicit confirmation and an end date.
3. Allow deactivation while assignments remain active, relying on worker status to exclude the worker from active rosters.

The current implementation follows option 3 only as existing source behavior: it deactivates the worker, preserves assignment rows unchanged, and excludes the inactive worker from the default active roster. This is not promoted to an approved rule.

Permanent deletion is a separate approved 2026-08-25 workflow. It intentionally removes the Worker and all current directly related assignment, allocation, Attendance, Wage item, and Wage payment records after an explicit irreversible warning. It does not resolve the separate soft-deactivation assignment policy above.

## Deferred Foundation Boundaries

- Audit persistence and audit review UI: Audit Foundation.
- Effective-dated rate migration/runtime verification: migration `025` is prepared but not executed.
- Persisted offline roster, connectivity status, queued writes, idempotency, sync, and conflict handling: Offline Sync Foundation.
- Bulk import, documents/photos, agencies, worker notifications, and persisted offline writes remain outside this slice.

## Verification Evidence

- Shared: type-check and build passed.
- API: type-check/build passed; the current full unit run passed 18 suites and 98 tests, including permanent-delete scope and dependency-order coverage. The DB-isolated health E2E evidence remains recorded from the earlier Workers verification.
- Web: permanent-delete Workers files passed focused lint, type-check, and an isolated production build; all routes, including Workers routes, were generated.
- Mobile: type-check passed.
- Migration `010_backfill_worker_delete_owner_permission.sql` was applied to the configured remote database on 2026-08-27. Read-only verification found exactly one `workers:delete` grant for Organization Owner, Builder Admin, and Independent Contractor Owner. No actual worker deletion, authenticated browser workflow, or physical-device flow was run.

## Next Action

Refresh the owner session and verify the Web confirmation flow. Separately, obtain the owner deactivation decision before marking the wider Workers module verified.


## 2026-09-17 - Web W1 implementation, unverified

Web now exposes primary-project period history/create/correct/end and effective-date transfer, actual project-start onboarding, explicit primary-period closure consent during assignment ending, effective project action guards, updated mutation feedback and related attendance navigation. Existing master/assignment/rate flows remain in place. See [Web W1 Workers parity](../../../tasks/web-w1-workers-parity.md) for the source/API checklist and pending gates.

Detailed assignment rate history cannot be displayed from the existing Workers response; a narrowly scoped read endpoint is proposed in that checklist and requires explicit backend authorization. No backend or database change was made. Tests, type-checks, lint, builds, browser/runtime verification and other verification commands were NOT RUN at the Product Owner's request. This is source implementation, not verified or accepted completion.
