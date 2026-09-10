---
name: nirmansite-module-development
description: Use this skill whenever the user asks to understand, plan, build, continue, verify, or hand off a NirmanSite/BuilderSaaS module. It must acquire current repository context, audit actual source before trusting status docs, analyze cross-module dependencies, follow the repo's contract-driven workflow, respect explicit implementation and database gates, keep documentation synchronized, and produce clean API-to-Mobile/Web handoffs.
---

# NirmanSite Module Development

Use this skill for any NirmanSite/BuilderSaaS module work, including requests such as:
- understand or plan a module
- build or continue a module
- start API code
- prepare or run migration work
- integrate API into Mobile or Web
- verify a module
- create a handoff prompt
- review remaining implementation

Keep discussion compact unless the user asks for detail.

## Core operating rule

**Audit first. Design second. Implement third.**

Never assume a module's state from `MODULE_INDEX.md`, `current-task.md`, a previous chat message, or an older plan alone.

Before planning or modifying a module, re-check the actual repository source, relevant contracts, migrations, tests, git status, and current module documentation.

Classify important findings as:
- `EXISTING`
- `NEEDS_CHANGE`
- `MISSING`
- `DEFERRED`
- `CONFLICT`

Never plan an existing component as new.

## Companion Skill Usage

### UI / UX Work

Whenever implementing or materially modifying Web or Mobile UI:

- Use the `ui-ux-pro-max` skill for UI/UX design guidance.
- Follow the existing NirmanSite design system, theme tokens, navigation, reusable components, localization, and accessibility rules.
- The UI skill may improve layout, usability, visual hierarchy, interactions, and component composition.
- It must NOT override module contracts, business rules, permissions, workflows, API contracts, or established navigation requirements.

If `ui-ux-pro-max` is unavailable, continue using the repository's existing design-system documentation and components, and report that the companion skill was unavailable.

## UI / UX Design Principles

For all Web and Mobile UI work:

- Follow established UI/UX best practices and modern design principles.
- Aim for a modern, premium, clean, and professional visual experience.
- Before creating or modifying a screen, inspect existing NirmanSite screens and reusable UI components to maintain consistency.
- Reuse existing design patterns, components, spacing, typography, colors, cards, forms, buttons, navigation, and interaction behavior wherever appropriate.
- Use available screen space efficiently without making the interface feel crowded.
- Maintain strong readability through clear visual hierarchy, appropriate typography, spacing, contrast, and content grouping.
- Keep layouts simple and intuitive, especially for non-technical and field users.
- Avoid unnecessary visual complexity, oversized empty areas, dense tables, or inconsistent component styles.
- Prioritize usability, touch accessibility, responsiveness, and one-handed mobile usage where relevant.
- UI improvements must not change approved business workflows, permissions, navigation structure, or module behavior unless explicitly requested.

## 1. Context acquisition

At the start of a fresh chat or when repository context is stale, inspect the repository before discussing implementation.

Always inspect, when present:
- `MVP_REQUIREMENTS.md`
- `CODEX.md`
- `docs/ai-development/`
- `docs/modules/MODULE_CONTRACT_STANDARD.md`
- `docs/modules/MODULE_INDEX.md`
- `docs/tasks/current-task.md`
- `docs/tasks/PROGRESS_LEDGER.md`
- approved `docs/decisions/`
- relevant `docs/architecture/`
- relevant `docs/ai-context/`
- `packages/shared/`
- API database/migration structure
- current `git status`

Also inspect actual source for the requested module across API, Web, Mobile, shared packages, migrations, tests, and docs.

Do not repeatedly reread the whole repository in the same chat unless context may have changed. Re-audit the requested module before each new planning or implementation phase.

## 2. Source-of-truth behavior

Use this practical hierarchy:

1. Current executable source, migrations, manifests, tests, and fresh runtime evidence establish **what currently exists**.
2. `MVP_REQUIREMENTS.md` establishes product intent unless explicitly superseded.
3. Approved later decision records establish approved supersessions.
4. Approved module/foundation contracts establish module behavior.
5. Shared constants/types establish executable vocabulary.
6. Current module review/status/task/progress docs establish recorded implementation state.
7. Current technical plans and architecture docs guide implementation structure.
8. Historical planning/audits/snapshots are context only.

Do not silently resolve a conflict involving:
- tenancy
- RBAC/access control
- financial calculations or money movement
- approval workflow
- destructive lifecycle behavior
- audit integrity
- data ownership
- irreversible database behavior

Report the conflict compactly and stop for owner input.

## 3. Module audit before planning

When the user says something like "understand the Materials module" or "plan Attendance", first produce a compact audit.

Inspect:
- module requirements in MVP
- approved decisions
- module contract/decisions/status/review/plan
- shared permissions/statuses/types/errors
- migrations and schema changes
- API module/controllers/services/repositories/DTOs/tests
- Web implementation if applicable
- Mobile implementation if applicable
- git status/uncommitted work
- dependent modules and shared foundations

Return only the useful summary:

### Current state
- what exists
- what is partial
- what is missing
- important documentation drift

### Dependencies
Separate into:
- Mandatory now
- Required for full MVP acceptance
- Future integration
- No direct dependency

### Decisions/blockers
Only list decisions that truly require owner input.

Do not invent a new workflow if an approved workflow already exists.

## 4. Interconnectivity analysis

Treat every module as part of the whole application.

Check whether the module touches:
- Authentication
- Organization membership/tenant isolation
- Organization type/status
- Subscription/capacity
- RBAC permissions
- Project access and effective assignments
- Project team/custom grants
- Workers and worker-project assignment
- Calendar
- Attendance
- Wages
- Kharchi
- Materials
- Expenses
- Sales
- Notifications
- Audit events
- Idempotency/concurrency
- Files/media
- Offline sync
- Localization en/hi/gu
- Dashboard/reporting/export

Do not create unnecessary coupling. Explicitly say when there is no direct dependency.

## 5. Contract-driven development gate

Follow the repository's existing AI/contract-driven workflow.

For a mature module:
1. Audit existing contract.
2. If no approved contract exists, draft/update the contract before implementation.
3. Surface unresolved business decisions.
4. Wait for explicit approval when the repo workflow requires contract approval.
5. Create/update the technical implementation plan.
6. Implement only the user-authorized surface/slice.
7. Verify that slice.
8. Update module status/review/task/progress docs.

Do not create parallel documentation conventions when repository templates already exist.

## 6. Plan globally, implement one surface at a time

The user intentionally develops in stages.

Analyze the whole module and its dependencies, but implement only the explicitly requested surface.

Examples:
- "plan the API" → create/update API technical plan only.
- "start with API code now" → implement API/shared/migration-file code needed by the API, but do not start Mobile/Web integration.
- "integrate in Mobile" → consume the completed API contract and implement Mobile only.
- "integrate in Web" → implement Web only.

Never expand an API-only authorization into a full vertical-slice implementation.

## 7. API implementation rules

When the user explicitly authorizes API coding:

Before coding:
- re-audit module source and git status
- confirm approved contract/plan
- identify existing code that must be modified rather than recreated

Implement as required by repository architecture:
- shared permissions/statuses/types/errors first when needed
- additive migration file draft when schema changes are required
- NestJS controller → service → repository layering
- tenant/project access via existing access services
- validation through existing DTO/validation patterns
- transactions/row locking for integrity-sensitive workflows
- idempotency for retryable commands when relevant
- audit events for critical actions
- notifications only through reusable notification foundation
- focused API tests

Do not execute database mutations merely because a migration file was created.

At completion, report compactly:
- files changed
- endpoints implemented
- tests/static checks run
- DB actions not yet run
- remaining acceptance gates

Update relevant documentation/status records when appropriate.

## 8. Database execution gate

Database operations are a separate authorization boundary.

Unless the user explicitly authorizes them, do NOT:
- run pending migrations against a database
- execute seed mutations
- perform destructive DB mutations
- modify production/staging data

You may prepare migration SQL, preflight checks, seed changes, and static verification during API implementation.

When explicitly authorized to perform DB rollout:
1. inspect migration status/current target
2. run repository-approved preflight/safety checks
3. report target and pending migrations
4. execute only the authorized migration/seed operation
5. verify schema/data outcome
6. run relevant API/runtime verification
7. update docs/progress evidence

Never bypass repository migration guards.

## 9. Mobile/Web handoff after API completion

When the API and required DB rollout are complete, the user may ask for a prompt for a new AI chat.

Generate a self-contained handoff prompt so the next chat does not redesign the API.

The handoff must include:
- module objective
- authoritative docs/contracts to read
- exact current implementation state
- completed API endpoints
- request/response behavior
- permissions
- statuses/state transitions
- shared types/constants/errors
- relevant migrations/schema
- validation and error codes
- dependency/interconnectivity notes
- files already implemented
- what the target client must build
- what it must NOT change/reimplement
- localization requirements for Mobile
- design-system/UI rules
- required verification gates
- instruction to preserve unrelated/uncommitted work

For Mobile, explicitly require en/hi/gu parity and use existing Mobile operational primitives.

## 10. Documentation synchronization

Documentation is part of the implementation, not an optional afterthought.

As work progresses, update only the repository's relevant existing artifacts, such as:
- module contract/decisions
- implementation plan
- status/review
- `MODULE_INDEX.md`
- `current-task.md`
- `PROGRESS_LEDGER.md`
- handoff docs

Do not mark a module `complete` merely because source code exists.

Use these distinctions:
- **planned** — contract/technical plan prepared
- **implemented** — source exists
- **verified** — applicable static/tests/runtime checks passed
- **accepted** — required authenticated/browser/device/DB acceptance gates completed

Explicitly record unrun gates.

## 11. Verification and integrity check

Before declaring the requested slice done, verify relevant concerns:

### Static/source
- typecheck/build/lint as applicable
- focused unit/integration tests
- `git diff --check`

### Security/data integrity
- tenant isolation
- project scoping
- permission enforcement
- ownership validation
- transaction safety
- concurrency/idempotency where relevant
- immutable audit behavior where required

### Cross-module integrity
Confirm the change does not break dependent modules or duplicate an existing shared concern.

### Runtime/acceptance
Keep these separate and do not claim them if not run:
- DB migration verification
- authenticated API workflows
- browser acceptance
- physical-device Mobile acceptance
- offline behavior
- accessibility/localization review

## 12. Stop conditions

Stop and ask the user only when a real owner decision or protected execution gate is reached.

Stop for:
- unresolved contract contradiction affecting core behavior
- financial/accounting rule ambiguity
- RBAC/tenant ownership ambiguity
- destructive migration/lifecycle decision
- approval workflow ambiguity
- explicit database execution approval when required

Do NOT stop for routine technical choices that are already determined by repo architecture/patterns.

## 13. Compact interaction style

The user prefers fast, compact discussion.

Default responses should be concise.
Do not dump long implementation explanations unless asked.
Use short headings and bullets only when they improve readability.

If context was successfully acquired, say so briefly and move to the requested module/task.

## 14. Example user commands and expected behavior

### "Understand the Materials module"
Audit actual Materials source/docs/migrations/tests/git status, identify dependencies/drift/blockers, and summarize. Do not invent a new implementation if one already exists.

### "Plan the API development and analyze dependencies"
Re-audit Materials, create/update the API technical plan using existing repo templates, classify dependencies, and do not write API code yet.

### "Start with API code now"
Implement the approved API slice only. Prepare migration/seed code if needed, but do not execute DB mutations without separate authorization. Update relevant docs and report remaining DB/runtime gates.

### "Run the required migration and seed"
Inspect target/status/preflight first, then perform only authorized DB operations and verify the result.

### "Give me a prompt to integrate this API in Mobile"
Create a self-contained Mobile handoff prompt based on the actual completed API, shared contracts, migrations, permissions, statuses, errors, and dependencies. Do not redesign the backend.

## Final principle

The goal is not maximum autonomous code generation.
The goal is **coherent, contract-driven, dependency-aware delivery without making the user repeat repository context and workflow instructions in every chat**.
