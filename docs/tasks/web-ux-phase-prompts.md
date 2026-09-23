# Web UX redesign — separate-chat prompts

Use these sequentially in the same repository checkout. Phase 1A code already exists; its prompt is for verification and bounded corrections. Each prompt is self-contained. Do not run overlapping phase chats against the same files at the same time. A later phase must inspect the current implementation and previous evidence before starting.

## Phase 1A — Validate the initial foundation

```text
Work in D:/NIRMANSITE/nirman-mobileapp on apps/web. This is an implementation request for this phase only, not another planning exercise.

Read CODEX.md, applicable AGENTS.md, docs/tasks/web-ux-redesign-plan.md, docs/tasks/web-role-based-ux-audit.md, current-task/PROGRESS_LEDGER and relevant module contracts. Use the nirmansite-module-development and ui-ux-pro-max skills. Inspect live git state and actual Mobile/API/Web source; preserve unrelated and uncommitted work.

Keep the existing palette and Manrope font family. Follow the recorded shared component, typography, search/filter drawer, detail/action, status and navigation contracts. Reuse completed earlier-phase components. Preserve business rules, effective permissions, tenant isolation, historical calculations and mutation recovery. Do not change API/database/Mobile, add dependencies, commit, push or deploy. Record unsupported contracts instead of inventing behavior.

Validate and finish Phase 1A; do not redo it blindly. The previous implementation changed components/ui/layout.tsx, components/ui/typography.tsx and features/projects/components/organization-context-select.tsx. Check the current diff and consumers. Verify long project names, crowded header actions, the Workers selector/search overlap, shared heading hierarchy and readable labels at laptop/tablet widths and 200% zoom. Fix only foundation defects found. Previous focused lint and source-only TypeScript checks passed; generated .next/dev types blocked the full check. Recheck rather than assuming that blocker remains. Do not start the filter or module migrations.

Complete this bounded phase and stop before the next. Run appropriate focused lint/type checks and meaningful behavior/browser checks. Use an existing authorized browser session when available; if sign-in is required, finish independent work and report the exact acceptance gap without inventing credentials. Do not mutate production data. Update the redesign plan, current-task and PROGRESS_LEDGER without overwriting unrelated entries. Report changed files, checks, remaining gaps and the next phase. Treat previous verification as historical evidence, not proof of the current checkout.
```

## Phase 1B — Collection and filter foundation

```text
Work in D:/NIRMANSITE/nirman-mobileapp on apps/web. This is an implementation request for this phase only, not another planning exercise.

Read CODEX.md, applicable AGENTS.md, docs/tasks/web-ux-redesign-plan.md, docs/tasks/web-role-based-ux-audit.md, current-task/PROGRESS_LEDGER and relevant module contracts. Use the nirmansite-module-development and ui-ux-pro-max skills. Inspect live git state and actual Mobile/API/Web source; preserve unrelated and uncommitted work.

Keep the existing palette and Manrope font family. Follow the recorded shared component, typography, search/filter drawer, detail/action, status and navigation contracts. Reuse completed earlier-phase components. Preserve business rules, effective permissions, tenant isolation, historical calculations and mutation recovery. Do not change API/database/Mobile, add dependencies, commit, push or deploy. Record unsupported contracts instead of inventing behavior.

Implement Phase 1B. Reuse and improve the production Drawer and collection components; do not create another disconnected design system. Build a consistent search-plus-Filters toolbar and right-side filter drawer for all viewport sizes. Support applied count, separate draft values, Apply, Reset-to-defaults in the draft, and close/Escape cancellation without changing applied results. Preserve required organization/project scope. Implement unique accessible labels, focus containment/restoration, background scroll lock and reduced motion. Unify control/table typography with the recorded design contract. Adopt this on one existing low-risk collection, preferably Projects list, to verify real query/pagination behavior. Do not migrate every module. Validate Phase 1A consumers before proceeding if visual checks remain open.

Complete this bounded phase and stop before the next. Run appropriate focused lint/type checks and meaningful behavior/browser checks. Use an existing authorized browser session when available; if sign-in is required, finish independent work and report the exact acceptance gap without inventing credentials. Do not mutate production data. Update the redesign plan, current-task and PROGRESS_LEDGER without overwriting unrelated entries. Report changed files, checks, remaining gaps and the next phase. Treat previous verification as historical evidence, not proof of the current checkout.
```

## Phase 2 — Workers, Projects and Attendance

```text
Work in D:/NIRMANSITE/nirman-mobileapp on apps/web. This is an implementation request for this phase only, not another planning exercise.

Read CODEX.md, applicable AGENTS.md, docs/tasks/web-ux-redesign-plan.md, docs/tasks/web-role-based-ux-audit.md, current-task/PROGRESS_LEDGER and relevant module contracts. Use the nirmansite-module-development and ui-ux-pro-max skills. Inspect live git state and actual Mobile/API/Web source; preserve unrelated and uncommitted work.

Keep the existing palette and Manrope font family. Follow the recorded shared component, typography, search/filter drawer, detail/action, status and navigation contracts. Reuse completed earlier-phase components. Preserve business rules, effective permissions, tenant isolation, historical calculations and mutation recovery. Do not change API/database/Mobile, add dependencies, commit, push or deploy. Record unsupported contracts instead of inventing behavior.

Implement Phase 2 using the Phase 1 shared foundation. Compare Mobile workers-screen.tsx and its operational cards/actions with API contracts and current Web. Migrate Workers listing to the shared search/filter drawer. Show meaningful row/card cues for working here, assigned here, elsewhere and unassigned; distinguish inactive and unknown/loading states. Make Worker Detail read-first with identity, current project/rate, assignments, context-specific permitted actions, related work and separate history/management. Reuse assignment and rate workflows currently available under Project Team. Organize Project Detail navigation separately from its title and lifecycle actions. Restyle Attendance navigation, preserve automatic-presence/absence semantics, and offer permitted assignment/calendar recovery links. Preserve list search/page/filter return context and supported worker/project/date deep links. Do not invent financial filters or rate history absent from contracts.

Complete this bounded phase and stop before the next. Run appropriate focused lint/type checks and meaningful behavior/browser checks. Use an existing authorized browser session when available; if sign-in is required, finish independent work and report the exact acceptance gap without inventing credentials. Do not mutate production data. Update the redesign plan, current-task and PROGRESS_LEDGER without overwriting unrelated entries. Report changed files, checks, remaining gaps and the next phase. Treat previous verification as historical evidence, not proof of the current checkout.
```

## Phase 3 — Dashboard and project navigation

```text
Work in D:/NIRMANSITE/nirman-mobileapp on apps/web. This is an implementation request for this phase only, not another planning exercise.

Read CODEX.md, applicable AGENTS.md, docs/tasks/web-ux-redesign-plan.md, docs/tasks/web-role-based-ux-audit.md, current-task/PROGRESS_LEDGER and relevant module contracts. Use the nirmansite-module-development and ui-ux-pro-max skills. Inspect live git state and actual Mobile/API/Web source; preserve unrelated and uncommitted work.

Keep the existing palette and Manrope font family. Follow the recorded shared component, typography, search/filter drawer, detail/action, status and navigation contracts. Reuse completed earlier-phase components. Preserve business rules, effective permissions, tenant isolation, historical calculations and mutation recovery. Do not change API/database/Mobile, add dependencies, commit, push or deploy. Record unsupported contracts instead of inventing behavior.

Implement Phase 3. Inspect current dashboard data sources: the audit found literal metrics and sample project/approval arrays; verify current source before changing it. Remove misleading operational sample content. Use existing authorized API data for truthful summaries and actionable record links; use honest unavailable states when aggregation contracts do not exist. Never report one page of records as an organization total. Organize builder attention around real pending work and project context. Improve shared project navigation and relevant quick access without duplicating the Phase 2 project header. Respect role/effective permissions, archived states and context isolation. Use existing semantic status treatments and shared components. Record missing dashboard contracts as gaps; do not implement backend changes. Verify every displayed total's source and scope.

Complete this bounded phase and stop before the next. Run appropriate focused lint/type checks and meaningful behavior/browser checks. Use an existing authorized browser session when available; if sign-in is required, finish independent work and report the exact acceptance gap without inventing credentials. Do not mutate production data. Update the redesign plan, current-task and PROGRESS_LEDGER without overwriting unrelated entries. Report changed files, checks, remaining gaps and the next phase. Treat previous verification as historical evidence, not proof of the current checkout.
```

## Phase 4 — Wages and Kharchi

```text
Work in D:/NIRMANSITE/nirman-mobileapp on apps/web. This is an implementation request for this phase only, not another planning exercise.

Read CODEX.md, applicable AGENTS.md, docs/tasks/web-ux-redesign-plan.md, docs/tasks/web-role-based-ux-audit.md, current-task/PROGRESS_LEDGER and relevant module contracts. Use the nirmansite-module-development and ui-ux-pro-max skills. Inspect live git state and actual Mobile/API/Web source; preserve unrelated and uncommitted work.

Keep the existing palette and Manrope font family. Follow the recorded shared component, typography, search/filter drawer, detail/action, status and navigation contracts. Reuse completed earlier-phase components. Preserve business rules, effective permissions, tenant isolation, historical calculations and mutation recovery. Do not change API/database/Mobile, add dependencies, commit, push or deploy. Record unsupported contracts instead of inventing behavior.

Implement Phase 4 for contractor/finance workflows. Reuse the shared collection/filter/detail patterns. Organize Wages into understandable period selection, readiness/preview, confirmation and confirmed-batch/payment detail. Show worker, applicable historical rate or multi-rate breakdown, payable days, gross earnings, Kharchi deductions, adjustments and net payable without conflating paid and owed values. Confirmed wages must retain snapshot rates; current/scheduled rates must never overwrite their meaning. Calculation-period inputs are task inputs, not table filters. Improve Kharchi summaries, correction/recovery history and supported links between worker, attendance, wage and Kharchi context. Preserve idempotency, uncertain-outcome recovery, immutable history, cancellation/reversal restrictions and effective permissions. Do not change calculations or APIs. Test meaningful financial-display and navigation cases using mocks or approved test data; do not execute real payments.

Complete this bounded phase and stop before the next. Run appropriate focused lint/type checks and meaningful behavior/browser checks. Use an existing authorized browser session when available; if sign-in is required, finish independent work and report the exact acceptance gap without inventing credentials. Do not mutate production data. Update the redesign plan, current-task and PROGRESS_LEDGER without overwriting unrelated entries. Report changed files, checks, remaining gaps and the next phase. Treat previous verification as historical evidence, not proof of the current checkout.
```

## Phase 5 — Materials and Expenses

```text
Work in D:/NIRMANSITE/nirman-mobileapp on apps/web. This is an implementation request for this phase only, not another planning exercise.

Read CODEX.md, applicable AGENTS.md, docs/tasks/web-ux-redesign-plan.md, docs/tasks/web-role-based-ux-audit.md, current-task/PROGRESS_LEDGER and relevant module contracts. Use the nirmansite-module-development and ui-ux-pro-max skills. Inspect live git state and actual Mobile/API/Web source; preserve unrelated and uncommitted work.

Keep the existing palette and Manrope font family. Follow the recorded shared component, typography, search/filter drawer, detail/action, status and navigation contracts. Reuse completed earlier-phase components. Preserve business rules, effective permissions, tenant isolation, historical calculations and mutation recovery. Do not change API/database/Mobile, add dependencies, commit, push or deploy. Record unsupported contracts instead of inventing behavior.

Implement Phase 5 using the established shared patterns. First inspect and preserve any existing Materials two-mode approval work. Prioritize request/expense identity, current state, who must act, key quantities/costs, evidence and the next permitted action. Distinguish requested/approved/ordered/delivered/outstanding quantities; approval is not delivery. Keep original expense, adjustments and recognized cost distinct. Preserve Direct/Final approval modes, delegation and owner exceptions exactly as established in current contracts. Put list filters in the shared drawer, improve detail grouping and history, and move technical metadata away from primary task content. Add supported contextual related links and reliable back restoration. Preserve API-derived available actions, revisions, reconciliation and unsafe-write safeguards. No migration, backend or Mobile edits.

Complete this bounded phase and stop before the next. Run appropriate focused lint/type checks and meaningful behavior/browser checks. Use an existing authorized browser session when available; if sign-in is required, finish independent work and report the exact acceptance gap without inventing credentials. Do not mutate production data. Update the redesign plan, current-task and PROGRESS_LEDGER without overwriting unrelated entries. Report changed files, checks, remaining gaps and the next phase. Treat previous verification as historical evidence, not proof of the current checkout.
```

## Phase 6 — Progress, Gallery and Calendar

```text
Work in D:/NIRMANSITE/nirman-mobileapp on apps/web. This is an implementation request for this phase only, not another planning exercise.

Read CODEX.md, applicable AGENTS.md, docs/tasks/web-ux-redesign-plan.md, docs/tasks/web-role-based-ux-audit.md, current-task/PROGRESS_LEDGER and relevant module contracts. Use the nirmansite-module-development and ui-ux-pro-max skills. Inspect live git state and actual Mobile/API/Web source; preserve unrelated and uncommitted work.

Keep the existing palette and Manrope font family. Follow the recorded shared component, typography, search/filter drawer, detail/action, status and navigation contracts. Reuse completed earlier-phase components. Preserve business rules, effective permissions, tenant isolation, historical calculations and mutation recovery. Do not change API/database/Mobile, add dependencies, commit, push or deploy. Record unsupported contracts instead of inventing behavior.

Implement Phase 6 using the shared design patterns. Make project progress stages, update history, gallery entries and calendar meaning readable with consistent hierarchy, statuses and relevant actions. Move collection filters into the shared drawer; retain visible read-only project/date context and keep actual calendar/task editing inputs with their workflow. Improve permitted navigation between project progress, project gallery, calendar and attendance. Link exact evidence only when the API returns an actual relationship; otherwise label a destination as project gallery. Preserve timezone/date boundaries, working-day behavior, file access, upload/retry state and permission isolation. Distinguish loading, filtered-empty, missing evidence and failures. Do not alter financial/attendance derivation or invent backend relationships. Validate long captions, grouped media, non-working dates and context-preserving return.

Complete this bounded phase and stop before the next. Run appropriate focused lint/type checks and meaningful behavior/browser checks. Use an existing authorized browser session when available; if sign-in is required, finish independent work and report the exact acceptance gap without inventing credentials. Do not mutate production data. Update the redesign plan, current-task and PROGRESS_LEDGER without overwriting unrelated entries. Report changed files, checks, remaining gaps and the next phase. Treat previous verification as historical evidence, not proof of the current checkout.
```

## Phase 7 — Sales workflows

```text
Work in D:/NIRMANSITE/nirman-mobileapp on apps/web. This is an implementation request for this phase only, not another planning exercise.

Read CODEX.md, applicable AGENTS.md, docs/tasks/web-ux-redesign-plan.md, docs/tasks/web-role-based-ux-audit.md, current-task/PROGRESS_LEDGER and relevant module contracts. Use the nirmansite-module-development and ui-ux-pro-max skills. Inspect live git state and actual Mobile/API/Web source; preserve unrelated and uncommitted work.

Keep the existing palette and Manrope font family. Follow the recorded shared component, typography, search/filter drawer, detail/action, status and navigation contracts. Reuse completed earlier-phase components. Preserve business rules, effective permissions, tenant isolation, historical calculations and mutation recovery. Do not change API/database/Mobile, add dependencies, commit, push or deploy. Record unsupported contracts instead of inventing behavior.

Implement Phase 7 across leads, follow-ups, site visits, inventory, unit detail, bookings and booking detail. Reuse the established list/filter/detail/navigation patterns. Prioritize customer identity/contact, owner, current stage and next relevant action. Group secondary administration separately. Make Sales sibling navigation visibly selected. Define domain-specific semantic status mappings: Available and Booked must be distinguishable; High Intent must not share failure meaning with Cancelled/Lost. Preserve labels alongside colors. Surface existing lead-unit-visit-booking connections and retain customer/project/list context. Use organization timezone for due/overdue information. Preserve ownership visibility, effective permissions, permitted transitions, blocking/hold/conversion semantics and exact uncertain retries. Do not add automatic stage changes, fake availability, unsupported reservations or backend changes. Validate the complete supported lead-to-booking journey without creating production business records.

Complete this bounded phase and stop before the next. Run appropriate focused lint/type checks and meaningful behavior/browser checks. Use an existing authorized browser session when available; if sign-in is required, finish independent work and report the exact acceptance gap without inventing credentials. Do not mutate production data. Update the redesign plan, current-task and PROGRESS_LEDGER without overwriting unrelated entries. Report changed files, checks, remaining gaps and the next phase. Treat previous verification as historical evidence, not proof of the current checkout.
```

## Phase 8 — Administration and remaining surfaces

```text
Work in D:/NIRMANSITE/nirman-mobileapp on apps/web. This is an implementation request for this phase only, not another planning exercise.

Read CODEX.md, applicable AGENTS.md, docs/tasks/web-ux-redesign-plan.md, docs/tasks/web-role-based-ux-audit.md, current-task/PROGRESS_LEDGER and relevant module contracts. Use the nirmansite-module-development and ui-ux-pro-max skills. Inspect live git state and actual Mobile/API/Web source; preserve unrelated and uncommitted work.

Keep the existing palette and Manrope font family. Follow the recorded shared component, typography, search/filter drawer, detail/action, status and navigation contracts. Reuse completed earlier-phase components. Preserve business rules, effective permissions, tenant isolation, historical calculations and mutation recovery. Do not change API/database/Mobile, add dependencies, commit, push or deploy. Record unsupported contracts instead of inventing behavior.

Implement Phase 8 across Organizations, Members, Users/Roles, Notifications, Profile, Settings, Subscriptions and remaining forms/details. Inventory current routes and identify unmigrated patterns first. Adopt the same search/filter drawer, readable detail layout, predictable form actions, validation, status treatment and return navigation. Make organization/project context and permission-related explanations understandable for nontechnical users. Preserve invitation/custom-permission/capacity logic and account/security workflows. Keep destructive and access-changing commands clearly separated with existing safeguards. Preserve notification target authorization and record navigation. Do not change role grants, billing, passwords or real organization/member data during verification. Remove isolated style overrides only after checking consumers. Report remaining unmigrated routes and contract gaps precisely.

Complete this bounded phase and stop before the next. Run appropriate focused lint/type checks and meaningful behavior/browser checks. Use an existing authorized browser session when available; if sign-in is required, finish independent work and report the exact acceptance gap without inventing credentials. Do not mutate production data. Update the redesign plan, current-task and PROGRESS_LEDGER without overwriting unrelated entries. Report changed files, checks, remaining gaps and the next phase. Treat previous verification as historical evidence, not proof of the current checkout.
```

## Phase 9 — App-wide acceptance and consolidation

```text
Work in D:/NIRMANSITE/nirman-mobileapp on apps/web. This is an implementation request for this phase only, not another planning exercise.

Read CODEX.md, applicable AGENTS.md, docs/tasks/web-ux-redesign-plan.md, docs/tasks/web-role-based-ux-audit.md, current-task/PROGRESS_LEDGER and relevant module contracts. Use the nirmansite-module-development and ui-ux-pro-max skills. Inspect live git state and actual Mobile/API/Web source; preserve unrelated and uncommitted work.

Keep the existing palette and Manrope font family. Follow the recorded shared component, typography, search/filter drawer, detail/action, status and navigation contracts. Reuse completed earlier-phase components. Preserve business rules, effective permissions, tenant isolation, historical calculations and mutation recovery. Do not change API/database/Mobile, add dependencies, commit, push or deploy. Record unsupported contracts instead of inventing behavior.

Execute Phase 9 after reviewing implementation evidence for all prior phases. Audit every production Web route for adoption of shared typography, search/filter drawers, detail hierarchy, semantic status meanings, forms, actions and related navigation. Run four realistic journeys: builder reviewing project attention, contractor following worker-to-wages context, supervisor handling attendance/material/progress work, and salesperson following customer-to-booking context. Verify 1366px laptop, narrower tablet, 200% zoom, keyboard-only behavior, reduced motion, long content, empty/error/stale/read-only states and list-detail-back restoration. Check effective permissions and organization/project isolation with authorized test accounts. Fix bounded presentation/navigation regressions. Remove obsolete duplicate components only after proving no consumers remain; preserve intentional reference previews. Re-run relevant static/build and behavior checks. Record implemented/static/browser/role-accepted separately, with evidence and unresolved blockers. Do not claim acceptance for unexecuted scenarios or mutate production business records.

Complete this bounded phase and stop before the next. Run appropriate focused lint/type checks and meaningful behavior/browser checks. Use an existing authorized browser session when available; if sign-in is required, finish independent work and report the exact acceptance gap without inventing credentials. Do not mutate production data. Update the redesign plan, current-task and PROGRESS_LEDGER without overwriting unrelated entries. Report changed files, checks, remaining gaps and the next phase. Treat previous verification as historical evidence, not proof of the current checkout.
```

