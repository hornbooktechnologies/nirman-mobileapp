# Current Task

## Kharchi / Worker Advances API Implementation

On 2026-08-31, the Product Owner started the API-first Kharchi module and confirmed a
direct-paid workflow with no request, draft, approval, rejection, or separate mark-paid
stage. Every authorized create records money already given to the Worker. Payment method is
required (`CASH`, `UPI`, `BANK_TRANSFER`, or `OTHER`), payment reference is optional, and
financial writes require duplicate-retry protection.

The approved contract is `docs/modules/construction/kharchi/CONTRACTS.md`. It specifies immutable
positive/negative adjustments, automatic oldest-first deduction during Wage confirmation,
active Worker and assignment-date validation, approved role defaults, CSV export, and a
reusable Audit Foundation prerequisite. Actual Mobile offline storage/sync is deferred, while
API idempotency is required now.

The Product Owner confirmed that incorrect paid records remain immutable and are corrected only
by signed adjustments, with no Kharchi cancel/delete action. The API-first source implementation
under `docs/tasks/kharchi-api-technical-plan.md` is complete: shared contracts, guarded role
defaults, Audit and Kharchi SQL drafts, list/summary/detail/create/adjust/export endpoints,
transactional audit writes, automatic oldest-first Wage allocation, Worker deletion integration,
and focused tests are present. Shared and API static checks passed, including all 21 API suites
and 114 tests. Migration-status, migration, seed, remote database, authenticated runtime, Web,
Mobile, and offline-sync work remain outside this authorization.

The Mobile integration contract is now documented at
`docs/modules/construction/kharchi/MOBILE_INTEGRATION_CONTRACT.md`. It defines the existing API
envelopes and shared types, date-valid Worker assignment selection, retry-key lifecycle, list and
summary UI, paid-advance form, immutable detail/adjustment history, permission states, en/hi/gu,
accessibility, refresh rules, and acceptance gates. No Mobile source or dependency was changed by
this documentation slice.

## Sales CRM API Status

On 2026-08-26, the Sales vertical API was implemented from `MVP_REQUIREMENTS.md` sections
19-23. The source slice includes shared Sales statuses/permissions/errors, the proposed
`011_sales_crm.sql` migration, NestJS routes/services/repositories, own/team/all Lead access,
assignment/timeline history, follow-ups, site visits, unit inventory and locking, and
idempotent transactional booking conversion/cancellation. See
`docs/modules/sales/CONTRACT.md`.

On 2026-08-27, explicit target-specific approval was used to apply pending migrations `010`
and `011` to `md-in-30.webhostbox.net/vishwlt9_nirmansite`, followed by the guarded updated
seed with demo-user generation disabled. Read-only verification reports 12/12 migrations
applied, all eight Sales tables present, both stored generated columns and all three required
unique workflow indexes present, zero duplicate role permissions, 15 Sales grants for each
owner/admin template, nine for Sales User, and zero for Site Supervisor and Platform Super
Admin. All Sales tables remain empty. API health reports app/database `ok`, and the Sales route
is registered and returns `401` without authentication. Authenticated Sales workflow,
concurrency, browser, and physical-device acceptance remain pending.

## Calendar And Attendance Implementation Status

On 2026-08-25, the Product Owner separately authorized the initial Wages calculation implementation. Wages preview and confirmation consume the internal derived Calendar/primary-period/Attendance read and no longer query legacy explicit Attendance records. The later Kharchi API source now allocates traceable deductions during confirmation, while runtime use awaits its migrations. Effective-dated wage-rate history remains an explicit completion gap.

The sequential Calendar and Attendance exception-model redesign is documented in `docs/tasks/calendar-attendance-exception-model-implementation-plan.md`.

Slices A0, A1, B, C, and C2 are complete. Mobile Attendance now separates period summary at `/(app)/attendance`, daily exception marking at `/(app)/attendance-mark`, and exact Worker history at `/(app)/worker-attendance`; Mobile Work Calendar remains a separate protected route. Derived Present, Full-day/Half-day exception-only writes, selected-Project context, `FlatList`, failed-input retention, permission states, and en/hi/gu remain intact. Slice D compatibility cleanup remains optional after client acceptance and requires separate authorization. Migration/seed execution, offline sync, and compatibility cleanup remain outside the Wages authorization.

Slice C2 passed 11-namespace en/hi/gu locale parity, shared build, Mobile type-check, Android Expo export, and `git diff --check`. The export produced one 3.89 MB Hermes bundle with the bundled Manrope, Noto Sans Devanagari, and Noto Sans Gujarati assets. Authenticated API mutation, emulator/physical-device behavior, screen reader, largest text, keyboard avoidance, touch-target measurement, rotation/tablet, and fluent Hindi/Gujarati acceptance remain unrun and must not be inferred from static evidence. Slice C2 changed no API, shared-contract source, database, migration, seed, dependency, Web, Work Calendar, Wages, offline-sync, or compatibility-cleanup behavior.

Slice B added canonical `/attendance` and `/work-calendar`, redirected the old Project Attendance route, removed deprecated Web Attendance calls, implemented exception and Calendar override management, and passed shared build, Web type-check, focused changed-file lint, Web production build, and `git diff --check`. Package-wide Web lint remains blocked by three inherited `react-hooks/set-state-in-effect` errors outside the new feature files. Authenticated browser verification and automated Web tests were not run.

The 2026-08-24 Web refinement made `/attendance` period-summary-only, added `/attendance/mark` for daily absence entry, added a Worker Attendance tab for exact dated absence details, and added the canonical worker-period read endpoint. Shared build, API type-check, all 18 API Jest suites/90 tests, Web type-check, focused Web lint, Web production build, and `git diff --check` passed. Runtime probes established route registration and HTTP availability only; authenticated absence mutation, responsive browser, and accessibility acceptance remain unrun. No Mobile source was changed by that refinement.

The weekly-pattern contract mismatch is resolved. Uppercase `WorkingWeek` keys are canonical in shared, API DTO validation, service, repository, Web, and Mobile. All seven Boolean weekday values are required, lowercase-only payloads are rejected, and Mobile offers explicit Sunday-off, no-fixed-off, and custom choices without assuming Sunday.

Slice A0 reconciled `MVP_REQUIREMENTS.md` section 12, the Attendance contract, the new separate Calendar contract, Workers allocation ownership, and the module index. No unresolved contradiction remains about derived Present, Calendar precedence, effective-dated primary Project ownership, offline exclusion, or Wages safety.

Slice A1 added shared Calendar/Attendance contracts and permissions, proposed migration `009_calendar_attendance_exception_model.sql` plus a read-only preflight, implemented Calendar APIs, effective-dated Workers primary-project periods, Attendance exception summary/CRUD/export and compatibility adapters, selected-date roster filtering, and the Wages calculation safety gate. Shared build, API type-check, all 16 API Jest suites (76 tests), and `git diff --check` passed.

The final Attendance summary contract has no separate Half Day count. `presentDays` and `absentDays` are decimal day equivalents: a Half Day contributes `0.5` to each, so their sum equals `expectedWorkingDays`. The stored `ABSENCE + HALF_DAY` exception and selected-date `HALF_DAY` display state remain unchanged.

Slice C verification passed for 11-namespace en/hi/gu locale parity, shared build, Mobile type-check, Android Expo export, and `git diff --check`. Local API health reported app/database `ok`, but no authenticated Attendance/Calendar integration test ran. Emulator, physical-device, screen-reader, large-text, keyboard, responsive/rotation, and fluent Hindi/Gujarati checks remain unrun. Slice C itself did not execute migration `009`, its preflight, or the seed; current database status must come from a fresh guarded status check rather than this historical evidence. The existing user-owned `pnpm-lock.yaml` modification remains untouched.

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

Run the complete current mobile localization acceptance matrix on an authenticated physical device in English, Hindi, and Gujarati. Cover every role-visible route, font shaping, persistence, long text/large text, screen-reader labels, and fluent construction-domain review.

Localization Slice 2 implemented:

1. `expo-localization`, `i18next`, `react-i18next`, and AsyncStorage setup;
2. bundled Manrope/Noto Sans Devanagari/Noto Sans Gujarati typography;
3. English/Hindi/Gujarati common, auth, navigation, and error resources;
4. pre-auth and Profile/Settings language selection;
5. static/persistence/font verification without migrating Projects, Members, Team, or Workers yet.

The existing authorization matrix remains required:

1. Organization Owner assigns CUSTOM Worker/Team grants to a Contractor Member.
2. Contractor can manage only the granted modules on assigned Projects.
3. Contractor cannot access an unassigned Project or exceed the role/delegation ceiling.
4. Platform Super Admin creates a temporary plan and validates active Project/Member capacity errors.
5. Builder Supervisor can read assigned Project oversight data but cannot perform Site Supervisor or final commercial actions.

## Approved Mobile Localization Slice 1

On 2026-08-19, the Product Owner approved the English, Hindi, and Gujarati mobile localization model and delegated the font choice.

Completed documentation scope:

- approved `docs/modules/foundation/localization/CONTRACTS.md`;
- added the review-gated domain glossary;
- added `docs/tasks/mobile-multilingual-implementation-plan.md`;
- selected Manrope for English, Noto Sans Devanagari for Hindi, and Noto Sans Gujarati for Gujarati;
- confirmed the current bundled Manrope files do not contain Devanagari or Gujarati glyphs;
- kept web localization, server preference persistence, RTL, offline business sync, and all database work out of scope.

No dependency, font asset, runtime source, API, schema, migration, seed, or database change was made in Slice 1.

## Mobile Localization Slice 2 Implementation

On 2026-08-19, the Product Owner approved the next slice. The mobile app now has:

- `expo-localization`, i18next/react-i18next, and AsyncStorage runtime integration;
- `system`, English, Hindi, and Gujarati preference resolution with English fallback;
- locally bundled Manrope, Noto Sans Devanagari, and Noto Sans Gujarati fonts;
- locale-aware text/input font aliases with platform fallback if custom font loading fails;
- typed common/auth/navigation/error resources and India-aware `Intl` formatters;
- localized bootstrap, Login, invitation activation, shared loading/actions/states, bottom navigation, and primary Menu copy;
- a language selector on Login/activation and in the authenticated Menu profile area;
- localized machine-code/status-based API recovery copy without displaying backend diagnostics as the primary error;
- a project-owned locale key and interpolation-placeholder validator.

Static verification passed for mobile/shared type-checks, locale parity, Expo supported-locale config resolution, scoped hard-coded pilot-copy review, the cached Expo web export, and `git diff --check`. Browser, emulator, physical-device shaping/persistence, screen reader, large-text, and fluent Hindi/Gujarati review remain pending.

No API, shared contract, database, migration, seed, web-localization, business-module, or offline-record-sync behavior changed in Slice 2.

## Mobile Localization Slice 3A — Home/Dashboard

On 2026-08-19, after testing Gujarati and reporting remaining English Home copy, the Product Owner approved the next single task. The mobile Home/dashboard now localizes:

- field-workspace and welcome copy;
- selected-Project context, switch action, access, status, Project scope, assignment state, and Project-count copy;
- working-site and Project-scope metric cards;
- main-navigation and workspace headings;
- the dashboard create-Project action, empty state, and related accessibility labels.

The selected-Project card allows translated labels to wrap so Gujarati/Hindi content is not forced into English-sized rows. Stable enum values are mapped to display keys, while Project, Organization, person, and role/responsibility names remain stored/displayed exactly as users entered them.

Add/Edit Project forms, Organization Members, Project Team, and Workers were deliberately excluded so each can remain a separate approved task. No API, shared contract, database, schema, migration, seed, web, or business behavior changed.

Static verification passed for locale key/placeholder parity, mobile/shared type-checks, Expo web export with all eight Noto font files, scoped hard-coded Home-copy review, and `git diff --check`. Physical-device layout/font shaping, screen-reader, large-text, and fluent Hindi/Gujarati review remain pending.

## Mobile Localization Slice 3B — Projects

After the Home handoff, the Product Owner confirmed that Project screens, the Add/Edit Project form, Team/Assign, and Add Worker were still English. Projects was selected as the next single task.

Implemented Projects scope:

- localized Project Detail heading, status, actions, Organization/access summary, empty state, alert, and accessibility copy;
- localized Add/Edit Project headings, sections, visible labels, helper text, buttons, validation/recovery messages, and accessibility labels;
- translated display labels for Project types/statuses, Project access scope, and Organization type while retaining their stable API values;
- locale-aware typography in the shared modal, compact header, quick action, and operational entity card used by this flow;
- wrapping form rows and type/status choices for longer Hindi/Gujarati text.

User-entered Project names, codes, addresses, descriptions, Organization names, and custom role/responsibility labels remain unchanged and may be entered in English, Hindi, Gujarati, or a mixture supported by the keyboard. No API, shared contract, database, schema, migration, seed, web, or business behavior changed.

Project Team/Assign and Workers/Add Worker remain deliberately excluded as the next separate tasks. Six-namespace locale parity, mobile/shared type-checks, scoped hard-coded Project-copy review, Expo web export with one entry bundle and all eight Noto font files, and `git diff --check` passed. Authenticated physical-device layout/font shaping, screen-reader, large-text, and fluent Hindi/Gujarati review remain pending.

## Mobile Localization Slice 3C — Current Customer Surface Completion

After the Product Owner clarified that the entire discussed mobile app must be multilingual without reporting each remaining English string separately, the completion scope was expanded to every current Expo customer flow.

Implemented:

- Organization Members listing, capacity, search, invite/edit access, delivery states, activation/deactivation, and multi-Project assignment;
- Project Team listing, member picker, Assign/Edit Member sheet, assignment dates/status/responsibility, role-default/custom permission grants, presets, warnings, and unassign confirmation;
- Workers roster, assignment states/filters, Assign/Edit/End sheets, Add Worker form, duplicate handling, trade suggestions, rates/dates, validation, and recovery copy;
- shared required/optional field labels, collection picker, sync/offline and progress copy, tabs, headers, links, cards, buttons, and localized typography;
- related accessibility labels and stable enum/permission display mappings.

User-entered business values remain exactly as typed and may be English, Hindi, Gujarati, or mixed-script. System values remain stable in API/database contracts and are translated only for display. No API, shared contract, schema, migration, seed, database, web-localization, or business authorization behavior changed.

All nine namespaces passed English/Hindi/Gujarati key and placeholder parity. Mobile and shared type-checks passed. The mobile literal audit found no remaining hard-coded user-facing English phrases outside locale resources; the remaining English literals are internal provider guards or the `NirmanSite` brand. Expo web export passed with one entry bundle and all eight Noto font files, and `git diff --check` passed. Authenticated physical-device, screen-reader, large-text, and fluent Hindi/Gujarati review remain pending.
