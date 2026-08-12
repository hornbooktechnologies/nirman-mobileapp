# Workers Decisions

> Status: approved owner decisions.

## Decisions Confirmed By Requirements

- Workers/labourers are not application users.
- Workers are organization-owned managed records.
- A worker is owned by one organization/builder and may be assigned separately to one or more projects.
- Each worker has a system-generated organization-scoped `worker_code`.
- `worker_code` is generated automatically, unique within the organization, immutable, not supplied by the client, and usable for search, reports, Attendance, Wages, and Kharchi references.
- Project worker lists are filtered by current project.
- Worker project assignment is required before Attendance, Wages, and Kharchi can work safely.
- Inactive workers remain available in historical attendance and wage records.
- Workers with financial history must not be hard deleted.
- No hard deletion of workers or assignments is allowed in MVP.
- Daily rate stays on the worker-project assignment for the initial Workers MVP, but it is not the final wage-rate design.
- Daily rate is required before wage generation, but not necessarily at initial worker creation.
- Before attendance exists for an assignment, authorized users may update the rate.
- After attendance exists for an assignment, rate changes require elevated `workers:update-rate`, an effective date, and audit.
- Historical attendance and financial meaning must never be silently changed by rate edits.
- A complete effective-dated rate-history entity is deferred to the Wages domain and must be introduced before or during Wages.
- Mobile number is optional.
- Duplicate organization-scoped mobile numbers are warning-only after normalization where supported.
- Probable duplicate names are warning-only.
- Users may continue after acknowledging duplicate warnings.
- Worker name is not unique and must not be used as a unique identifier.
- Trade/worker type remains free text for MVP with optional UI suggestions.
- Project assignment remains separate from the worker master.
- Offline worker writes are deferred for Workers MVP.
- Cached/synced workers may be viewed offline where existing repository infrastructure supports it.
- Create, edit, assign, deactivate, and rate-change actions require connectivity in Workers MVP.
- Contractors may create or update workers only when explicit role permissions and relevant project access both allow it.
- Contractor worker management rights are not granted automatically.
- Platform Super Admin is not a normal Workers actor and must not receive `workers:*` permissions by default.
- Platform support access, if implemented, must be separate from organization operational permissions and must be scoped and audited.

## Decisions Derived From Existing Architecture

- Permission keys use `resource:action`.
- Worker permissions will use `workers:*`.
- New SQL tables use plural `snake_case`.
- Active database work belongs in `apps/api` using `mysql2/promise`.
- Shared framework-neutral contracts belong in `packages/shared`.
- Web module code should follow `apps/web/src/features/<domain>`.
- Mobile module code should follow `apps/mobile/src/features/<domain>`.
- API module code should follow `apps/api/src/modules/<module>`.
- Access checks should reuse `ProjectAccessService`.
- `created_by`, `updated_by`, `deactivated_by`, and `ended_by` reference the inherited `user` table.
- Worker code generation should use the repository's established ID/code-generation conventions where available.

## Assumptions Avoided

- Did not merge workers with users, employees, contractors, or agencies.
- Did not assume a worker has login credentials.
- Did not assume mobile number is globally unique.
- Did not assume worker import is part of first implementation.
- Did not assume offline writes are already implemented or select a sync library solely for Workers.
- Did not assume notifications are required for ordinary worker creation.
- Did not assume active audit infrastructure already exists.
- Did not assume Prisma is active.

## Approved Permission Matrix

| Role/profile | Default access | Restrictions |
| --- | --- | --- |
| Organization Owner / Builder Admin / Independent Contractor Owner | `workers:read`, `workers:create`, `workers:update`, `workers:assign-project`, `workers:update-rate`, `workers:deactivate`, `workers:export` where granted by organization role template | Own organization; project-specific operations still enforce project access |
| Supervisor | `workers:read`, `workers:create`, `workers:update` | Assigned projects only; no default deactivation, export, organization-wide access, or elevated rate changes |
| Contractor | `workers:read` | Assigned projects only; create, update, assign, update-rate, deactivate, and export require explicit role permissions |
| Sales User | none | No Workers access by default |
| Platform Super Admin / Platform Support | none as normal operational access | Support access must be separately approved, scoped, and audited |

Permission keys:

- `workers:read`
- `workers:create`
- `workers:update`
- `workers:assign-project`
- `workers:update-rate`
- `workers:deactivate`
- `workers:export`

## Remaining Product Questions

- Owner decision required: when a worker with active project assignments is deactivated, choose whether to (a) block until assignments are ended, (b) atomically end them after explicit confirmation and an end date, or (c) allow them to remain active while worker status excludes the worker from active rosters.
- Current source follows option (c) as unapproved existing behavior; it must not be treated as final product policy.
- Future Wages implementation must approve the final effective-dated rate-history entity and rate-calculation rules.
- Future Attendance/offline-sync implementation must approve the mobile offline write strategy.

## Deferred Items

- Attendance.
- Wage generation and wage payments.
- Effective-dated wage-rate history entity.
- Kharchi.
- Worker documents and photos.
- Agency/subcontractor ownership.
- Bulk worker import.
- Offline worker writes.
- Push/in-app notifications for worker activity.
- Full audit review UI.
