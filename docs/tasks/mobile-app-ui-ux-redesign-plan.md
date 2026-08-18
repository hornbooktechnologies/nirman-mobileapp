# NirmanSite Mobile App UI/UX Redesign Plan

## 1. Status

- Status: Approved for phased implementation; first operational slice in progress
- Scope: Entire current Expo mobile application
- Last updated: 2026-08-18
- Nature of this document: UI/UX and frontend architecture plan only
- Implementation authority: This plan does not authorize API, database, permission, status, or business-rule changes

Current implementation snapshot (2026-08-18):

- Added shared compact header, operational entity card, search field, quick-action grid, full-screen virtualized collection picker, and permission-driven Customer bottom navigation.
- Migrated Project Detail to compact identity/action hierarchy.
- Migrated standalone Workers to persistent navigation, virtualized compact cards, filters, and concise form copy.
- Migrated Project Team Member selection to a focused full-screen virtualized picker and compact access editor copy.
- Added persistent orientation to Team and Members and applied compact entity cards to Team and Organization Member lists.
- Updated Project, Worker, Invite Member, and Edit Member form copy without changing payloads or business rules.
- Added a centralized semantic status/action color language using NirmanSite palette tokens and removed Menu from the bottom navigation.
- Remaining slices include full auth/activation migration, Member project-assignment picker migration, broader list virtualization, state/accessibility hardening, and physical-device role verification.

## 2. Objective

Redesign the complete NirmanSite mobile application as a modern, premium, field-friendly construction operations product while preserving every existing route, permission gate, API call, validation rule, organization/project boundary, and user action.

The redesign must:

- Make high-frequency work reachable quickly with one-handed, thumb-friendly interaction.
- Use available screen space efficiently without recreating a dense desktop ERP on mobile.
- Keep Home as the expressive field command center and keep operational screens compact and task-focused.
- Use NirmanSite logo colors through semantic theme tokens.
- Build all generic controls once in `apps/mobile/src/components/ui`.
- Build reusable domain composites in `apps/mobile/src/features/<feature>/components`.
- Keep screen files focused on data, permissions, navigation, state, and workflow orchestration.
- Provide complete loading, empty, error, offline/degraded, submitting, success, and permission-change experiences.
- Remain accessible, responsive, performant, and predictable across supported phones and tablets.

## 3. Inputs And Current Baseline

This plan is based on the current checkout, not on documentation assumptions.

Primary inputs:

- `apps/mobile/app/**`
- `apps/mobile/src/features/**`
- `apps/mobile/src/components/ui/**`
- `apps/mobile/src/theme/**`
- `packages/shared/src/theme/**`
- `docs/decisions/002-mobile-app-architecture.md`
- `docs/decisions/003-design-system-direction.md`
- `docs/architecture/mobile.md`
- `docs/ai-context/04-mobile-development-rules.md`
- `docs/tasks/mobile-customer-experience-implementation-plan.md`
- `docs/design/mobile-operational-layout-spec.md`

The detailed operational card anatomy, field placement, screen space budgets, and review wireframes in `docs/design/mobile-operational-layout-spec.md` are normative for this plan. Where this plan uses broader wording such as “entity card” or “compact layout,” the layout specification controls.

Current user-facing route inventory:

| Area | Route | Existing responsibility that must remain intact |
| --- | --- | --- |
| Startup | `/` | Resolve session and redirect to protected Home or Login |
| Authentication | `/(auth)/login` | Email/password login and redirect to Home |
| Activation | `/(auth)/activate` | Load invitation, support new/existing identities, accept invitation, continue to Login |
| Home | `/(app)/dashboard` | Active organization/project context, permission-driven tools, project portfolio, project creation |
| Project | `/(app)/project-detail` | Read selected project, edit when allowed, open Team or Workers |
| Team | `/(app)/team` | Project Members and Workers tabs, assignment, permissions, dates, unassignment |
| Workers | `/(app)/workers` | Organization worker search, project assignment, create, edit/end allocation |
| Members | `/(app)/members` | Organization members, subscription capacity, invite, edit, deactivate, project assignments |
| Menu | `/(app)/menu` | Profile, organization switching, project context, authorized destinations, refresh, sign out |

Current design-system strengths to preserve:

- Semantic shared theme tokens already exist.
- Logo-derived olive and copper colors are already the primary and secondary brand colors.
- Generic mobile primitives already include Button, Input, Card, Badge, Header, ListItem, BottomSheet, EmptyState, LoadingState, and navigation components.
- Permission-aware navigation and direct-route redirects already exist.
- Home, featured project context, and floating navigation establish the new visual reference.
- Current redesigned files contain no raw color literals.

Current UX/architecture gaps the redesign must address:

- Protected navigation is not visually persistent on every top-level destination.
- Standalone Workers now has a compact Back path and persistent Workers-selected navigation; authenticated physical-device verification remains pending.
- Large Members, Team, Workers, and Projects collections are rendered through a general ScrollView rather than virtualized lists.
- Project Member assignment currently places an unbounded searchable Member collection inside a form sheet and renders it with `map`.
- Project detail currently gives a long Project name and three full-width actions excessive, equal prominence.
- Several form titles, labels, and submit actions repeat the same entity noun without adding meaning.
- Action rows, radio cards, check rows, chips, date inputs, and selection patterns are duplicated inside features.
- Several forms report only a single form-level error instead of field-level recovery guidance.
- Password visibility, complete autofill metadata, success feedback, and unsaved-change protection are incomplete.
- Bottom sheets need consistent keyboard, safe-area, focus, footer, dismissal, and long-content behavior.
- `userInterfaceStyle` is automatic while the current semantic theme is effectively light-only.
- Automated mobile component/state tests and physical-device role verification are not yet established.

## 4. Non-Negotiable Functionality Locks

The redesign must not change:

- API endpoints, request payloads, response normalization, or handler ordering unless a separately approved contract change is created.
- Existing `resource:action` permission checks or direct-route redirects.
- Active organization, membership, project scope, or active-project resolution behavior.
- Project status transition rules.
- Member invitation, activation, edit, deactivate, and assignment rules.
- Project Member role ceiling, permission mode, date, status, and unassignment behavior.
- Worker creation, duplicate-warning acknowledgement, assignment, date update, and assignment-end behavior.
- Online-only Workers write behavior or the honest lack of persisted offline support.
- The separation between login Members and non-login Worker records.
- Platform Super Admin versus customer Organization boundaries.
- Expo Router paths and deep-link parameters without an explicit navigation migration review.

The redesign must not introduce:

- Fake metrics, mock people, dead actions, or future module tiles.
- Attendance, Wages, Kharchi, Materials, Expenses, Progress, Gallery, Sales, notification, or offline-sync business behavior without approved contracts.
- Web React components inside React Native.
- Raw colors, arbitrary spacing, arbitrary radius, or per-screen copied primitive styles.
- Destructive operations without confirmation and recovery guidance.

## 5. Product And Visual Direction

### 5.1 Experience statement

NirmanSite mobile should feel like a premium field command application: calm, confident, tactile, and fast enough for use on an active construction site.

### 5.2 Brand system

- Primary brand: logo olive (`brand.primary`, currently `#676F4B`).
- Primary action/accent: logo copper (`brand.secondary` / `action.primary`, currently `#C16C31`).
- Supporting surfaces: warm ivory, sage mist, elevated white, blueprint tint, and charcoal navigation.
- Status colors remain semantic and must always include text or icon meaning, not color alone.
- Manrope remains the product type family unless a separate typography decision is approved.
- Official logo assets must retain their aspect ratio and clear space.

### 5.3 Density and use of space

- Target density: 7/10—efficient and operational, never cramped.
- Home may use a large project hero and bento composition.
- List and management screens use compact context headers so useful content appears above the fold.
- Avoid repeated large hero cards on every screen.
- Use one dominant action per screen; move secondary actions into contextual menus or sheets.
- Use 16–20dp phone gutters, 24–32dp section rhythm, and 8–12dp control gaps.
- Use wrap-safe badges and chips; never shrink labels until unreadable.
- Keep essential item identity and state visible; progressively disclose metadata and advanced permissions.
- Avoid cards inside cards except when a repeated entity or warning genuinely needs containment.
- Use two-column arrangements only for short, compatible fields; stack fields when text scaling or narrow width makes columns unsafe.

### 5.4 Motion

- Motion is subtle and functional, approximately 3/10.
- Use short press feedback, sheet transitions, content crossfades, and state continuity only.
- Animate opacity/transform, not layout dimensions.
- Motion must be interruptible and must not block interaction.
- Reduced-motion users receive the final state without nonessential animation.

## 6. Information Architecture And Navigation

### 6.1 Protected app shell

Create a shared protected `AppScaffold` or equivalent that owns:

- Safe areas and adaptive horizontal gutters.
- Fixed bottom-navigation clearance.
- Shared background treatment.
- Optional compact screen header.
- Refresh/error/status banner slots.
- Consistent scroll or virtualized-list integration.
- Screen-reader route-change focus handling where supported.

### 6.2 Bottom navigation

- Keep four labeled top-level items: Home, Team, Project, and Workers.
- Continue deriving visible destinations from live permissions.
- Keep the active destination visually and semantically selected.
- Persist the bottom navigation on all top-level destinations for which it is shown in the permission model.
- Hide it only during focused modal/full-screen subflows where a clear back/cancel path exists.
- Preserve route history and native back behavior; do not silently replace the stack with Home.
- Keep Organization Members as a secondary administration destination from Home/Menu unless future information architecture explicitly promotes it.
- Menu remains a secondary utility route opened from Home, not a bottom-navigation item.
- When Members is open as a secondary administration route, show a compact Back control and omit bottom navigation rather than implying a false selected destination.
- A standalone Workers route keeps Workers selected in the shell; embedded Workers inherits Team navigation and must not render a duplicate shell.
- If a user is authorized for a destination but lacks required context, show the destination with an explanatory state; continue hiding genuinely unauthorized destinations.

### 6.3 Context switching

- Keep active organization and project context visible but compact.
- Make project switching reachable from Home and project-related headers without duplicating switcher logic.
- Make organization switching a clear Menu action with confirmation/context feedback.
- Refresh permissions and project access atomically after switching, exactly as current session behavior requires.
- Preserve search, filter, and scroll state when returning from a detail sheet where practical.

## 7. Component-First Architecture

### 7.1 Theme foundation

Before redesigning additional screens:

- Audit all semantic foreground/background pairs for WCAG contrast.
- Add semantic tokens only when the UI meaning does not already exist.
- Add shared motion, z-index/layer, adaptive gutter, focus, disabled, and skeleton tokens.
- Resolve theme behavior explicitly:
  - preferred: add real light/dark semantic mappings and a ThemeProvider;
  - acceptable first-release fallback: lock the app to light mode until dark mode is implemented and tested.
- Never leave `automatic` appearance enabled with only a light visual system.

### 7.2 Generic UI components

Enhance or add these under `src/components/ui` before screen migration:

| Component | Required capability |
| --- | --- |
| `AppScaffold` / list scaffold | Safe areas, footer clearance, adaptive gutters, ScrollView or FlatList composition |
| `Button` | Leading/trailing icon, loading state, disabled state, compact/full-width variants, stable press feedback |
| `IconButton` | Minimum platform tap target, accessible label/state, loading/disabled states |
| `Input` | Focus/invalid/disabled/read-only states, left/right accessory, multiline spacing, autofill metadata |
| `PasswordField` | Show/hide control, password-manager compatibility, paste/autofill support |
| `SearchField` | Search icon, clear button, optional debounced callback, result count/filter action |
| `FormField` | Required marker, helper text, inline error, accessibility linkage/announcement |
| `DateField` | Locale-readable display, validated ISO output, clear action, platform picker if approved |
| `Card` | Stable interactive state, selectable state, compact density, no layout shift |
| `EntityListItem` | Identity, metadata, status, primary/secondary actions, large-text reflow |
| `SelectableCard` | Radio/checkbox semantics, selected/disabled states, description and trailing check |
| `SegmentedControl` | Two or three related views, selected semantics, Dynamic Type reflow |
| `FilterChip` / `ChoiceChip` | Selected, disabled, count, wrapping, accessible state |
| `ActionListItem` | Normal/destructive actions, icon, disabled/loading, divider behavior |
| `StatusBanner` | Info/warning/error/success/offline states with optional retry action |
| `Toast` or transient feedback | Non-blocking success/failure announcement without stealing focus |
| `Skeleton` | Stable placeholders for waits longer than approximately one second |
| `BottomSheet` | Keyboard avoidance, bottom safe area, sticky footer, scroll, focus, unsaved-dismiss guard |
| `ConfirmDialog` / confirm sheet | Clear impact, cancel-first ordering, destructive emphasis, submitting state |
| `EmptyState` | Contextual action, search-empty variant, permission/context unavailable variant |

### 7.3 Feature components

Feature-specific composites stay inside their feature:

- Home: metric cards, workspace tiles, portfolio rows, section headers.
- Projects: project context card, project row, project summary, project form sections, project switcher.
- Members: member row/card, role option, capacity summary, invitation result, member actions.
- Team: team member row, member picker option, assignment summary, permission group.
- Workers: worker row/card, assignment summary, duplicate warning, trade suggestions, worker actions.
- Auth: auth brand header, credential form, activation-state panel.

No feature should recreate generic buttons, inputs, action rows, choice cards, sheets, or error banners.

## 8. Cross-App UX Standards

### 8.1 Accessibility

- Normal text contrast: at least 4.5:1; large text and meaningful non-text UI: at least 3:1.
- Touch targets: at least 44pt on iOS and 48dp on Android, with at least 8dp between adjacent targets.
- All icon-only controls require descriptive accessible names.
- Selected, checked, disabled, expanded, busy, and destructive states must be announced where applicable.
- Decorative icons beside visible text are hidden from the accessibility tree.
- Color is never the only indicator of state.
- Reading/focus order follows visual order.
- Dynamic Type/system font scaling must reflow without clipped controls or lost content.
- Reduced motion must be respected.
- Password flows must support paste and password managers.
- Multi-error forms retain inline errors and move focus/announcement to an error summary or first invalid field.

### 8.2 Forms

- Every input has a visible label; placeholder text is an example or hint only.
- Required and optional fields are explicit.
- Validate most fields on blur and again on submit.
- Put specific recovery text beside the invalid field.
- Use correct keyboards and autofill metadata for email, phone, numeric, and password inputs.
- Keep entered data after validation or network failure.
- Disable duplicate submissions and show progress inside the primary action.
- Show brief success confirmation after completed mutations.
- Confirm dismissal when a changed form would lose data.
- Long forms use progressive sections, not one unbroken wall of fields.
- Keep a clear cancel/back path in every modal or multi-step form.
- Treat title, label, helper, and CTA as different information layers: task, data, consequence/format, and result.
- Avoid repeating the entity noun across all layers. For example: `New worker` → `Name` → `Create & assign`, while retaining the explicit accessibility label `Worker name`.
- Use action-only submit copy when context is already clear: `Create`, `Save changes`, `Assign`, `Send invite`.

### 8.3 Lists and mobile alternatives to tables

- Do not reproduce desktop tables on phones.
- Represent each row as a scannable entity item with identity, status, the two or three most important facts, and contextual actions.
- Use sticky search/filter controls for long operational lists.
- Use FlatList or SectionList for potentially large collections; treat 50 or more rows as a hard virtualization threshold.
- Use a full-screen or focused full-height picker for any unknown, growing, searchable, or filterable selection collection. Bottom sheets are limited to brief tasks and short bounded choices.
- Render secondary metadata on demand in details/actions rather than crowding each row.
- Keep list item height stable during loading and state changes.
- Provide explicit loading, refreshing, empty, search-empty, error, and offline/degraded states.
- Use locale-aware display for dates, counts, and money while preserving current API payload formats.

### 8.4 Feedback and connectivity

- Initial load longer than one second uses a stable skeleton or clear loading state.
- Pull-to-refresh is added only to list screens where refresh is useful and cannot trigger accidental data loss.
- Network errors include a retry path.
- Authentication expiry signs out through the existing flow.
- Permission-loss errors refresh the session and explain changed access.
- Workers continues to distinguish an already-loaded in-memory roster from true persisted offline availability.
- Online-only mutations show connectivity requirements before or immediately after failure; they must never appear queued.

### 8.5 Responsive behavior

- Validate at minimum: 375px small phone, approximately 430px large phone, tablet portrait, tablet landscape, and phone landscape.
- Phone layouts stay single-column except for safe pairs of short fields.
- Tablet layouts use centered maximum-width content or master/detail where it improves the workflow without changing navigation semantics.
- Fixed headers, bottom navigation, and sticky actions reserve content space and respect system bars.
- No horizontal scrolling is required for primary workflows.

## 9. Screen-By-Screen Redesign

### 9.1 Startup and session loading

- Use a branded but lightweight loading surface with the official mark.
- Reserve layout to prevent visual jumps when redirecting.
- Do not show fake progress percentages.
- Preserve current session resolution and redirect behavior.
- Add a recoverable message only if startup resolution exceeds an agreed timeout or fails.

### 9.2 Login

- Keep the logo, concise field-work positioning, email, password, Sign In, and Activate Invitation path.
- Use visible FormField labels rather than placeholder-only identification.
- Add PasswordField visibility toggle and password-manager/autofill metadata.
- Keep the main action reachable when the keyboard is open.
- Display inline authentication/recovery guidance without clearing entered credentials.
- Show a loading state in the Sign In button and prevent repeat submission.
- Preserve email prefill after activation and current successful-login redirect.

### 9.3 Invitation activation

- Treat activation as an explicit state machine: loading link, token entry, invitation preview, new-password setup, existing-account acceptance, success/continue, and recoverable error.
- Show organization, invited role, identity email, and expiry context clearly before acceptance.
- Use visible labels, password visibility, inline mismatch/length errors, and keyboard-safe layout.
- Keep automatic existing-account activation behavior and retry path unchanged.
- Distinguish malformed, expired, used, revoked, and network failures when the API provides those messages.
- Preserve secure token handling and Login continuation.

### 9.4 Home

- Keep the current redesigned Home as the visual reference.
- Preserve the featured project card, permission-driven workspace tiles, project portfolio, project creation, and bottom navigation.
- Keep only live values and implemented tools.
- On small screens, keep metrics readable and allow the layout to stack when text scaling requires it.
- On larger screens, use a balanced two-column grid without increasing information noise.
- Add refresh/degraded-state feedback without replacing valid already-loaded session content.

### 9.5 Project detail and project switching

- Use a compact operational identity card with code/type/status in the context strip and a 22–24sp Project name limited to two visual lines at standard text size.
- Replace the three full-width action stack with equal icon-plus-text Team and Workers quick links; make Edit a permission-aware tertiary header/footer action.
- Let one authorized quick link span the row; do not leave empty action columns.
- Keep Organization and access metadata in a compact definition grid/disclosure section rather than another oversized card.
- Show honest empty/context states when no project is selected.
- Project switcher uses searchable virtualized rows when project volume warrants it.
- Keep selected-state announcement, Draft/On-hold management behavior, and active-project switching intact.

### 9.6 Create/edit project

- Use `New project` / `Name` / `Create` for create and `Edit project` / `Name` / `Save changes` for edit; accessibility labels remain explicit.
- Recompose the form into progressive groups: Basics, Location, Timeline, and Details.
- Use shared ChoiceChip/SelectableCard controls for project type and permitted status transitions.
- Use DateField for start/expected completion while continuing to submit ISO dates.
- Stack City/State and date pairs on narrow screens or large text.
- Attach project-name and date-order errors to their fields and retain a form-level summary where needed.
- Add unsaved-change confirmation on dismiss.
- Preserve all existing optional/null conversions and status transition constraints.

### 9.7 Project Team

- Use a compact project context header and shared SegmentedControl for Members/Workers.
- Integrate the standalone Team route with persistent Team-selected bottom navigation; embedded Workers inherits this shell.
- Preserve both tabs and permission-based visibility.
- Keep Assign Member as the single primary action on the Members tab.
- Use a virtualized Member list with search, count, status, role/responsibility, permission mode, and assignment dates.
- Use an ActionListItem sheet for Edit and End Assignment.
- Keep Workers embedded without duplicating its business logic or API calls.
- Preserve all assignment/update/unassignment permission checks.

### 9.8 Assign/edit Project Member

- Make assignment progressive:
  1. Select an active organization member in a dedicated full-screen virtualized picker.
  2. Confirm responsibility and dates.
  3. Use role defaults or configure custom access.
  4. Review impact and save.
- Keep search pinned within the picker. After selection, replace the collection with a compact selected-Member summary and `Change` action.
- Preserve picker search/filter state and assignment draft state when moving between the picker and editor.
- Group custom permissions by domain and collapse groups by default.
- Keep View and Manage presets, but show a readable summary of their effect before save.
- Clearly explain that project permissions cannot exceed the organization role ceiling.
- Keep Project read warning and all existing payload behavior.
- Add unsaved-change confirmation and field-level date errors.

### 9.9 Workers

- Integrate standalone Workers with a compact app bar and persistent Workers-selected bottom navigation; when embedded, inherit Team navigation without duplication.
- Use assigned-to-project status as the first scanning dimension.
- Add shared filter chips for All, Assigned, and Unassigned; retain name/code/trade search.
- Use a virtualized Worker list with code, name, trade, assignment state, rate, and allocation period.
- Make Assign the primary row action only for unassigned Workers when permitted.
- Keep edit/end actions in a contextual sheet for assigned Workers.
- Keep the Add Worker action thumb-reachable and permission-gated.
- Preserve the distinction between organization Worker record and project assignment.
- Continue displaying the accurate online-only/degraded message.

### 9.10 Add Worker and assignment forms

- Use `New worker` / `Name` / `Create & assign`; do not repeat Worker in the title, visible first-field label, and submit action.
- Use `Assign {name}` / `Starts on` / `Assign`, and `{name}` with `Edit project allocation` / `Save changes` for existing assignments.
- Use visible labels and shared DateField/currency-or-number input behavior.
- Keep trade free text and present suggestions as reusable ChoiceChips.
- Show possible duplicates as selectable review rows with explicit acknowledgement.
- Do not enable Save until required fields and duplicate acknowledgement are satisfied.
- Preserve existing duplicate lookup timing and payload flag behavior unless separately approved.
- Keep assignment summary and date-only edit/end constraints.
- Use inline validation, submitting feedback, and success confirmation.

### 9.11 Organization Members

- Keep a visible Back path and omit bottom navigation because Members is a secondary administration destination.
- Use a compact title/count header and make subscription capacity a concise expandable summary rather than a large permanent block.
- Add search plus status/role/project-scope filters using reusable controls.
- Use a virtualized Member list with identity, email, organization role, status, designation, and project scope.
- Keep Invite Member as the single primary action when permitted.
- Keep actions permission-aware and inside a shared action sheet.
- Clearly distinguish Invited, Active, Inactive, and Suspended states with icon/text plus color.
- Preserve current self-role and self-deactivation safeguards.

### 9.12 Invite/edit Member

- Use the approved copy map: `Invite member` / concise identity-role labels / `Send invite`, and `Edit access` / `Save changes`.
- Group Identity, Organization Role, and Project Scope.
- Use a shared RoleOption/SelectableCard with readable description.
- Make designation explicitly informational and project access explicitly authorization-related.
- Keep server-provided compatible roles as the only selectable roles.
- Add field-level name/email/role errors, correct keyboards, autofill, loading, and unsaved-change protection.
- After invite, show delivery status, expiry, and a large Share Activation Link action.
- Preserve existing-email membership behavior and activation URLs.

### 9.13 Manage Member project assignments

- Keep the two-level workflow: select projects, then configure a selected project.
- Move the virtualized searchable project list into a focused full-screen selection step with clear selected/assigned/read-only states; do not keep an unbounded project collection in a general form sheet.
- Keep Completed and Archived projects visible but non-writable with an explanation.
- Show selected count and an impact summary before the batch save.
- Preserve save-together behavior, assignment payload construction, and unassignment handling.
- Reuse the same ProjectAssignmentEditor used by Project Team.

### 9.14 Menu and organization switching

- Organize Menu into Profile, Context, Organization Administration, Project Tools, App/Session, and Sign Out sections.
- Keep profile and current role visible without excessive card height.
- Use a shared organization switcher with active-state indication.
- Keep ProjectContextCard compact.
- Deduplicate destinations already present in bottom navigation; Menu remains the complete secondary-navigation index.
- Keep Refresh Access available with visible progress and completion feedback.
- Separate Sign Out spatially and visually from normal navigation.
- Preserve all organization-switch and sign-out behavior.

## 10. Required State Matrix

Every applicable screen or component must define and verify:

| State | Required behavior |
| --- | --- |
| Initial loading | Stable skeleton/loading label; no dead blank surface |
| Refreshing | Existing content remains visible where safe; refresh progress is clear |
| Populated | Primary job and current context are immediately scannable |
| Empty | Explain why it is empty and provide an authorized next action |
| Search empty | Preserve query and offer clear/reset guidance |
| Network failure | Explain connectivity and provide Retry |
| Degraded in-memory data | Mark data as already loaded, not persisted offline |
| Authentication expired | Use current sign-out/login recovery path |
| Permission changed | Refresh session, remove stale actions, explain changed access |
| Validation failure | Retain data; inline cause and recovery; announce error |
| Submitting | Disable repeat action; show progress in context |
| Success | Close/update at the correct time and provide non-blocking confirmation |
| Destructive confirmation | State the impact and preserve history semantics |
| Unsaved dismissal | Confirm before losing edits |
| Large text/reduced motion | Reflow correctly and remove nonessential motion |

## 11. Implementation Slices

No implementation slice begins until the spatial reference gate and the previous slice pass their exit criteria.

| Slice | Goal | Main work | Functionality-preservation gate |
| --- | --- | --- | --- |
| R | Spatial and interaction reference approval | Review the Worker, Project, Project Team, Organization Member, Project Detail, list-screen, full-screen picker, copy map, and complex-editor layouts from `docs/design/mobile-operational-layout-spec.md` at 375px and largest text | Owner approves hierarchy, field placement, navigation, selection behavior, copy, and space utilization; no app code changes |
| 0 | Freeze baseline | Document route/action/permission matrix; capture current screenshots; add representative fixture data; establish mobile component/state test harness if approved | Existing type-check plus route/role smoke passes before visual migration |
| 1 | Theme and primitives | Contrast audit, appearance decision, adaptive tokens, Button/Input/FormField/Search/selection/action/banner/skeleton/sheet primitives | Primitive tests; raw-color scan; no business files changed beyond imports |
| 2 | Protected shell and navigation | AppScaffold, persistent bottom nav, safe areas, back/state behavior, list scaffold | All current routes and redirects unchanged; max five tabs; deep links and back tested |
| 3 | Auth experience | Startup, Login, Activation | New/existing identity activation and login prefill behavior verified |
| 4 | Projects | Project detail, switcher, create/edit project | Project selection, create/update payloads, status transitions, permission visibility verified |
| 5 | Team | Team list, tabs, assignment editor, action sheets | Assign/update/unassign payloads and role-ceiling behavior verified |
| 6 | Workers | Virtualized roster, filters, create/duplicate/assign/edit/end flows | Online-only messaging and all worker/assignment behaviors verified |
| 7 | Members | Virtualized list, capacity, invite/edit/deactivate, project assignment | Invitation, self-protection, activation link, batch assignment behavior verified |
| 8 | Menu and system feedback | Organization switcher, refresh feedback, grouped navigation, sign out | Atomic context switch and stale-access removal verified |
| 9 | Adaptive/accessibility/performance hardening | Dynamic Type, screen reader, reduced motion, contrast, tablet/landscape, large datasets | Full device/accessibility/performance checklist passes |
| 10 | Role-matrix release gate | End-to-end physical-device smoke across supported roles and permissions | No release until functional and visual evidence is recorded separately |

## 12. Likely File Plan

Create or expand:

- `apps/mobile/src/components/common/app-scaffold.tsx`
- `apps/mobile/src/components/ui/search-field.tsx`
- `apps/mobile/src/components/ui/password-field.tsx`
- `apps/mobile/src/components/ui/date-field.tsx`
- `apps/mobile/src/components/ui/selectable-card.tsx`
- `apps/mobile/src/components/ui/segmented-control.tsx`
- `apps/mobile/src/components/ui/action-list-item.tsx`
- `apps/mobile/src/components/ui/status-banner.tsx`
- `apps/mobile/src/components/ui/skeleton.tsx`
- `apps/mobile/src/components/ui/confirm-dialog.tsx`
- `apps/mobile/src/components/ui/operational-entity-card.tsx`
- `apps/mobile/src/components/ui/quick-action-grid.tsx`
- `apps/mobile/src/components/common/collection-picker-screen.tsx`
- `apps/mobile/src/features/auth/components/**`
- `apps/mobile/src/features/projects/components/**`
- `apps/mobile/src/features/team/components/**`
- `apps/mobile/src/features/workers/components/**`
- `apps/mobile/src/features/members/components/**`

Update in narrow slices:

- Protected route layout and current route wrappers only as needed for the shared shell.
- Existing mobile UI primitives and barrel exports.
- Existing Home, Project, Menu, Members, Team, Workers, Login, and Activation screen composition.
- Shared theme tokens only when a missing semantic meaning is proven.
- Mobile design/development documentation and test fixtures.

Do not modify during presentation-only slices:

- API controllers/services/repositories.
- SQL migrations or database state.
- Shared permission/status/business constants.
- Web UI implementations.

## 13. Verification Strategy

### 13.1 Static checks

Run after every slice:

```text
pnpm --filter @nirman-app/mobile type-check
git diff --check
```

When shared theme declarations change, run sequentially:

```text
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/mobile type-check
```

Also scan redesigned screens/components for raw color literals and duplicated primitive patterns.

### 13.2 Automated UI/state tests

Add or approve a mobile test harness before broad migration. Cover:

- Permission-driven navigation visibility.
- Navigation orientation on every route: selected destination, Back, or Close.
- Standalone versus embedded Workers shell behavior.
- Direct-route permission redirects.
- Active organization/project changes.
- Loading, empty, error, degraded, and search-empty states.
- Form validation and payload preservation.
- Disabled/loading prevention of duplicate submissions.
- Member and Worker destructive confirmations.
- Bottom-sheet dismissal with and without unsaved changes.
- Full-screen picker virtualization, search, selection return, and draft preservation at 0/8/50/500 rows.
- Visible-copy concision with explicit accessibility names.
- Accessibility roles, labels, and selected/checked/disabled states.

### 13.3 Functional regression matrix

Verify at minimum:

- Login success/failure and activation email prefill.
- New-identity and existing-identity invitation activation.
- Organization switching and permission/project refresh.
- Project switching from Home/Menu and direct project opening.
- Project create/edit and invalid date ordering.
- Project Member assign/edit/custom permissions/unassign.
- Worker search/create/duplicate warning/assign/edit dates/end assignment.
- Organization Member search/invite/edit/activate/deactivate/project assignment/share link.
- Refresh Access and Sign Out.
- Cross-tenant/cross-project identifiers remain rejected by the API.

### 13.4 Device and visual matrix

Record evidence separately for:

- Small Android phone, large Android phone, and Android gesture navigation.
- iPhone simulator/device where available.
- Tablet portrait and landscape.
- Phone landscape.
- Light and dark appearance if dark mode is implemented.
- Largest supported system text size.
- Reduced motion.
- VoiceOver/TalkBack reading and action order for critical flows.
- Keyboard open on every long sheet and authentication form.
- Slow network, offline read failure, and mutation failure.
- Lists with representative large data volume.

### 13.5 Visual acceptance checklist

- No content is hidden under system bars, keyboard, bottom navigation, or sticky footers.
- No horizontal overflow or clipped labels at 375px.
- No layout-shifting pressed states.
- No unlabeled icon controls.
- No touch target below platform minimum.
- No normal text below 4.5:1 contrast.
- No state conveyed by color alone.
- No raw colors in screen or feature-component code.
- No screen-local recreation of a generic button, input, choice, action row, or sheet.
- One clear primary action per screen or workflow step.
- No top-level destination without persistent navigation, and no pushed/modal flow without Back or Close.
- No unknown or unbounded collection rendered inside a general-purpose bottom sheet.
- No repeated entity noun across title, adjacent field label, and CTA unless needed for domain disambiguation.
- No operational Project title above 24sp or three equal full-width navigation buttons on Project Detail.
- Home feels expressive; operational screens feel compact and fast.

## 14. Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| Visual refactor changes business behavior | Freeze behavior matrix; keep services/handlers untouched; verify payloads per slice |
| Dynamic navigation loses a permission edge case | Test each supported role and direct route; keep API as authority |
| Long lists become slow | Use FlatList/SectionList, stable keys, memoized rows, tuned windowing, and realistic volume tests |
| Sheets hide inputs or actions behind keyboard | Shared keyboard-safe sheet with safe-area footer and focused-field testing |
| Dense permission forms overwhelm users | Progressive disclosure, presets, grouped/collapsed permissions, review summary |
| Large text breaks two-column fields and badges | Responsive stacking, wrapping, no fixed text heights, Dynamic Type testing |
| Dark system appearance conflicts with light tokens | Implement real dual themes or explicitly force light until ready |
| New UI dependency creates platform/runtime risk | Prefer existing Expo/React Native capabilities; approve and isolate any date-picker, haptic, or test dependency |
| Existing dirty Home redesign is overwritten | Treat current Home/navigation work as the reference baseline and make narrow, reviewed patches |
| Success is claimed from static checks only | Report type-check, tests, runtime, browser/simulator, and physical-device evidence separately |

## 15. Open Decisions Before Slice 1

Owner decisions required:

1. Approve this product-wide redesign plan and slice order.
2. Choose appearance scope:
   - implement true light and dark themes; or
   - ship a fully tested light theme first and lock system appearance to light.
3. Approve adding a mobile component test harness and any required development dependencies.
4. Approve a platform date-picker dependency if an accessible existing Expo-native option is not available.
5. Confirm whether tablet support should be centered single-column first or include master/detail layouts in this redesign.

Recommended defaults:

- Complete and test light mode first, but do not leave automatic appearance enabled until dark mode is complete.
- Add the mobile test harness before migrating operational screens.
- Use centered responsive tablet layouts in the first redesign; introduce master/detail only after phone workflows are stable.
- Review one representative screen from each family before bulk migration: Login, Project Detail, Workers, Members, and one complex assignment sheet.

## 16. Exit Criteria

The full redesign is complete only when:

- Every current route has been migrated to the approved app shell and component system.
- Every existing user action and permission gate passes the functional regression matrix.
- Generic visual controls are implemented once and reused.
- Feature screens contain composition/workflow logic rather than copied primitive styling.
- Long operational lists are virtualized and remain responsive with realistic volumes.
- All required states are implemented and verified.
- Navigation remains predictable, permission-aware, deep-linkable, and reachable.
- Small phone, large phone, tablet, portrait, landscape, keyboard, Dynamic Type, reduced motion, and supported appearance checks pass.
- Accessibility labels/states, touch targets, contrast, and focus order pass critical-flow review.
- Static checks, automated tests, simulator/runtime smoke, and physical-device evidence are reported separately and honestly.
- No API, data, permission, or business behavior changed without its own approved contract.
