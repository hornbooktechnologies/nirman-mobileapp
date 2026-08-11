# NirmanSite MVP Implementation Phases

> Document type: MVP implementation phase plan
>
> Source of truth: `MVP_REQUIREMENTS.md`
>
> Status: Draft for product-owner review
>
> Last updated: 2026-07-28

---

## 1. Purpose

This document converts the approved MVP requirements baseline into a careful implementation sequence.

The plan is written for the current repository state:

- `apps/api` already has NestJS foundation modules for auth, users, roles, settings, upload, mysql2 database access, and health/app basics.
- `apps/web` already has the Next.js back-office foundation for login, dashboard, users, roles, settings, and profile.
- `apps/mobile` already exists as an Expo / React Native foundation with auth and protected route groups, placeholder login/dashboard, API helpers, secure storage helpers, and early mobile UI primitives.
- `packages/database` is archived inherited Prisma history. Active database access and seed tooling live in `apps/api`.
- `packages/shared` currently contains foundation permission constants, schemas/types placeholders, and shared theme tokens.

The plan must not be implemented blindly. Each phase has gates, open decisions, edge cases, and verification expectations.

---

## 2. Planning Principles

1. Build vertical slices, not all backend first or all screens first.
2. Define shared contracts before API, web, or mobile implementation.
3. Add database models only after data ownership, tenant isolation, project scope, and migration impact are approved.
4. Keep mobile as the primary customer product.
5. Keep web as supporting administration, import, review, reporting, and corrective operations.
6. Keep business rules in the API and shared contracts, not duplicated in web or mobile screens.
7. Keep React web and React Native UI components separate.
8. Use RBAC plus project assignment checks for every project-scoped record.
9. Treat offline sync as a product and architecture feature, not a small UI enhancement.
10. Do not introduce fake approvals when the same person owns the whole workflow.

---

## 3. Current Documentation Conflicts To Resolve First

Before implementation phases begin, update or supersede stale planning notes.

Known conflicts:

- `CODEX.md` still says not to create `apps/mobile`; this is stale because the mobile foundation exists and was approved.
- `docs/decisions/003-nirmansite-product-direction.md` still calls mobile a future app; this is stale.
- `docs/ai-context/00-project-mission.md` and `docs/ai-context/01-product-vision.md` still lean toward web/back-office as the main builder product; `MVP_REQUIREMENTS.md` now establishes mobile as the main customer product.
- `docs/architecture/auth-rbac.md` uses `resource:action` permission format, while `MVP_REQUIREMENTS.md` lists dot-style examples such as `attendance.mark`. This must be decided before product permission constants are added.
- `docs/architecture/domain-model.md` reflects an older real-estate-heavy model and does not yet include the full MVP construction operations model: workers, attendance, wages, Kharchi, materials, expenses, gallery, offline sync, and operating profiles.
- `docs/tasks/current-task.md` still describes the completed mobile foundation task rather than the new MVP phase-planning task.
- `docs/templates/module-contract-template.md` and `docs/templates/api-contract-template.md` are too small for the MVP process.

Gate:

- Product owner approves whether to update these docs as part of Phase 0 or keep them as historical documents with clear superseded notes.

---

## 4. Required Template Upgrades

Upgrade templates before writing module contracts.

### 4.1 Module contract template must include

- Purpose and business outcome.
- Actors and operating models.
- Web responsibilities.
- Mobile responsibilities.
- Data ownership and project scope.
- Statuses and transitions.
- Permissions and visibility.
- API endpoints.
- Request and response schemas.
- Validation rules.
- Stable error codes.
- Loading, empty, error, forbidden, success, and offline states.
- Audit events.
- Notification events.
- Idempotency requirements.
- Offline and conflict behavior.
- Acceptance criteria.
- Test matrix.
- Open decisions and explicit exclusions.

### 4.2 API contract template must include

- Endpoint and method.
- Auth requirement.
- Organisation and project access check.
- Permission key.
- Idempotency key requirement.
- Request params, query, body, and files.
- Success response envelope.
- Error response envelope.
- Pagination style.
- Audit behavior.
- Notification behavior.
- Offline sync behavior where relevant.
- Concurrency or transaction requirements.
- Test cases.

### 4.3 Database change template must include

- Tenant boundary.
- Project scope.
- Ownership and lifecycle.
- Unique constraints.
- Indexes.
- Delete/archive behavior.
- Audit columns.
- Sync metadata.
- Migration and seed strategy.
- Backfill requirements.
- Rollback notes.

---

## 5. Phase 0 - Alignment, Cleanup, And Contract Foundation

Goal:

Prepare the repository and docs so all later modules follow one implementation language.

Scope:

- Update stale documentation listed in section 3 after approval.
- Upgrade templates listed in section 4.
- Create or update module documentation folders for MVP areas.
- Decide permission key format before adding product permissions.
- Decide package strategy: keep `packages/shared` as contracts, or introduce `packages/contracts` as suggested by `MVP_REQUIREMENTS.md`.
- Define the MVP API envelope, error code naming, pagination conventions, and idempotency header.
- Define the audit event naming convention.
- Define notification type naming convention.
- Define status enum naming convention.
- Define shared module folder conventions for API, web, and mobile.

Implementation changes:

- Documentation only unless the product owner explicitly approves shared package scaffolding.

Edge cases to resolve:

- Current database has global roles tied directly to users. MVP needs organisation membership and project assignments.
- Current permissions use `resource:action`; MVP examples use dot notation.
- Current mobile auth is placeholder only.
- Current web refresh uses HTTP-only cookie behavior; mobile likely needs secure refresh token storage.

Exit criteria:

- Updated docs clearly state that `MVP_REQUIREMENTS.md` is the current authority.
- Templates are detailed enough for vertical-slice contracts.
- Product owner has answered the Phase 0 decision questions.

Questions for approval:

1. Should product permission keys use `resource:action` to match existing code, or dot notation like `attendance.mark` to match the MVP document?
2. Should we create a new `packages/contracts` package, or keep contracts inside `packages/shared` for the MVP?
3. Should stale docs be edited now, or should they receive a short "superseded by MVP_REQUIREMENTS.md" note?

---

## 6. Phase 1 - Identity, Organisation, RBAC, And Project Access Foundation

Goal:

Create the tenant and project access foundation required by every MVP module.

Why first:

Almost every MVP record is project-scoped. Building workers, attendance, sales, or expenses before tenant/project access would create migrations and APIs that need rework.

Scope:

- Organisation model.
- Organisation membership model.
- Operating profile model or setting.
- Role templates and additional permission grants.
- Project model.
- Project assignment model.
- Active organisation and project scope resolution in login response.
- Backend guards/helpers for:
  - authenticated user;
  - active organisation membership;
  - required permission;
  - project assignment or organisation-wide scope;
  - record belongs to same organisation/project.
- Web organisation/project administration basics.
- Mobile login/session integration enough to receive permissions and project assignments.

Likely database models:

- `Organization`
- `OrganizationMember`
- `OrganizationRole` or role templates adjusted for organisation scope
- `Project`
- `ProjectMember`
- Optional `OrganizationPermissionGrant` and `ProjectPermissionGrant`

Contract work:

- Auth/session contract.
- Organisation onboarding contract.
- Membership contract.
- Project contract.
- Project assignment contract.
- Permission resolution contract.

Web responsibilities:

- Organisation settings.
- Member invite/manage.
- Role and permission management.
- Project create/edit/archive.
- Project member assignment.

Mobile responsibilities:

- Login.
- Active organisation/project selection.
- Permission-aware home.
- Project switcher.
- Profile/session/logout.

Edge cases:

- One user may belong to multiple organisations later.
- Owner must not be locked out by permission edits.
- Existing global `User.roleId` must be migrated carefully instead of removed abruptly.
- Project-scoped users must not access other projects by changing IDs.
- Deactivated member should lose access even if the `User` remains active elsewhere.
- Multi-project users need a clear current project context in mobile.
- Refresh tokens must reflect permission changes within an approved interval.

Exit criteria:

- Tenant and project isolation tests pass.
- Login response initializes web and mobile navigation without UI guessing.
- Owner/admin/project member access paths are verified.

Approval gate:

- Do not start construction or sales modules until this phase passes.

---

## 7. Phase 2 - Mobile And Web UI Foundation For MVP Workflows

Goal:

Build the reusable design-system and UI foundations before business screens multiply.

This phase must happen before repeated NirmanSite / BuilderSaaS business pages and screens are created. The goal is not to design random pages directly. The goal is to create a theme-based architecture that lets web admin and mobile app screens share one visual language while using platform-specific components.

Scope:

- Finalize semantic tokens in `packages/shared` for:
  - colors;
  - fonts and typography;
  - spacing;
  - border radius;
  - shadows;
  - status colors;
  - surface and background colors;
  - button sizes;
  - card styles;
  - form field styles;
  - layout spacing;
  - icon sizes.
- Reconcile the current NirmanSite sage/olive/copper token direction with the BuilderSaaS design brief direction:
  - warm background;
  - blueprint-inspired surfaces;
  - dark coffee typography;
  - construction-orange CTA and active states;
  - yellow, green, and purple status accents.
- Map tokens separately in web and mobile.
- Keep token names semantic so future color, radius, typography, or shadow changes update the app globally.
- Build missing mobile primitives:
  - screen;
  - button;
  - icon button;
  - input;
  - card;
  - badge/status badge;
  - chip;
  - list item;
  - section header;
  - header;
  - bottom tabs;
  - floating action button;
  - toggle;
  - empty/loading/error/forbidden states;
  - form field;
  - action sheet or bottom sheet;
  - modal;
  - offline banner;
  - sync status;
  - worker card;
  - project card;
  - approval card.
- Build or harden web primitives:
  - button;
  - icon button;
  - card;
  - input;
  - select;
  - textarea;
  - checkbox;
  - radio;
  - badge/status badge;
  - modal;
  - drawer;
  - tabs;
  - table;
  - data table;
  - page header;
  - section header;
  - form layout;
  - filter bar;
  - stats card;
  - dashboard card;
  - empty/loading/error/forbidden states;
  - confirm dialog.
- Create permission-aware navigation shell patterns for both apps.
- Validate with two representative flows:
  - Authentication/Profile;
  - Project switcher and dashboard shell.

Visual direction:

- Use the uploaded smart-home mobile references for soft cards, premium spacing, rounded glass-like panels, floating navigation, calm hierarchy, and strong selected states.
- Do not copy smart-home content, device controls, or exact feature structure.
- Adapt the style into construction ERP workflows: projects, workers, attendance, wages, Kharchi, materials, expenses, gallery, approvals, units, agencies, invoices, notifications, and dashboard.
- Keep the product feeling premium, bold, modern, warm, human, reliable, professional, field-friendly, and readable.
- Avoid old ERP density and Excel-style heavy interfaces.

Edge cases:

- Mobile must be readable in field conditions with large touch targets.
- Web can use tables for back-office work but should not become dense ERP-first.
- Screen states must not be added per module inconsistently.
- Do not share React components across web and mobile.
- Do not create module screens with copied one-off styles.
- Do not hardcode raw colors in screens or pages.
- Web and mobile must share design tokens but keep platform-specific component implementations.
- Offline and sync UI states must be designed as reusable components before offline-capable modules depend on them.

Exit criteria:

- Component foundations type-check.
- Representative screens prove responsive/mobile usability.
- No raw product colors appear in business screens.
- Web admin and mobile app both consume shared semantic tokens.
- Web reusable UI components exist for common admin workflows.
- Mobile reusable UI components exist for field workflows.
- A design-system review confirms the BuilderSaaS/NirmanSite palette direction is reconciled into semantic tokens.
- The smart-home reference style has been adapted to construction ERP workflows, not copied directly.

---

## 8. Phase 3 - Audit, Files, Notifications, And Sync Architecture Foundation

Goal:

Create cross-cutting infrastructure before modules depend on it.

Scope:

- Audit event contract and audit write helper.
- File/media ownership and access-control contract.
- Notification record contract and basic in-app notification APIs.
- Offline sync architecture decision for Expo.
- Idempotency mechanism for mobile/offline and financial writes.
- API error code and conflict response behavior.

Implementation depth:

- Audit foundation should be implemented early.
- File upload foundation already exists but must be tenant/project-aware before gallery or evidence uploads use it.
- Notifications can begin with in-app records before push delivery.
- Offline sync should be designed and approved here; implementation can start with one pilot module in Phase 4.

Edge cases:

- Deep links must re-check permissions.
- File metadata can queue offline, but binary upload may need retry.
- Duplicate offline create must not duplicate server records.
- Financial and approval writes must never use blind last-write-wins.
- Audit records should redact sensitive values.

Exit criteria:

- Audit, file, notification, idempotency, and sync contracts are approved.
- At least one backend helper exists for idempotent write handling before offline-capable module work begins.

Questions for approval:

1. Which Expo-compatible local database/sync library should be used?
2. Which object storage provider should be used for MVP uploads?
3. Should push notifications be part of first MVP release, or should in-app notifications ship first?

---

## 9. Phase 4 - Construction Operations Slice 1: Workers, Attendance, And Kharchi

Goal:

Deliver the first mobile-first daily site workflow.

Why this slice:

Workers, attendance, and Kharchi are high-frequency field operations and validate project scope, permissions, offline entry, audit, mobile UX, and web oversight.

Scope:

- Worker master and project assignment.
- Attendance marking and correction.
- Kharchi creation, approval where needed, payment/deduction rules.
- Mobile worker list.
- Mobile attendance entry.
- Mobile quick Kharchi.
- Web worker management and attendance/Kharchi review.
- Audit events.
- Offline queue for attendance and Kharchi creation if approved.

Key contracts:

- Worker contract.
- Worker project assignment contract.
- Attendance contract.
- Kharchi contract.
- Offline sync contract for these entities.

Edge cases:

- Worker is not an app user.
- Similar worker names/mobile numbers need duplicate warnings.
- Worker with financial history must not be hard deleted.
- Attendance unique key: project + worker assignment + date.
- Attendance correction after lock requires stronger permission.
- Kharchi cannot be paid/deducted twice.
- Independent Contractor may record direct Kharchi without Builder approval.
- Contractor under Builder may need approval depending on operating profile.
- Offline attendance sync must prevent duplicate records.

Exit criteria:

- Field user can manage workers, mark attendance, and record Kharchi for assigned project.
- Web user can review/correct according to permissions.
- Tenant/project isolation and offline/idempotency tests pass.

---

## 10. Phase 5 - Construction Operations Slice 2: Wages, Materials, And Expenses

Goal:

Add financial and approval-heavy construction workflows.

Scope:

- Wage generation from attendance.
- Wage payment marking.
- Material request, approval, purchase, and delivery.
- Site expense creation and approval.
- Mobile material/expense entry.
- Web approval, review, reporting, and corrections.
- Audit and notifications.

Edge cases:

- Wage generation must not duplicate wage lines.
- Partial wage payment support is an open decision.
- Holiday wage default is an open decision.
- Material approval path depends on operating model.
- Independent Contractor flow should not force Builder approval.
- Contractor under Builder flow may require Builder approval before purchase.
- Purchase cost in MVP is an open decision.
- Expense edits after approval must be controlled and audited.
- Financial writes must be transactional and idempotent.

Exit criteria:

- Operating-model-specific approval paths are verified.
- Financial records cannot be silently overwritten.
- Reports can use stable data without recalculating from fragile UI state.

---

## 11. Phase 6 - Construction Operations Slice 3: Progress, Gallery, And Project Diary

Goal:

Capture site progress and evidence in a mobile-friendly way.

Scope:

- Progress update contract.
- Gallery/project diary media contract.
- Mobile progress capture.
- Mobile photo/evidence queue.
- Web progress and gallery review.
- Optional approval for gallery/progress depending on permission profile.
- Notifications for approval results.

Edge cases:

- Media upload can fail after metadata is created.
- Offline media should retry without duplicating gallery entries.
- Large image compression and size validation are required.
- Progress stages fixed vs project-configurable is an open decision.
- Gallery approval should not expose forbidden media through stale links.

Exit criteria:

- Site users can submit progress/evidence.
- Web users can review by project.
- Audit and media access controls are verified.

---

## 12. Phase 7 - Sales Slice 1: Leads, Assignment, Follow-ups, And Timeline

Goal:

Deliver the first sales workflow while respecting project scope and salesperson visibility.

Scope:

- Lead creation.
- Lead source.
- Current assignee and creator.
- Sales pipeline stage.
- Customer requirements.
- Lead assignment/reassignment.
- Follow-ups and reminders.
- Activity timeline.
- Mobile sales dashboard basics.
- Web sales oversight.

Edge cases:

- Sales user may view own, team, or all leads depending on permission.
- Reassignment must preserve creator and previous owner history.
- Follow-up duplicate prevention or warning must be defined.
- Overdue reminders must be repeat-safe.
- Lead project scope must be enforced.

Exit criteria:

- Sales user can manage assigned leads and follow-ups.
- Builder can see builder-wide sales visibility where permitted.
- Activity timeline is audit-friendly.

---

## 13. Phase 8 - Sales Slice 2: Site Visits, Unit Inventory, Unit Blocking, And Booking

Goal:

Add conversion-critical sales workflows without implementing commission calculation.

Scope:

- Site visit scheduling and completion.
- Unit inventory setup and availability.
- Unit blocking.
- Booking/conversion.
- Builder visibility into conversions.
- Web bulk unit import.
- Salesperson performance summary.

Edge cases:

- Unit blocking requires online connectivity.
- Only one active block per unit.
- Booking must update lead and unit state in one transaction.
- Block expiry must be repeat-safe.
- Booking cancellation must explicitly restore or choose unit status.
- Commission calculation is deferred, but converted_by, booking date, project, unit, booking amount, and lead source must be captured.

Exit criteria:

- Double-block prevention is tested.
- Lead, booking, and unit states stay consistent.
- Conversion data is ready for future incentives.

---

## 14. Phase 9 - Dashboards, Reports, Exports, And Web Back-Office Completion

Goal:

Turn captured operational data into useful oversight.

Scope:

- Role-specific mobile dashboards.
- Web cross-project dashboard.
- Attendance, wage, Kharchi, expense, material, progress, lead, follow-up, salesperson, and inventory reports.
- CSV exports.
- Web corrective operations where approved.
- Audit log review.

Edge cases:

- Dashboard payload must be permission-specific.
- Users must not see inaccessible project totals through aggregate queries.
- Reports must be project- and organisation-scoped.
- Exports must enforce the same access checks as UI.
- Heavy dashboards need aggregate endpoints or safe caching.

Exit criteria:

- Owners/Admins get useful oversight without bypassing access rules.
- Export and dashboard authorization tests pass.

---

## 15. Phase 10 - Super Admin, Subscriptions, Hardening, And Release Readiness

Goal:

Prepare the MVP for controlled rollout.

Scope:

- Platform Super Admin.
- Organisation activation/suspension.
- Plans/subscription assignment.
- User and usage limits.
- Feature flags if approved.
- Support access with strict audit.
- Security hardening.
- End-to-end testing.
- Deployment and monitoring checks.

Edge cases:

- Suspended organisation must block access consistently.
- Support access must be audited and scoped.
- Subscription limits must not corrupt existing data.
- Feature flags must not expose routes without backend permission enforcement.
- Logs must redact sensitive values.

Exit criteria:

- MVP can be deployed and operated with clear support/admin controls.
- Critical tenant, project, role, offline, financial, and sales scenarios pass.

---

## 16. Cross-Phase Verification Baseline

Every implementation phase should include:

- shared contract type-check;
- SQL migration/seed verification after schema changes;
- API unit/integration tests for business rules;
- API authorization tests;
- tenant isolation tests;
- project isolation tests;
- web type-check and focused UI inspection;
- mobile type-check and device/Expo verification where mobile changed;
- `git diff --check`;
- documentation update for verified behavior.

Broader checks:

```bash
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/mobile type-check
```

Run full lint/test/build once the phase is stable or before release checkpoints.

---

## 17. Product Owner Decisions Needed Before Phase 1 Implementation

These questions should be answered before writing product schema or code:

1. Authentication: OTP-first, email/password-first, or both for MVP?
2. Permission key format: keep `resource:action`, move to dot notation, or support a migration bridge?
3. Package structure: keep contracts in `packages/shared`, or create `packages/contracts`?
4. Organisation membership: can one user belong to multiple organisations in MVP?
5. Builder and external Contractor relationship: invite external Contractor organisations in MVP, or only create Contractor members inside Builder organisations?
6. Wage payments: full payment only or partial payments in MVP?
7. Holiday wage default: unpaid, paid full, or configurable?
8. Materials: should purchase cost be captured in MVP?
9. Progress stages: fixed MVP stages or project-configurable?
10. Notifications: in-app only first, or push notifications in MVP?
11. Unit block expiry: fixed 24 hours or configurable by organisation/project?
12. Public inquiries: should a public website inquiry endpoint be included in first MVP release?
13. Worker import: required for MVP or optional after launch?
14. Object storage provider for files/media.
15. Expo offline database/sync library.
16. Subscription billing: manual plan assignment only, or real billing integration later?

---

## 18. Recommended Immediate Next Step

Start with Phase 0 as a documentation and contract-foundation task.

Recommended Phase 0 deliverables:

1. Update stale docs or mark them superseded.
2. Upgrade `docs/templates/module-contract-template.md`.
3. Upgrade `docs/templates/api-contract-template.md`.
4. Upgrade `docs/templates/db-change-template.md`.
5. Create `docs/modules/foundation/identity-access/REQUIREMENTS.md`.
6. Create `docs/modules/foundation/identity-access/CONTRACTS.md`.
7. Create `docs/modules/foundation/identity-access/DATA_MODEL.md`.
8. Create `docs/modules/foundation/identity-access/PERMISSIONS.md`.
9. Create `docs/modules/foundation/identity-access/TEST_PLAN.md`.

Do not start Phase 1 implementation until the Phase 0 decisions are approved.
