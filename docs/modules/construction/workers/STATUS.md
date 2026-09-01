# Workers Module Status

> Contract status: approved.
>
> Implementation status: `PARTIAL — REQUIRES OWNER DECISION`.
>
> Last reconciled: 2026-08-11 against the current checkout.

## Source Of Truth

Desired behavior is governed by `MVP_REQUIREMENTS.md`, approved decisions, and the Workers contract. Implemented fact is governed by the active migration and executable shared/API/web/mobile source. Documentation does not replace source or verification evidence.

## Reconciliation Matrix

| Contract area | Current source | Verification | Remaining gap or dependency |
| --- | --- | --- | --- |
| Shared permissions, statuses, errors, inputs, and responses | Implemented | Shared type-check/build passed | Runtime schemas were not introduced because the shared package has no adopted schema runtime |
| Organization worker list, search, filters, sorting, pagination | API and web implemented | API tests and web build passed | None in approved MVP scope |
| Duplicate candidate warning and acknowledgement | API, web, and mobile implemented; duplicates remain warning-only | Service tests passed | None |
| Worker create, detail, update, generated immutable code | Implemented | Service/repository tests passed | Database migration was not executed in this task |
| Worker-code concurrency | Bounded retry on the organization/code unique key | Repository tests passed | A live concurrent database smoke was not run |
| Worker deactivation | Soft deactivation implemented; default active roster excludes inactive workers | Service tests passed | Owner must choose how active assignments are handled at deactivation |
| Active/current project roster | API filters worker and assignment status plus assignment dates | Repository tests passed | None |
| Assign existing worker and create-and-assign | Web Project Team lists assigned/unassigned Organization workers with row-level Assign; assignment inherits Worker trade/base rate. Mobile supports current-project create-and-assign | Service/repository tests, web/mobile type-checks passed | Mobile existing-worker assignment is outside approved quick-flow scope |
| Update/end assignment and update current rate | Standard web assignment editing changes dates only; legacy assignment rate snapshots and the rate API remain available | Service tests and web build passed | Attendance-aware elevated rule and effective-dated history depend on Attendance/Wages |
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
- Attendance-aware rate permissions: Attendance.
- Effective-dated rate history and financial interpretation: Wages.
- Persisted offline roster, connectivity status, queued writes, idempotency, sync, and conflict handling: Offline Sync Foundation.
- Attendance, Wages, Kharchi, bulk import, documents/photos, agencies, and worker notifications were not implemented.

## Verification Evidence

- Shared: type-check and build passed.
- API: type-check/build passed; the current full unit run passed 18 suites and 98 tests, including permanent-delete scope and dependency-order coverage. The DB-isolated health E2E evidence remains recorded from the earlier Workers verification.
- Web: permanent-delete Workers files passed focused lint, type-check, and an isolated production build; all routes, including Workers routes, were generated.
- Mobile: type-check passed.
- Migration `010_backfill_worker_delete_owner_permission.sql` was applied to the configured remote database on 2026-08-27. Read-only verification found exactly one `workers:delete` grant for Organization Owner, Builder Admin, and Independent Contractor Owner. No actual worker deletion, authenticated browser workflow, or physical-device flow was run.

## Next Action

Refresh the owner session and verify the Web confirmation flow. Separately, obtain the owner deactivation decision before marking the wider Workers module verified.
