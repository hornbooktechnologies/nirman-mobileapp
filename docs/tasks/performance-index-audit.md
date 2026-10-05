# Database, API and client performance audit

Date: 2026-10-05. Requested scope: review indexing and shorter Web/Mobile refresh times. This is an audit and implementation proposal; no production query/index/cache behavior was changed and no index migration was applied.

## Outcome

Targeted composite indexes are worthwhile, particularly for default Materials and Site Expenses sorting. The database is already extensively indexed: **63 tables, 410 indexes, 785 index-column entries**. Current operation tables contain tens of records, so adding many indexes now will not by itself explain or fix perceived refresh delay. The strongest immediate candidates combine fewer API/database round trips, retained client data during refresh and a small set of sort-aligned indexes.

The repository-wide search covered all 24 API repository files, source query/filter/sort patterns, access/auth foundations, Web query-provider/workspace/query-hook behavior and Mobile API/load/focus paths. The complete live index inventory covers every table. This is not a line-by-line review of every unrelated asset, generated file or archived Prisma definition. Active persistence remains API-local mysql2, not the archived packages/database schema.

Evidence: [all-table index inventory](performance-index-inventory.md), [sanitized measurements and EXPLAIN](performance-index-audit-evidence.json), and `apps/api/scripts/audit-performance-readonly.ts`. Metadata/SELECT/SHOW/EXPLAIN only; no business rows, source identifiers, JWTs or passwords are saved in these artifacts. Existing unrelated changes were preserved.

## Measured baseline

Configured remote MySQL is 5.7.23-23. Source metadata is from `md-in-30.webhostbox.net:3306/vishwlt9_nirmansite`. Warm SELECT 1 round trips: approximately 21–23 ms, with the first sample about 42 ms. Pool default is five connections per API process unless DB_CONNECTION_LIMIT is configured. Actual configured API process pool saturation was not measured.

Three authenticated sequential local HTTP samples per endpoint, existing Owner with an accessible populated active project, without login/refresh writes:

| Endpoint | Median ms | Observed range ms |
| --- | ---: | ---: |
| Project access | 465 | 332–617 |
| Dashboard | 514 | 500–612 |
| Materials list | 291 | 279–354 |
| Site Expenses list | 246 | 244–317 |
| Total Expenses summary | 313 | 301–378 |
| Total Expenses list | 406 | 335–566 |

All 18 responses were HTTP 200. These are diagnostic samples, not p95/load-test results or a guarantee of future speed. They include local HTTP, authentication, access checks and remote SQL; they exclude physical-device network/rendering. The selected October paid-report range is empty, so these report timings establish access/query overhead, not large-report performance. Different screens/personas/projects can have different costs.

Exact audited database counts: 16 material requests, 10 purchases, 11 Site Expenses, three adjustments, 32 wage payments, 47 wage items, 26 projects, 22 project memberships and 47 organization memberships. InnoDB TABLE_ROWS estimates can be stale/zero; never interpret them as exact counts.

Slow query logging is OFF, long_query_time is 10 seconds, performance_schema is ON but its digest summary was unavailable to this connection. Server max_connections is 150 and buffer pool reports 4 GiB; these are server-wide settings, not this application's available connection/memory budget. No server settings changed.

## Prioritized changes

| Priority | Area | Proposed change | Why / evidence |
| --- | --- | --- | --- |
| P0 | Project access/session | Batch assignment and custom-grant reads across accessible projects; obtain Material approval eligibility in a batch or scoped member check | getProjectAccessSummary performs an assignment lookup and canApproveMaterials query per project, plus custom-grant queries. canApproveMaterials retrieves a full eligible-member list and sorts names although it only needs a boolean for one member. Query count grows with projects; measured access median 465 ms |
| P0 | Request access checks | Reuse resolved organization/project access within the same request; preserve independent action validation | Separate checks often resolve the same membership/role/project multiple times. Source payment service resolves read and payment permissions separately. Request-local reuse avoids repeated SQL without stale authorization between requests |
| P0 | Mobile Total Expenses | Separate period-only summary loading from source/page list loading | load uses Promise.all(summary,list) on every category/page/focus refresh even though summary only depends on period. A category/page change should request the list once, keeping the four stats unchanged |
| P0 | Materials detail | Load payment histories for all purchases in one scoped query and group them in memory | findDetail maps purchases to separate ledger queries via Promise.all; it retains N additional DB round trips per request. One batch history read avoids this fan-out |
| P1 | Materials / Expenses SQL | Add default sort-aligned indexes below | Existing scope indexes do not match the default ORDER BY; representative plans show filesort |
| P1 | Total Expenses SQL | Use lean summary events, dates inside each UNION branch, and build only selected source branches for list | Shared events currently compute payable/name/detail and correlated costs even for summaries; EXPLAIN still shows lifetime wage-item/adjustment subqueries and materialized derived scans. Outer date filters do not establish date-range scans in these captured plans |
| P1 | Dashboard / Kharchi | Scope adjustment/allocation aggregates before GROUP BY | Dashboard aggregates site_expense_adjustments across the table; Kharchi derived aggregates similarly span sources before outer project filtering. Scope child aggregates explicitly and retain void/reversal exclusions |
| P1 | Web refresh/cache | Retain query data across same-scope detail/list navigation, choose query-specific freshness and invalidate after writes | Root QueryClient has no explicit staleTime; module workspaces create private clients and clear them on unmount. Same-scope return discards cache, and many workspaces refetch on focus |
| P1 | Mobile refresh UX | Retain same-scope data during refresh; cancel obsolete reads; deduplicate identical in-flight requests | Several loaders set loading/hide data for refresh; sequence guards prevent stale application but do not stop obsolete network requests. Root apiRequest already accepts RequestInit so AbortSignal can flow through service methods |
| P2 | Sales / Notifications | Add sort-aligned indexes if workload proves these lists important | Tenant/project indexes exist but miss updated_at or all-notifications created_at order; details below |
| P2 | Monitoring / pool / topology | Measure per-request query count, SQL duration and pool wait before raising concurrency | With remote round trips near 20 ms, sequential SQL costs accumulate. Raising the default pool to 10/15 blindly can overload shared hosting and multiply connections across replicas |

P0/P1 choices are candidates grounded in source and diagnostic measurements. Their ranking reflects likely return on effort, not a measured attribution of every millisecond.

## Candidate index definitions — proposal only

Composite indexes should match equality scope first and then ordering/range columns. Existing `(organization_id, project_id, status, date)` indexes cannot fully supply an unfiltered chronological order because status sits before date. MySQL explains leftmost-prefix behavior in its [composite index documentation](https://dev.mysql.com/doc/refman/5.7/en/multiple-column-indexes.html).

Start with **two**, not all candidates:

```sql
-- PROPOSAL ONLY. Not a migration and not executed.
CREATE INDEX idx_material_requests_scope_updated
  ON material_requests (organization_id, project_id, updated_at, id);

CREATE INDEX idx_site_expenses_scope_date
  ON site_expenses (organization_id, project_id, expense_date, created_at, id);
```

Materials defaults to updated_at DESC, id DESC. Existing indexes cover requested_on/created_at and status/required_by_date, not updated_at. The sampled default plan is ALL + filesort; the status plan uses idx_material_requests_scope_status but still filesorts. This tiny-table scan is not itself proof of a slow query; the sort mismatch is a growth risk.

Expenses defaults to expense_date DESC, created_at DESC, id DESC. Its existing chronological indexes insert status or category before expense_date, so All does not have a matching chronological scope index. The sampled All/APPROVED plans scan seven estimated rows and filesort; the actual table has 11 rows.

Only add the following after representative load/usage establishes a benefit:

```sql
-- Optional, not all intended for one migration.
CREATE INDEX idx_material_requests_scope_status_updated
  ON material_requests (organization_id, project_id, status, updated_at, id);

CREATE INDEX idx_site_expenses_scope_status_date
  ON site_expenses (organization_id, project_id, status, expense_date, created_at, id);

CREATE INDEX idx_sales_leads_scope_updated
  ON sales_leads (organization_id, project_id, updated_at, id);

CREATE INDEX idx_notifications_recipient_time
  ON notifications (organization_id, user_id, created_at, id);

CREATE INDEX idx_permission_role_order
  ON permission (roleId, resource, action);
```

For Sales, add a deterministic id tie-breaker to the actual ORDER BY updated_at before adopting keyset paging. Existing assignee/stage indexes stay useful for filters; an OWN visibility OR across assigned_to/created_by is a separate query-shape concern.

Notifications already has `(organization_id,user_id,read_at,created_at)` for unread filtering. An All list does not constrain read_at and needs a time-first index after recipient scope. Existing unread and dedupe constraints must remain.

Permission role lookup currently uses a roleId-only index and sorts resource/action. A covering ordered index could help repeated reads, but batching/request-local reuse is higher priority with this small role table. Retain the separate unique `(resource,action,roleId)` constraint; the new index does not replace its uniqueness semantics.

MySQL 5.7-compatible ascending index definitions are intentional; validate reverse scans for all-DESC sorts on a representative clone. Expense custom ascending sorts mix ASC/DESC directions; these candidate indexes are aimed at the default descending view, not every sort option. Do not assume MySQL 8 features such as invisible indexes or EXPLAIN ANALYZE are available on this server.

## Existing indexes worth preserving

| Domain | Current coverage / conclusion |
| --- | --- |
| Auth, sessions, password resets | User identity, refresh token uniqueness/expiry and reset email/IP/time keys already indexed. Avoid broad caching of revocable identities |
| Organizations, memberships, project access | Organization/user uniqueness, member/status and project/member keys present. Primary issue is fan-out/repeated reads, not missing basic scope keys |
| Projects | Organization/status/type/city keys present. created_at list order is a possible later candidate; list grouping/worker joins should be profiled first |
| Workers / assignments / rates | Organization/name/status/mobile, project/status/start/end and effective-rate lookup indexes present. Do not add duplicate assignment/date indexes |
| Attendance / Calendar | Project/date, assignment/date, calendar organization uniqueness and override scope/date keys present. Derived attendance/range calculations need application profiling, not blanket indexes |
| Wages | Project/period batches, batch/item joins and `(organization_id,project_id,payment_date)` already present. Sample payment-date query uses this range index |
| Kharchi | Scope/request date, worker/date and adjustment/allocation source keys present. Derived payment/outstanding state is not a stored column to index; scope aggregates first |
| Materials | Source/event/purchase/delivery child keys exist. Default updated_at index is the strong missing list candidate; repeated correlated quantity subqueries can also be computed once per page/request |
| Site Expenses | Status/category/date and adjustment/event source keys exist. Default unfiltered date sort is the strong candidate |
| Total Expenses / source payments | All three payment date indexes already exist; void payment uniqueness gives indexed exclusion. Do not add another identical date index. Source ledger indexes can be considered after batch-history refactor and payment volume grow |
| Progress | Project/latest and stage/latest indexes exist. The representative stage query uses idx_project_progress_stage_latest and reports Using index |
| Gallery / files | Scope/captured date/status and file uniqueness keys present. captured_at,created_at,id list ordering differs from existing captured_at,id diary index; empty table means defer new index until real usage |
| Sales | Project/stage/assignee, booking/date/status, unit status/number, follow-up/visit schedule and activity/assignment source keys present. Lead updated_at order candidate; optional assignee/status/date indexes only after workload profiling |
| Notifications / push | Unread/recipient, queue retry/date and device keys present. All-notifications chronological list candidate |
| Audit | Scope/time, actor/time, entity/time and action/time indexes present. No extra audit index proposed without a concrete missing query |
| Settings / subscriptions / invitations / migrations | Identity, owner/scope/status/expiry and unique keys already present. No priority additions proposed |

The full inventory covers all 63 tables, including workflow/event/reversal entities grouped above. No stored report-total table or source linking is proposed.

## Query changes that preserve financial rules

Total Expenses must still calculate exact paid amounts, active void exclusions, original plus approved adjustments, eligible wage batches, period vs lifetime/remaining, scope isolation and deterministic grouped pagination.

1. Summary event branches need only source, amount and paymentDate. Apply organization/project/date predicates within each branch. Avoid lifetime payable/correlated wage-item and expense-adjustment computations in summary/monthly reads.
2. List builds only selected source branches, while summary retains all three. Find included source IDs using period predicates; compute lifetime sums/costs for those sources. Group before pagination; never LIMIT raw payments to speed up totals.
3. Reuse one lean monthly aggregation to derive four headline totals from exact month values if the response shape can be preserved. Keep consistent snapshot semantics and avoid storing financial totals.
4. Count and page currently repeat grouped aggregation. Consider scoped temporary/grouped processing or query redesign only after profiling; do not casually introduce persistent totals or inconsistent multiple reads.
5. Scope Dashboard/Kharchi child aggregation explicitly. Materials requestSelect repeats ordered/delivered SUM subqueries for remaining; compute these once using scoped aggregates without child-join multiplication.
6. Preserve source locks/version/idempotency/audit and adjustment floor. No caching of remaining balances for authorizing writes.

Captured Total Expenses summary/list plans include materialized derived tables, temporary grouping/filesort and dependent payable subqueries. This is source/EXPLAIN evidence on the actual 5.7 server, not an assumption that newer MySQL can push all predicates down. Oracle's current [derived-table optimization documentation](https://dev.mysql.com/doc/refman/9.7/en/derived-table-optimization.html) describes UNION/GROUP BY materialization limits; the captured 5.7 plan remains authoritative here.

## Faster refresh without stale financial actions

Web: propose query-specific staleTime around 15–30 seconds for read reports/lists, then measure; settings can use longer freshness with explicit invalidation. TanStack considers queries stale by default, and stale queries can refetch on mount/focus. See [official defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults). Keep user/organization/project/filter identity in cache keys, clear on logout/scope change, recheck server permissions on every API request, invalidate affected source/report/dashboard keys after payments/voids/adjustments/workflow changes, and retain explicit Refresh.

Moving caches above per-route module workspaces requires careful scope ownership; do not simply remove cleanup and retain cross-user financial data. Show prior same-scope data with a Refreshing indicator rather than a full-page loader. Same-scope cached report data may be briefly stale; financial actions must always use freshly checked server state/version.

Mobile: summary query depends on user/org/project/start/end, while list adds source/page. Split their request lifecycles and deduplicate focus-triggered requests. Existing Total Expenses Map persists filters only, not report data; introduce bounded scoped memory caching only if this slice is approved. Keep both request sequence guards and AbortController. Do not queue offline payment writes. Materials/Expenses already skip summary/settings for appended pages, so preserve that optimization; avoid refetching settings on every ordinary filter refresh. Home currently fetches dashboard, then Gallery once dashboard resolves, plus project location independently: parallelize only where permission/current-scope validation remains correct.

Do not reduce notification or inventory polling indiscriminately: those screens already use 60-second polling with foreground controls. Distinguish needed polling from unnecessary repeated mount/focus reads. Server authorization caching should begin with request-local memoization, not a long global permission TTL.

## Index overlap review — no drops proposed

Detected potential prefix overlaps include `idx_material_purchase_payments_source` vs the auto-created scoped purchase FK index; `idx_site_expense_payments_source` vs scoped expense FK index; and `idx_worker_assignments_organization_project_status` vs `idx_worker_assignments_dashboard_active`. These are review candidates, not proven redundant removals: check FK dependence, uniqueness, query plans, index size and usage before a separate removal decision. Never drop primary, unique/idempotency or FK-supporting keys merely because another index shares columns.

Leading-wildcard searches (`LIKE '%text%'`) appear in Materials, Expenses, Workers, Projects and Sales. A normal name/description B-tree index will not make arbitrary contains-search a selective prefix lookup. Prefix-search/full-text would change search behavior and must be a separate product/locale-aware decision. No speculative full-text index is proposed.

## Implementation sequence and acceptance

1. Add sanitized per-request DB query count, query duration and pool-wait metrics; profile common authenticated pages on realistic data. Capture cold/warm cache and refresh separately. Hosted slow logs require provider scope/access; do not enable server-wide settings casually.
2. Implement P0 batching/request-local access reuse and Mobile period/list separation, one slice at a time. Verify existing role/custom grants/revocation, exact finance, source locking and cross-client invalidation regressions.
3. Prepare a separately reviewed migration for the two primary sort indexes. Inspect current target, compare existing keys, clone/backups and table/index size. Validate plans and read/write workload before remote application. No migration was created in this audit.
4. Apply only after explicit database approval, then verify actual keys/plans and authenticated page timings. Benchmark dataset large enough to expose scan/sort differences; adding an index on today's tiny tables may show little improvement.
5. Roll out controlled client freshness/invalidation and query rewrites; measure request counts and p50/p95 under realistic concurrency. Preserve user/project isolation, period/card reconciliation, pending/write retry rules and all three locales.
6. Success criteria: category/page changes no longer refetch summary; access/detail query count bounded rather than linear in projects/purchases; report branch date plans can use existing indexes on realistic data; same-scope refresh avoids blanking data; default list scans/sorts reduce on large fixtures; no lock/write slowdown or privacy regressions.

No universal percentage speedup is promised. No API behavior, index, cache TTL, pool limit, server setting, business data or historical payment changed under this review. Physical-device/browser rendering, deployment topology, provider throttling and production concurrency require separate measurements.

## Approved implementation follow-up

The owner authorized this slice. Two recommended indexes are applied and API/client improvements implemented; original audit findings and measurements above remain baseline evidence. See [implementation and post-change checks](performance-implementation-plan.md).
