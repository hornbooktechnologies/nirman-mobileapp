# Contract To Implementation Workflow

## 1. Purpose

This workflow turns an approved module contract into implementation without relying on manual prompt-by-prompt steering.

## 2. Inputs

Required:

- `MVP_REQUIREMENTS.md`
- Relevant approved module contract under `docs/modules/`
- `docs/tasks/phase-1-identity-project-technical-plan.md` or the current phase plan
- Current source code
- Current progress ledger

## 3. Step 1: Contract Audit

Before planning implementation, compare the contract against source code.

Check:

- Permissions exist or need to be added.
- Statuses and enums exist or need to be added.
- API endpoints are new or already implemented.
- Database tables exist, are drafted, or are missing.
- Web and mobile responsibilities are clear.
- Verification requirements are specific.

Output:

- Contract coverage checklist
- Missing artifacts
- Open decisions

## 4. Step 2: Technical Plan

Create a technical plan that maps contract sections to implementation slices.

The plan must include:

- Shared package changes
- SQL table and migration file plan under `apps/api/src/database/sql/migrations`
- API module shape
- Web implementation shape
- Mobile implementation shape
- Tests
- Verification commands
- Risks
- Rollback notes
- Explicit out-of-scope items

## 5. Step 3: Slice Generation

Generate one slice at a time.

Each slice prompt should include:

- Exact objective
- Files in scope
- Files out of scope
- Required reading
- Implementation requirements
- Verification commands
- Required progress-doc updates

## 6. Step 4: Implementation

Implement only the active slice.

Rules:

- Prefer existing code patterns.
- Keep SQL in API repositories.
- Put schema changes in ordered SQL migration files and apply them only through explicit migration commands.
- Keep shared artifacts platform-neutral.
- Keep web and mobile UI separate.
- Do not silently change API response shapes.
- Do not introduce new module permissions outside approved contract scope.
- Do not run `pnpm db:migrate:status`, `pnpm db:migrate`, or `pnpm db:seed` until the database target is explicitly approved for the command.

## 7. Step 5: Verification

Run relevant checks.

If a check cannot be run, record:

- Command not run
- Reason
- Risk
- What would be needed to run it

## 8. Step 6: Review Report

After completing all slices for a module, create:

```text
docs/tasks/<module>-review.md
```

Use `docs/templates/review-report-template.md`.

## 9. Step 7: Handoff

Update:

- `docs/tasks/current-task.md`
- `docs/tasks/PROGRESS_LEDGER.md`
- `docs/modules/MODULE_INDEX.md`
- `AI_PROJECT_START_PROMPT.md` if the required reading or current status changed materially
