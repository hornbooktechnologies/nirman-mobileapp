# Current Task

## Objective

Implement the approved Organization Members, Project Team, Project permission matrix, Builder Supervisor, operational Contractor, subscription-capacity, and mobile access foundations without conflating commercial plans, roles, Project scope, or workflow responsibility.

## Implemented Scope

- Approved `docs/modules/foundation/project-team-access/CONTRACTS.md` and `docs/modules/platform/subscriptions/CONTRACTS.md`.
- Added `ROLE_DEFAULT` and `CUSTOM` Project assignment permission modes.
- Added explicit `project_member_permission_grants` persistence and role-ceiling intersection in `ProjectAccessService`.
- Extended Member-to-many-Projects assignment writes with per-Project responsibility, dates, status, permission mode, and permissions.
- Added an atomic Project-to-many-Members API contract and transaction.
- Added the Builder Supervisor system role and explicit operating-profile combinations.
- Changed Contractor Member into an operational assigned-Project ceiling that can be narrowed per Project.
- Kept Organization-wide Project access on role defaults; per-Project differences require explicit assignments.
- Added `/projects/:projectId/team` on web with Members and Workers tabs.
- Removed the embedded Workers roster from Project Details and added the Team CTA.
- Changed Project Team Member and Worker row operations to shared ellipsis actions.
- Added web Project permission editors with role-default, view-only, all-allowed, and action-level selection.
- Made the Team-page search explicitly filter assigned members and added a searchable Organization Member picker for assignment.
- Added visible assignment-date labels, Draft-access guidance, human-readable permission labels, and a pre-save access summary.
- Enforced optional Project-assignment start/end dates during authorization and Project discovery.
- Narrowed Site Supervisor to Project/Team read plus daily Worker read/create/update/allocation; removed Contractor-level Team administration and sensitive Worker actions.
- Changed the Project Team Workers tab to one Organization-worker roster with visible row-level Assign CTAs for unassigned workers.
- Moved the reusable daily rate to the Worker master and made new assignments inherit trade/rate without duplicate role or rate inputs.
- Kept assignment rate snapshots and legacy role labels for history while standard assignment editing now changes dates only.
- Added configurable subscription plans, one current Organization subscription, active Project/Member capacity counting, manual Platform provisioning APIs, and transactionally locked capacity checks.
- Added Platform `/subscriptions` administration and an Organization capacity summary on Members.
- Added mobile Organization switching and Project-effective permission navigation.
- Added mobile Organization Members search/invite/edit/activate/deactivate, subscription capacity, and atomic multi-Project assignment with per-Project responsibility, dates, status, and permission grants.
- Added mobile project creation/editing and a persisted selected-Project context for Active, Draft, and On-hold Projects so Project Detail, Project Team, and Workers retain their Project through persistent navigation. Status remains explicit; selecting a Draft does not change its lifecycle status.
- Added mobile Project Team member search/assign/edit/unassign and permission management.
- Changed mobile Project Workers to an Organization-worker roster with assigned/unassigned states, visible row Assign, allocation date editing/end, and Worker master trade/base-rate inheritance.
- Corrected the API production entrypoint from `dist/main.js` to `dist/src/main.js`.

## Database State

Migration `004_project_permissions_subscriptions.sql` was explicitly implemented and applied to the configured remote development database on 2026-08-14.

Migration `005_worker_base_daily_rate.sql` was applied on 2026-08-17. It added
`workers.base_daily_rate` and backfilled existing Worker rates from the latest available
assignment without rewriting assignment history.

Read-only status after application:

```text
Local migrations: 6
Applied migrations: 6
Pending migrations: 0
Draft migrations: 0
State: current
```

The guarded mysql2 seed was run after migration. Live read-only verification confirmed:

- all existing nine Project assignments use `ROLE_DEFAULT` compatibility;
- `Builder Supervisor` exists with Builder-side read/oversight foundation permissions;
- `Contractor Member` has the operational role ceiling required for assigned-Project Worker and Team management;
- subscription tables exist;
- no commercial plan values were invented or seeded (`subscription_plans` remains empty until Platform provisioning).

## Verification

- Shared build passed.
- API, web, and mobile type-checks passed.
- API Jest: 12 suites, 57 tests passed, including assignment date-window, Worker base-rate inheritance, scheduled-assignment management, and inactive-custom-access coverage.
- The mobile Members/Projects/Project Team/Workers parity implementation passed a fresh mobile type-check; shared type-check/build and API type-check also passed.
- A fresh Expo web export did not complete within the 184-second verification window and produced no bundle output, so bundle/runtime verification is not claimed from that command.
- Web production build passed and includes `/projects/[id]/team` and `/subscriptions`.
- `git diff --check` passed.
- Live API health passed on port 4000 with database status `ok`.
- The guarded seed synchronized the narrowed Site Supervisor ceiling; a read-only live query confirmed the nine intended permissions.
- Runtime route registration confirmed the Project Team batch, subscription plan/assignment, and Organization subscription-summary endpoints.
- In-app browser discovery returned no available browser, so authenticated visual/browser verification was not run.
- No authenticated physical-device verification was run.
- No disposable Organization, subscription plan, Member assignment, or custom grant record was created solely for smoke testing.

## Deliberately Unresolved

- Delete Member remains parked.
- Project-scoped invitation of a brand-new login identity remains separate from assignment; existing broad `members:invite` was not given to Contractor Member.
- Authenticated physical-device verification for the new mobile mutation flows remains pending.
- Storage is represented as configurable capacity but remains unenforced until Files And Media owns byte accounting.
- Worker deactivation with active assignments still requires the Product Owner policy decision.
- Module-specific Builder Supervisor verify/review permissions wait for the relevant module contracts.
- No initial plan names, prices, or capacity numbers have been invented.

## Next Recommended Task

Run an authenticated browser and physical-device matrix using explicitly approved disposable data:

1. Organization Owner assigns CUSTOM Worker/Team grants to a Contractor Member.
2. Contractor can manage only the granted modules on assigned Projects.
3. Contractor cannot access an unassigned Project or exceed the role/delegation ceiling.
4. Platform Super Admin creates a temporary plan and validates active Project/Member capacity errors.
5. Builder Supervisor can read assigned Project oversight data but cannot perform Site Supervisor or final commercial actions.
