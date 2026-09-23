# Web role-based UX audit

Date: 2026-09-22
Status: audit only; implementation not started.

## Evidence and limits

This is an expert task walkthrough using current Web/Mobile source and the three user-supplied screenshots. Persona reactions below describe likely friction, not interviews or measured usability results. The available browser reached the deployed login page; no authenticated session was available. Local source is not proof of the deployed revision. No records, permissions, financial transactions or application code were changed.

Reviewed: shared Web primitives, shell/navigation, dashboard, Projects, Workers/detail/project roster, Attendance, Calendar, Wages, Kharchi, Materials, Expenses, Progress, Gallery, Sales workspace/leads/follow-ups/inventory/bookings and notification handling. Mobile comparison focused on worker detail/assignment cards, filter controls, semantic badges, dashboard quick actions and sales/wage screen organization. This is not exhaustive verification of every form, permission combination or runtime state. Organization/member/profile/settings surfaces need deeper authenticated acceptance.

The requested outcome is a consistent, readable, task-oriented Web experience comparable to Mobile. All table filters belong in a sidebar drawer; search and the filter trigger remain in the table toolbar. Preserve contracts, effective permissions, project context and existing financial safeguards.

## Overall assessment

The app exposes substantial operational functionality, but its presentation often follows implementation boundaries instead of the user's job. Users must discover which page owns an action, interpret competing statuses, and reconstruct context when moving between modules. Cosmetic changes alone will not resolve this.

Priority meanings: P0 = trust or serious task obstruction; P1 = frequent workflow friction; P2 = consistency and secondary usability. Priorities are UX recommendations, not production incident classifications.

## Builder / owner: review the sites and act on exceptions

Scenario: Start the morning, identify which site needs attention, inspect a request, make an authorized decision, return to the project.

1. **P0 / NEEDS_CHANGE: dashboard truthfulness.** `apps/web/src/features/dashboard/components/dashboard-page.tsx` contains literal values including 146 workers, eight approvals and 72% progress; `data/dashboard.data.ts` supplies sample projects and approval items. `approval-flow.tsx` renders descriptive articles without record navigation. Likely reaction: "Are these my actual projects, and where do I resolve these approvals?" Treat this as a trust defect in current source. Replace sample operational content with supported scoped data or an honest unavailable state. Do not calculate organization-wide totals from one paginated list. Any missing aggregation contract is a separate backend gap.
2. **P0 / NEEDS_CHANGE: project overview is overwhelmed by navigation.** Project Detail places Team, Attendance, Wages, Kharchi, Materials, Expenses, Progress, Gallery, Sales and lifecycle controls in the shared header. The supplied screenshot shows the title collapsed vertically. Give the project identity its own stable area, related modules a dedicated navigation region, and lifecycle actions a secondary management area.
3. **P1 / NEEDS_CHANGE: decision information competes with technical metadata.** Expense Detail includes workflow snapshot, version and actor identifiers alongside ordinary record facts. Show amount, payee, purpose, state, evidence and decision responsibility first; move technical metadata into a secondary audit section. Resolve friendly actor names only where supported; never invent them.
4. **EXISTING: useful operational detail.** Materials separates request/fulfilment, purchases and deliveries. Expenses distinguishes original amount, adjustments and recognized cost, and provides server-informed actions. Preserve these distinctions. Improve summary, responsibility and next-action hierarchy rather than merging different financial meanings.

Acceptance: the owner can identify the actual organization/project/date scope, open an actionable item, understand who must act, inspect evidence and return to the same context. Missing data is never displayed as zero or as sample business activity.

## Contractor: know where labour is allocated and what is payable

Scenario: Find a worker, establish where they work today, review rate/assignment, inspect attendance and understand wage deductions.

1. **P1 / NEEDS_CHANGE: listing loses assignment meaning.** Mobile `workers-screen.tsx` derives working_here, assigned_here, assigned_elsewhere and not_assigned, and supplies semantic tone to the whole OperationalEntityCard. Web Worker List shows active/inactive and an assignment count, but does not present the same contextual identity. Add a restrained row/card tint or accent and explicit assignment label. Keep worker lifecycle status separate.
2. **P1 / NEEDS_CHANGE: worker detail starts with the wrong task.** Web `worker-detail-page.tsx` opens WorkerForm for users with edit access, with deactivate/delete in the header. Mobile detail presents facts, primary project, active assignments, history and context-specific action rows. Make Web read-first: identity and contact, current work/rate context, relevant actions, related work, history. Editing should be deliberate.
3. **P1 / NEEDS_CHANGE: actions are fragmented.** Assignment/rate operations exist in `project-workers-panel.tsx`, mounted by Project Team, while Worker Detail is organized around profile and attendance. Surface existing permitted actions from the worker's project context; do not rebuild their business logic or substitute organization-wide permission checks for effective project access.
4. **P1 / NEEDS_CHANGE: wage discovery and comprehension.** Navigation has no direct Wages entry; Project Detail provides access. Wages has useful preview, readiness, calculation detail and confirmed-batch functionality, but combines several work stages on a long page. Organize period selection, preview/readiness, confirmation and batch/payment detail as clear stages. Retain the difference between preview and confirmed obligations, and payment versus adjustment.
5. **P1 / NEEDS_CHANGE: return context.** Worker Detail's back action goes to `/workers`; worker-list filters use local state. The path does not encode the previous search/page/assignment filter. Establish an explicit return context rather than relying on incidental browser restoration.

Acceptance: from a worker, a permitted user can find applicable project/rate context and reach the supported assignment, attendance and financial workflows without rediscovering the worker. Financial links retain worker/project/period only where destination contracts support those filters. Clearly label a project-wide destination when worker filtering is unavailable.

## Site supervisor: complete daily work with confidence

Scenario: Review today's workers, record an absence, request material, record delivery, report progress and attach evidence.

1. **P1 / NEEDS_CHANGE: daily attendance mental model.** The current screen correctly explains that presence is derived and absences are recorded. Keep this prominent and concise: eligible workers are treated as present unless an absence is recorded. Do not imply that visiting the screen marks or submits everyone present. Show project/date context continuously, including inside mutation dialogs.
2. **P1 / NEEDS_CHANGE: no-roster recovery.** Attendance already distinguishes no primary assignments, filtered results, permissions and non-working days in its messages. Extend appropriate states with permitted routes to worker assignment or Work Calendar. Avoid a dead-end explanation when the user can resolve the issue elsewhere.
3. **P1 / NEEDS_CHANGE: project selection repeats between module entry points.** Workspaces such as Sales and Materials have project-selection entry screens; sibling work should preserve an explicit project context. A supervisor moving from a project request to related work should not repeatedly select the site. Make organization/project identity unmistakable before saving.
4. **P1 / NEEDS_CHANGE: materials progress should answer an operational question.** Prioritize what was requested, approved, ordered, delivered and remains outstanding, using authoritative quantities/actions. Keep decision responsibility visible. Do not flatten these into a generic success badge or imply that approval means delivery.
5. **P2 / NEEDS_CHANGE: evidence and progress navigation.** Offer related Progress/Gallery access within a project workspace. Exact record/evidence links require an actual relationship returned by the API; otherwise label the link as project gallery, not evidence for this update.

Acceptance: the supervisor can identify the correct site/date, record the intended exception, see a clear saved/failed/uncertain result and continue to related work. Wrong-project writes and duplicate submission must not become easier during the redesign.

## Salesperson: know whom to contact and move the deal forward

Scenario: Review follow-ups, open a customer, record contact, schedule a visit, inspect inventory and complete an authorized booking workflow.

1. **P1 / NEEDS_CHANGE: navigation looks like document links.** `sales-workspace.tsx` has project-scoped sibling links and aria-current, but styles each as an underlined link. Use recognizable selected navigation with consistent focus/hover states. The existing interconnected routes are valuable and should be retained.
2. **P1 / NEEDS_CHANGE: lead actions compete.** Lead Detail presents booking, visit, edit, stage, activity, assignment and follow-up actions in one wrapping group, subject to permissions. Emphasize the relevant next action and organize secondary record-management actions. Do not invent a mandatory stage progression or recommend an action that the contract forbids.
3. **P1 / NEEDS_CHANGE: status colors collapse different meanings.** `sales-ui.tsx` gives AVAILABLE and BOOKED the same success tone, and places HIGH_INTENT, CANCELLED, BLOCKED and LOST together in warning. Separate availability, customer intent, lifecycle and urgency mappings. Availability should be recognizable immediately; high interest is not a failure condition.
4. **EXISTING: useful connections.** Booking Detail links to lead and unit; Unit Detail links to related leads; follow-up records can lead back to customer work. Make these relationships visible as related-record sections and preserve list return context. Do not describe them as missing features.
5. **P2 / NEEDS_CHANGE: action-first customer summary.** Prioritize customer/contact, owner, current stage, next follow-up and relevant unit/visit information before low-frequency audit fields. Where due/overdue/today groups are introduced, use authoritative timestamps and organization timezone, not a device-local assumption.

Acceptance: a salesperson can identify the next customer action, distinguish an available unit from a booked one, traverse lead/unit/booking relationships and return to the same queue. Booking failure or uncertainty must not be styled as success.

## Shared UX requirements

- **One detail-page pattern:** identity/context → current state and key facts → relevant primary action → related records/modules → history → management actions. Modules may vary without changing the visual grammar.
- **One listing pattern:** readable entity identity, useful secondary facts, contextual status, predictable detail access, search plus Filters trigger, count/pagination and helpful empty/error states.
- **One filter drawer:** all filter inputs inside; active count visible on trigger; draft/apply/reset semantics consistent; closing without applying does not silently change results. Preserve mandatory tenant/project scope. Keyboard focus enters, stays inside and returns to the trigger; support Escape and background scroll lock. Existing production Drawer needs this accessibility work before universal adoption.
- **Keep task context visible:** a selected project/date summary is not another inline filter form. Changes can live in the drawer, but users must see the scope of their work and mutation dialogs.
- **Meaningful color:** success for positive completion/current assignment, info for elsewhere/informational state, warning for attention/pending/unassigned, danger for destructive/failure conditions, neutral for inactive/history. Define domain-specific mappings; do not blindly assign one color to every enum. Working here and assigned here can share a family while remaining textually distinct.
- **Color plus language:** tinted surfaces are subtle, selected/hover states remain distinguishable, contrast stays readable, and every meaning has a label/icon. Unknown/loading allocation is neither unassigned nor available.
- **Quick access with context:** destination supports project/worker/customer/period identifiers; accessible users see relevant shortcuts; unavailable access is explained where useful. Never expose inaccessible related data or create fictional record relationships.
- **Preserve existing recovery:** retain mutation locks, reconciliation, stale-state handling, confirmations and financial safeguards. Distinguish failed loading, genuinely empty data, filtered-out data, denied access, archived scope and uncertain saves.
- **Readable language:** move raw versions/workflow internals away from primary task content. Explain business terms where needed without relabeling financial values incorrectly.
- **One component foundation:** consolidate production primitives and useful preview patterns. Do not add a third disconnected design system or copy Mobile layouts literally into desktop.

## Prioritized delivery recommendation

1. Resolve dashboard truthfulness and the screenshot-confirmed layout failures. Treat missing data contracts as explicit gaps.
2. Establish reusable typography, semantic domain statuses, page/detail layout, task actions, related links, table toolbar/filter drawer and context-preserving navigation.
3. Use Workers list/detail + Project workspace + Attendance as the first end-to-end reference journey. Verify ordinary, unassigned, elsewhere, inactive, read-only and long-name states.
4. Apply the same interaction system to Wages/Kharchi, Materials/Expenses, Progress/Gallery and Sales; retain module-specific workflows.
5. Complete authenticated role/effective-permission and responsive acceptance before claiming app-wide UX completion.

## Browser acceptance still required

Run real authorized test accounts for builder, contractor, supervisor and sales access; labels alone do not establish permissions. Check 1366px laptop, narrower desktop/tablet and 200% zoom, keyboard-only navigation, long content, populated and empty lists, drawer open/close/apply/reset, details/back restoration and refresh/deep links. Validate create/edit/save behavior only in an authorized test environment; the read-only audit did not submit any business actions.

Record completion, wrong turns, lost context, ambiguous statuses and task-obstructing scroll for each scenario. These measurements have not been collected. Visual/runtime claims beyond the supplied screenshots remain pending.

