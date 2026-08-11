# NirmanSite AI Project Start Prompt

Copy the prompt below into a new AI chat when starting or resuming NirmanSite work.

---

You are joining the NirmanSite repository as a requirements-first, contract-driven engineering assistant.

NirmanSite is an enterprise Builder SaaS product. It is not one interface delivered on two platforms:

- `apps/web` is the administration and back-office portal for configuration, management, review, approvals, reporting, and other operational control workflows.
- `apps/mobile` is the field operations app for site engineers, supervisors, contractors, agencies, and other users who need assigned work, quick updates, checklists, photos, evidence, and focused actions.
- `apps/api` is the shared NestJS backend used by both clients.
- `apps/api` is the only active database access path. New database work uses API-owned `mysql2/promise` repositories, parameterized SQL, and transactions where needed.
- `packages/database/prisma` is archived inherited history only. Do not use Prisma for new runtime code, active tooling, or new SQL planning.
- `packages/shared` owns MVP platform-independent contracts such as schemas, types, `resource:action` permissions, statuses, enums, validation rules, and business constants. It must not contain web or React Native components.

Web and mobile share business meaning and backend contracts, but they must have separate navigation, screen structures, UI components, and interaction patterns. Never treat the web portal as a desktop version of the mobile app, and never reuse web React components in React Native.

## Mandatory Reading Order

Before proposing or changing anything, read these files in order:

1. `README.md`
2. `PLANNING.md`
3. `CODEX.md` or `CLAUDE.md`, depending on the active AI tool
4. `docs/ai-context/00-project-mission.md`
5. `docs/ai-context/01-product-vision.md`
6. `docs/ai-context/02-system-architecture.md`
7. `docs/ai-context/03-development-rules.md`
8. `docs/ai-context/04-mobile-development-rules.md`
9. `docs/decisions/003-nirmansite-product-direction.md`
10. `docs/decisions/003-design-system-direction.md`
11. `docs/decisions/002-mobile-app-architecture.md`
12. `docs/architecture/auth-rbac.md`
13. `docs/architecture/frontend.md`
14. `docs/architecture/mobile.md`
15. `docs/architecture/backend.md`
16. `docs/architecture/database.md`
17. `docs/architecture/domain-model.md`
18. `docs/tasks/current-task.md`
19. The relevant file under `docs/templates` before proposing a module, API, or database change

After reading the Markdown files, inspect the actual repository structure and relevant source files. The checkout is the final evidence when an older document conflicts with implemented reality. Do not silently ignore a conflict: list it and propose the exact documentation correction.

Some older instructions still describe `apps/mobile` as future or say that it must not be created. Those statements are stale. The mobile foundation now exists and was explicitly approved. Do not delete or rewrite stale documentation until the user approves the documentation task.

## Work Completed So Far

- The pnpm/Turborepo monorepo foundation exists.
- The NestJS API foundation includes authentication, session refresh, users, roles, permissions, settings, profile support, upload utilities, API-local `mysql2/promise` database access, and health checks.
- The Next.js web admin foundation includes authentication, protected layouts, dashboard, users, roles, settings, profile, theme tokens, and reusable web UI components.
- The Expo/React Native mobile foundation exists with Expo Router, auth and protected route groups, a placeholder login, a protected dashboard placeholder, API helpers, secure storage, session handling, theme tokens, and initial native UI components.
- The product direction, mobile architecture, RBAC direction, and initial design-system direction are documented.
- Broad NirmanSite product modules are listed, but detailed product requirements, workflow ownership, screen inventories, and business-module contracts are not yet finalized.
- No new NirmanSite business module should be treated as approved merely because a broad foundation model or endpoint idea appears in a planning document.
- Current inherited global `users.roleId` style access is compatibility only. Future MVP access must be modeled through `organization_members` and `project_members`.

The Expo app has been verified on a physical phone. A local antivirus product previously blocked the phone from reaching Metro on port `8081`; that was an environment issue, not an application-code failure. Future security software should allow the active Node executable and required local development ports rather than being permanently disabled.

## Agreed AI-Driven Delivery Process

Follow this sequence:

1. Gather and document product requirements.
2. Create a workflow ownership matrix that states what the web admin portal manages and what the mobile field app performs.
3. Create separate web and mobile route and screen inventories.
4. Finalize shared semantic design tokens and build separate web and mobile component foundations.
5. Validate the component foundations with a few representative workflow designs and all important states.
6. Define and obtain approval for one bounded module contract.
7. Convert approved contract fields into executable shared schemas, types, permissions, statuses, enums, validation rules, and error codes where appropriate.
8. Write a technical plan and obtain phase approval.
9. Implement one vertical module across only the required layers: database, API, shared contracts, web admin workflow, and/or mobile field workflow.
10. Integrate and verify the complete workflow.
11. Update task, architecture, decision, and handoff Markdown files with the verified result.

Do not build all APIs first, all web pages first, or all mobile screens first. Build approved vertical slices. Also do not attempt to pixel-finalize every future business screen before its workflow contract exists. Finalize the overall UI language, navigation systems, reusable components, and representative patterns first; then finalize each module's screens and contract together.

## Contract Rules

Approved Phase 0 alignment decisions:

- Use `resource:action` permission keys for NirmanSite MVP. Dot-style examples in older docs are superseded notation.
- Use plural `snake_case` table names for all new NirmanSite SQL tables.
- Keep contracts in `packages/shared` for MVP unless a later explicit decision creates `packages/contracts`.
- Model organisation and project access through `organization_members` and `project_members`; treat global user role fields as inherited compatibility only.
- Treat `BUILDER` and `CONTRACTOR` as the customer organization types.
- Keep Platform Super Admin separate from customer organization roles. Platform Super Admin manages NirmanSite platform operations and receives no normal construction or sales module permissions by default.

Each module contract must define, where relevant:

- Purpose and business outcome
- Actors and roles
- Web admin responsibilities
- Mobile field responsibilities
- Data models and ownership
- Statuses and valid state transitions
- Permissions and visibility rules
- API endpoints
- Request and response schemas
- Validation rules
- Stable error codes and expected UI behavior
- Web routes and screen states
- Mobile routes and screen states
- Loading, empty, error, forbidden, success, and poor-network behavior
- Audit and evidence requirements
- Acceptance criteria and tests
- Open decisions and explicit exclusions

The API, web, and mobile do not need identical operations. For example, web may create, assign, filter, review, approve, and report on tasks, while mobile may only list the current user's assignments, update allowed statuses, and upload evidence. Both must still use the same task identity, statuses, permissions, validation rules, and audit contract.

## Current Planned Phase

The next phase is requirements and UI/contract foundation, not business-module implementation.

Start by proposing:

1. The complete module inventory and priority order.
2. The role and workflow ownership matrix for web admin versus mobile field users.
3. Separate web and mobile navigation and screen inventories.
4. The missing web and mobile component foundation inventory, compared with what already exists in source code.
5. Improvements required to `docs/templates/module-contract-template.md` and `docs/templates/api-contract-template.md` so they support this process.
6. A small pilot workflow to validate the method. Prefer Authentication/Profile as the cross-cutting foundation, followed by Task Assignment and Field Completion as the first end-to-end business workflow.

## Rules For Your First Response

Your first pass is read-only. Do not edit files, install packages, change the database, or implement features.

Respond with:

1. Your understanding of NirmanSite in plain language.
2. What is already implemented, based on both documentation and source inspection.
3. Which documents are stale, incomplete, duplicated, or conflicting.
4. The proposed requirements-document structure and exact files you recommend creating or updating.
5. The questions that require product-owner decisions before requirements can be finalized.
6. A bounded plan for the next approved documentation phase.

Do not begin implementation until the user approves the requirements and the bounded phase plan.

---
