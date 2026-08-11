# Module Automation Rules

## 1. Purpose

These rules tell AI agents how to convert NirmanSite requirements into repeatable module development work.

## 2. Module Selection

Before starting a new module:

1. Read `docs/modules/MODULE_INDEX.md`.
2. Read `docs/tasks/PROGRESS_LEDGER.md`.
3. Confirm the previous module or slice is accepted, blocked, or intentionally paused.
4. Pick the next module marked `next` or the highest-priority `candidate`.
5. If no module is marked `next`, propose the next module based on dependencies.

## 3. Dependency Rule

Do not start a module if its foundation dependencies are incomplete.

Examples:

- Workers, Attendance, Kharchi, Materials, Expenses, Progress, Gallery, Sales, Reports, and Offline Sync require Identity Access and Project Setup.
- Offline-capable modules require an approved offline sync contract before offline writes.
- Financial modules require idempotency, audit, and transaction rules.
- Media modules require approved file/media ownership and storage rules.

## 4. Contract Rule

Every module must have an approved contract before implementation.

Contract path:

```text
docs/modules/<area>/<module>/CONTRACTS.md
```

Use `docs/templates/module-contract-template.md`.

## 5. Plan Rule

Every module or grouped vertical slice must have a technical plan before implementation.

Plan path:

```text
docs/tasks/<phase-or-module>-technical-plan.md
```

Use `docs/templates/technical-plan-template.md`.

## 6. Slice Rule

Implementation must be split into bounded slices.

Each slice must define:

- Scope
- Files in scope
- Files out of scope
- Commands to run
- Database safety
- Expected report

Use `docs/templates/implementation-slice-template.md`.

## 7. Verification Rule

Each slice must run the smallest meaningful verification set.

Baseline checks:

```bash
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/mobile type-check
git diff --check
```

Run only the checks relevant to changed areas during intermediate slices. Run broader checks before accepting a module.

Database tooling checks:

```bash
pnpm db:migrate:status
pnpm db:migrate
pnpm db:seed
```

Run `pnpm db:migrate:status` only after the target database is approved for connection. Run `pnpm db:migrate` and `pnpm db:seed` only against an explicitly approved safe local or throwaway database.

## 8. Documentation Rule

Every slice must update progress documentation.

Required:

- `docs/tasks/current-task.md`
- `docs/tasks/PROGRESS_LEDGER.md`
- Relevant module status in `docs/modules/MODULE_INDEX.md`

Optional when applicable:

- Module contract
- Technical plan
- Review report
- Architecture docs
- Decision records
- Knowledge-base issue notes

## 9. Stop Conditions

Stop and ask for human approval when:

- Requirements are ambiguous.
- A database mutation is needed.
- A migration status check would connect to a remote or non-local database.
- A production or remote database is configured.
- A dependency must be added.
- A package boundary must change.
- A contract conflict is found.
- A module dependency is missing.
- Verification fails and the fix would expand scope.

## 10. Report Format

At the end of work, report:

- Files changed
- What was implemented
- Verification run and result
- What was not verified
- Remaining risks
- Next recommended step
