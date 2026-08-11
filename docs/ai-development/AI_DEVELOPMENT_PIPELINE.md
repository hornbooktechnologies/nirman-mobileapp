# NirmanSite AI Development Pipeline

## 1. Purpose

This document defines how NirmanSite should be developed with minimal human orchestration.

The product owner should provide clear requirements, review decisions, and approve gates. AI agents should handle discovery, contract writing, technical planning, bounded implementation, verification, and documentation updates.

The repository must preserve the path followed to build the app so any future AI chat can resume from the last verified point.

## 2. Operating Principle

NirmanSite development is requirements-first, contract-driven, and slice-based.

Do not build a module directly from a broad requirement. Convert requirements into a module contract first, approve the contract, then implement only the approved slice.

## 3. Source Order

When sources conflict, use this order:

1. `MVP_REQUIREMENTS.md`
2. Approved decisions in `docs/decisions/`
3. Approved module contracts in `docs/modules/`
4. Current task and progress docs in `docs/tasks/`
5. Architecture docs in `docs/architecture/`
6. Existing source code
7. Historical or superseded docs

Current source code must still be inspected before implementation. If source code conflicts with approved docs, stop and record the conflict.

## 4. Human Role

The product owner should mainly:

- Approve or reject module priority.
- Answer open product decisions.
- Review contracts.
- Approve implementation gates.
- Confirm safe local or throwaway database targets before mutation.
- Review final workflow behavior.

The product owner should not need to manually design every prompt, endpoint, screen, or implementation slice.

## 5. AI Role

The AI agent should:

- Read the required context.
- Pick the next module from `docs/modules/MODULE_INDEX.md`.
- Confirm the current gate from `docs/tasks/PROGRESS_LEDGER.md`.
- Generate or update the module contract.
- Produce an implementation plan after contract approval.
- Implement bounded slices.
- Run verification.
- Update progress docs.
- Stop at approval gates.

## 6. Standard Module Pipeline

Every module should move through these states:

```text
candidate
-> contract_draft
-> contract_review
-> contract_approved
-> technical_plan
-> implementation_slices
-> verification
-> accepted
-> documented
```

Do not skip from `candidate` to implementation.

## 7. Standard Implementation Slices

Use this default slice order unless the module contract explains why a slice is not needed:

1. Shared contracts: permissions, statuses, enums, types, schemas, errors.
2. SQL migration draft: additive SQL file under `apps/api/src/database/sql/migrations`, not executed.
3. SQL compatibility review: inherited table names, ID types, FK assumptions, DB version.
4. Migration status review: `pnpm db:migrate:status` only after the target database is approved for connection.
5. Safe local DB verification: `pnpm db:migrate` and `pnpm db:seed` on local or throwaway DB only.
6. API implementation: repository, service, controller, guards/helpers, tests.
7. Web admin implementation: only if the module has back-office responsibilities.
8. Mobile implementation: only if the module has field responsibilities.
9. Integration smoke: API plus affected clients.
10. Review report and documentation update.

Small foundation modules may combine slices only when risk is low and verification remains clear.

## 8. Approval Gates

Human approval is required before:

- Marking a module contract approved.
- Executing database migrations or seed commands.
- Connecting to a remote or non-local database for migration status checks.
- Mutating any non-local database.
- Adding dependencies.
- Changing package structure.
- Starting a business module after foundation work.
- Changing permission notation, ID strategy, tenant model, or offline sync strategy.

## 9. Required End-Of-Slice Updates

At the end of every slice, update:

- `docs/tasks/current-task.md`
- `docs/tasks/PROGRESS_LEDGER.md`
- The relevant module row in `docs/modules/MODULE_INDEX.md`
- Any changed contract, plan, or review document

If verification is incomplete, record the exact gap. Do not call the slice fully verified.

## 10. Current Foundation Decisions

All modules must follow these decisions:

- Permission keys use `resource:action`.
- Contracts live in `packages/shared` for MVP unless a later decision creates `packages/contracts`.
- Database access lives only in `apps/api` through `mysql2/promise` repositories.
- SQL migrations live under `apps/api/src/database/sql/migrations` and are applied only by explicit migration commands.
- New SQL tables use plural `snake_case` names.
- Prisma under `packages/database/prisma` is archived inherited history only.
- Access is modeled through `organization_members` and `project_members`.
- Inherited global role fields are compatibility only, not the future access model.
- Web is admin/back-office.
- Mobile is field operations.
- Web and mobile share contracts, not React components.

## 11. Done Means Documented

A slice is not done until the code and the development trail are both updated.

A future AI should be able to answer:

```text
What was the last completed slice?
What files changed?
What passed?
What was not verified?
What is the next approved step?
What needs human approval?
```
