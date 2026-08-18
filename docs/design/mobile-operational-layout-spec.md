# NirmanSite Mobile Operational Layout Specification

## 1. Status And Purpose

- Status: Approved direction; phased implementation started
- Last updated: 2026-08-18
- Scope: Visual hierarchy, information density, reusable record cards, list screens, detail screens, forms, navigation, selection flows, and UI copy
- Implementation status: Shared foundations plus the first Project, Workers, Team, and Members migrations are in progress; the user authorized implementation on 2026-08-18

This specification corrects the earlier redesign plan, which defined general principles but did not define how operational content must use the horizontal and vertical space inside cards.

The core correction is:

> Do not place every attribute on a separate full-width row. Use a stable two-column hierarchy with a compact contextual header, primary identity/value row, and context/status footer.

## 2. Research Synthesis

`ui-ux-pro-max` was queried specifically for compact mobile cards, information density, compact labels, touch feedback, and React Native list behavior.

Applicable findings:

- Use a consistent modular type hierarchy to make dense information scannable.
- Badges represent static state; interactive filters/actions use chips or buttons with the correct selected/pressed semantics.
- Compact badges should remain on one line; collections wrap rather than clipping labels.
- Touch targets remain at least 44pt on iOS and 48dp on Android with visible press feedback.
- Dense operational layouts can use 8–12dp internal gaps and compact padding, but must retain text contrast, focus order, and reduced-motion behavior.
- React Native list items should be memoized and use stable keys inside FlatList/SectionList.
- A top app bar is the consistent location for a concise title, navigation control, and only the most important actions.
- Persistent bottom navigation should contain three to five top-level destinations and remain stable between those destinations.
- Modality is appropriate for a distinct, narrowly scoped interruption; it is not the navigation container for an unknown or unbounded collection.

The local database returned no verified pattern specifically for “trailing metadata list row” after the required retry. The following platform sources therefore control that detail:

- [Material 3 ListItem](https://developer.android.com/reference/kotlin/androidx/compose/material3/ListItem.composable) explicitly separates overline, primary/headline, supporting, leading, and trailing content. Trailing content may contain metadata, status controls, or icons.
- [Apple Lists and Tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables) recommends row styles that fit the information and keep text easy to scan.
- [Apple Layout](https://developer.apple.com/design/human-interface-guidelines/layout) recommends alignment, reading-order hierarchy, grouping, progressive disclosure, and adaptability.
- [React Native FlatList optimization](https://reactnative.dev/docs/optimizing-flatlist-configuration) supports stable, lightweight, memoized records for long lists.
- [Apple Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars) recommends keeping top-level navigation visible and consistent so the interface does not feel unstable.
- [Apple Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars) recommends concise titles and standard Back/Close controls, and permits omitting a title when the surrounding content already supplies the context.
- [Apple Modality](https://developer.apple.com/design/human-interface-guidelines/modality) reserves modal presentation for focused choices or distinct tasks.
- [Apple Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets) says sheet interactions should be brief and should not be used to navigate app content.
- [Material navigation bars](https://developer.android.com/develop/ui/compose/components/navigation-bar) recommends three to five consistent destinations on compact screens.
- [Material app bars](https://developer.android.com/develop/ui/compose/components/app-bars) defines the top app bar as the place for the screen title, navigation icon, and key actions.

This is not a direct copy of Material or Apple styling. It translates their information architecture into NirmanSite’s olive/copper, soft-glass, construction-field visual system.

## 3. Compact Operational Card Standard

### 3.1 Card anatomy

Every repeatable operational entity card uses up to three bands:

```text
┌────────────────────────────────────────┐
│ IDENTIFIER / CATEGORY     TYPE / SCOPE │  A. Context strip
├────────────────────────────────────────┤
│ Primary identity          Key value    │  B. Primary row
│ Supporting identity       Value label  │
├────────────────────────────────────────┤
│ Context / date / location      STATUS  │  C. Footer row
└────────────────────────────────────────┘
```

Rules:

- The left column carries identity and reading order.
- The right column carries a comparable value, type, scope, status, or action.
- The right column must not remain empty when meaningful existing data is available.
- The primary name is the strongest text in the body.
- Numeric/rate values are right-aligned and use tabular figures where supported.
- The header strip gives category context; it is not a decorative hero unrelated to data.
- The strip is a soft layered/tinted surface with rounded top corners, matching the approved logo board’s glass-and-sage language; it must not look like a hard rectangular table header.
- Status stays a text badge with semantic color and never relies on strip color alone.
- The whole card may open details; a trailing overflow button is separate only when immediate actions are required.
- A card must not contain another generic Card.

### 3.2 Space budget

Phone target at standard text size:

| Area | Target |
| --- | --- |
| Card width | Full available list width |
| Outer radius | 18–22dp |
| Header strip height | 32–36dp |
| Body vertical padding | 12–14dp |
| Footer height | 32–40dp |
| Typical total height | 116–132dp |
| Gap between cards | 10–12dp |
| Left column | Flexible, minimum width zero |
| Right column | Content-sized, maximum approximately 40% |

The screen target is approximately 2.5–3 operational cards visible on a common 375×812 phone after the compact header/search controls, without hiding content behind the bottom navigation.

### 3.3 Typography

| Content | Style direction |
| --- | --- |
| Header identifier | 12–13sp, bold, uppercase or code-preserving, olive/copper emphasis |
| Header type/scope | 12–13sp, semibold, right aligned |
| Primary identity | 16–18sp, bold, maximum two lines |
| Key value | 16–18sp, bold, right aligned, tabular figures for numbers |
| Value label | 12sp, secondary text, positioned directly below value |
| Supporting/footer | 12–14sp, secondary text |
| Status | Single-line semantic Badge with text |

### 3.4 Color treatment

- Default context strip: `color.brand.primarySoft` or `color.surface.mist`.
- Blueprint/context variant: `color.surface.blueprint`.
- A restrained sage or blueprint gradient may be introduced through semantic tokens when it improves separation and passes contrast; do not hardcode it in a feature card.
- Selected/current strip: restrained copper tint using a semantic selected token.
- Identifier: `color.text.brand` or `color.text.accent` depending on meaning.
- Rate/key numeric value: copper action/accent foreground with a light warm supporting surface when contrast passes.
- Status: existing semantic status tokens.
- Do not use a different arbitrary strip color for each entity type.
- Do not fill the whole card red/green/orange merely to show state.

### 3.5 Responsive fallback

Space efficiency must not break accessibility.

- At large Dynamic Type, narrow landscape splits, or long localized labels, the right column moves below its paired left content.
- The accessible reading order remains identifier, type, name, value, context, status.
- Header labels remain single-line when practical; unavoidable truncation must preserve the full accessible label.
- Status and action controls never overlap the primary name.
- RTL layouts mirror the visual columns while preserving semantic order.

### 3.6 Semantic color language

NirmanSite uses a small, learnable color vocabulary sourced only from shared palette tokens. Color reinforces meaning but never replaces the visible label, icon, accessibility name, or confirmation copy.

| Color family | Stable meaning | Examples |
| --- | --- | --- |
| Copper (`action.primary`) | Create, add, invite, assign, send, or make the primary commitment | Assign, Create & assign, Send invite |
| Olive (`brand.primary`) | Edit, save an existing record, activate, or positively maintain | Edit, Save changes, Activate |
| Blueprint (`brand.blueprint` / `status.info`) | Selected context, view, choose, manage, configure, switch, or share | Current project, Choose member, Manage projects, Configure access, Share link |
| Deep success green (`status.success.foreground`) | Active lifecycle state with strong separation from pale sage surfaces | Active |
| Soft success green (`status.success`) | Healthy or completed operational state | Assigned, Completed, Email sent |
| Amber (`status.warning`) | Needs attention or is not yet operational | Unassigned, Invited, Pending, Draft, On hold |
| Red (`status.danger`) | Stopped, failed, unavailable, or destructive | Inactive, Suspended, Failed, End assignment, Deactivate |
| Neutral sage | Informational metadata or a reversible secondary action | Counts, role default, Cancel |

Rules:

- A meaning receives the same color family on cards, badges, action rows, buttons, pickers, and confirmations.
- Status cards use a restrained colored context rail/tint plus a readable status badge; never fill the whole card with a saturated state color.
- Create/assign and edit/save are intentionally different families so frequent users can recognize intent before reading the full label.
- Destructive red is reserved for destructive actions and terminal/problem states; it is never used as decoration.
- Purple is not part of the core operational vocabulary and requires an explicitly documented new semantic category.
- Disabled controls reduce emphasis but do not change to another semantic family.

## 4. Worker Card — Approved Direction For Review

### 4.1 Assigned Worker

```text
┌────────────────────────────────────────┐
│ WRK-0042                         MASON │  sage/blueprint strip
├────────────────────────────────────────┤
│ Ramesh Kumar                 ₹850/day │
│                              RATE      │
├────────────────────────────────────────┤
│ 12 Aug 2026 → Ongoing        ASSIGNED │
└────────────────────────────────────────┘
```

Mapping:

| Position | Data |
| --- | --- |
| Header left | `workerCode` |
| Header right | `trade` |
| Body left | `name` |
| Body right | Effective displayed Rate plus `/day` |
| Rate label | `Rate`, not `Daily Rate` |
| Footer left | Current project allocation date range |
| Footer right | `ASSIGNED` status Badge |

Rate-source decision for implementation review:

- Assigned card should display `currentAssignment.dailyRate` when present because it is the project allocation rate.
- If assignment rate is null, fall back to `baseDailyRate` and expose that it is the base rate in accessibility text or detail context.
- Unassigned card displays `baseDailyRate`.
- Null is displayed as `Not set`, never `0`.

### 4.2 Unassigned Worker

```text
┌────────────────────────────────────────┐
│ WRK-0049                    ELECTRICIAN│
├────────────────────────────────────────┤
│ Abdul Rahman                ₹1,100/day│
│                              RATE      │
├────────────────────────────────────────┤
│ No current project           UNASSIGNED│
└────────────────────────────────────────┘
```

Interaction:

- Tapping an assigned card opens Worker assignment actions if permitted.
- Tapping an unassigned card uses the existing Assign behavior when permitted.
- If the entire card is interactive, do not place a competing full-width Assign button inside it; use a small explicit trailing action or make the card action clear through label/chevron.
- Users without action permission receive an informational card with no false tap affordance.

## 5. Project Cards

### 5.1 Home portfolio Project card

Available session data does not include type, address, or dates, so the card must not invent them.

```text
┌────────────────────────────────────────┐
│ NS-P-104                       ACTIVE │
├────────────────────────────────────────┤
│ Green Heights                    OPEN │
│ Site Supervisor             [open icon]│
├────────────────────────────────────────┤
│ Assigned project                 CURRENT│
└────────────────────────────────────────┘
```

Mapping:

- Header left: project code or `PROJECT`.
- Header right: project status.
- Body left: project name and role label.
- Body right: Open affordance.
- Footer: access context and Current badge when selected.

### 5.2 Project detail summary

The full Project detail payload can use:

```text
┌────────────────────────────────────────┐
│ NS-P-104                  RESIDENTIAL │
├────────────────────────────────────────┤
│ Green Heights                 ACTIVE  │
│ Pune, Maharashtra                     │
├────────────────────────────────────────┤
│ 12 Aug 2026 → 30 Jun 2028       EDIT >│
└────────────────────────────────────────┘
```

- Status and Edit remain permission-aware.
- Missing address/dates collapse cleanly instead of leaving blank placeholder rows.

## 6. Project Team Member Card

```text
┌────────────────────────────────────────┐
│ CONTRACTOR MEMBER       SITE SUPERVISOR│
├────────────────────────────────────────┤
│ Suresh Patil                  ACTIVE  │
│ suresh@example.com                    │
├────────────────────────────────────────┤
│ 12 Aug → Ongoing          ROLE DEFAULT│
└────────────────────────────────────────┘
```

Mapping:

- Header left: organization role.
- Header right: project responsibility (`roleLabel`) or `Project member`.
- Body left: name and email.
- Body right: assignment status.
- Footer left: access date range.
- Footer right: `Role default` or readable custom-action count.
- Overflow action appears only when Edit or End Assignment is allowed.

## 7. Organization Member Card

```text
┌────────────────────────────────────────┐
│ BUILDER ADMIN              ALL PROJECTS│
├────────────────────────────────────────┤
│ Priya Sharma                  ACTIVE  │
│ priya@example.com                     │
├────────────────────────────────────────┤
│ Project Manager              4 PROJECTS│
└────────────────────────────────────────┘
```

Mapping:

- Header left: organization role.
- Header right: `All projects`, `Unassigned`, or project count.
- Body left: member name and email.
- Body right: membership status.
- Footer left: designation or `No designation` only when that absence is useful.
- Footer right: active project count or action affordance, without duplicating header scope.

Refinement rule:

- If scope is already shown precisely in the header, the footer right becomes the overflow action rather than repeating the count.
- Invited members show invitation state and the most relevant next action, not empty project metadata.

## 8. Project Assignment Selection Card

```text
┌────────────────────────────────────────┐
│ NS-P-104                       ACTIVE │
├────────────────────────────────────────┤
│ Green Heights              [SELECTED] │
│ Existing assignment                   │
├────────────────────────────────────────┤
│ Role defaults            CONFIGURE >  │
└────────────────────────────────────────┘
```

- Header: project code and project lifecycle status.
- Body: project identity and checkbox state.
- Footer: assignment summary and Configure action.
- Completed/Archived uses visible read-only treatment and explains why it cannot be changed.
- Checkbox semantics belong to the whole selection region, not a tiny 28dp target alone.

## 9. Invitation Result Card

```text
┌────────────────────────────────────────┐
│ EMAIL SENT          EXPIRES 24 AUG 2026│
├────────────────────────────────────────┤
│ Priya Sharma                          │
│ priya@example.com                     │
├────────────────────────────────────────┤
│ Builder Admin           SHARE LINK >  │
└────────────────────────────────────────┘
```

- Delivery status and expiry stay visible together.
- Share Activation Link is a clear labeled action.
- Failed delivery uses warning state plus Share fallback; it does not imply the invitation itself failed if it was created.

## 10. Screen-Level Space Budgets

### 10.1 Operational list screens

Applies to Workers, Project Team, and Organization Members.

```text
┌────────────────────────────────────────┐
│ Compact back/context header      + Add│  52–64dp
│ Search field               Filters   │  48dp + optional 40dp
│ Result count / active filter summary │  24–32dp
│ ┌────────────────────────────────────┐ │
│ │ Operational entity card          │ │  116–132dp
│ └────────────────────────────────────┘ │
│ ┌────────────────────────────────────┐ │
│ │ Operational entity card          │ │
│ └────────────────────────────────────┘ │
│             next card preview          │
│ ───── persistent bottom navigation ─── │
└────────────────────────────────────────┘
```

Rules:

- Do not place a large explanatory intro card above every list.
- Put the project/organization context in the compact header subtitle.
- Search and filters are the only persistent controls above the list.
- Capacity or availability summaries collapse into a one-row banner/summary unless the user expands them.
- The first record should normally begin within approximately 160–190dp below the top safe area.

### 10.2 Detail screens

- Identity summary: maximum approximately 132–156dp at standard text size.
- First primary action should appear without scrolling on common phone height.
- Use grouped ActionListItems rather than multiple full-width buttons separated by large gaps.
- Secondary metadata uses a two-column DefinitionGrid: label/value pairs across the width.

### 10.3 Home

- Home remains the single expressive exception with the larger project hero and bento layout.
- The next actionable section must remain visibly cued below the hero.
- Project portfolio uses the compact Project card standard.

### 10.4 Menu

- Use grouped flat list rows rather than giving every destination its own card.
- Profile/context block should not consume more than approximately 140–160dp before the first navigation group.
- Sign Out remains isolated at the bottom.

## 11. Forms And Sheets Space Strategy

- Bottom-sheet title and description together should normally stay within 72–88dp.
- Footer is sticky, keyboard-safe, and bottom-safe-area aware.
- Form content scrolls independently without nested horizontal scrolling.
- Use a two-column FieldRow only for compatible short inputs such as City/State or Start/End date.
- FieldRow becomes stacked at large text or insufficient width.
- Role/permission selection uses compact SelectableCard rows with trailing check state, not large empty cards.
- Custom permission groups are collapsed until opened.
- Summaries use label/value rows instead of multiple explanatory cards.
- Errors appear within the field rhythm and do not create unexpected card-width changes.

## 12. Reusable Component Model

The design should be implemented through reusable slots, not separate copied card styles.

Conceptual component family:

```text
OperationalEntityCard
├── EntityContextStrip
│   ├── leading identifier/category
│   └── trailing type/scope
├── EntityPrimaryRow
│   ├── primary + supporting identity
│   └── key value + label/status
└── EntityFooterRow
    ├── date/location/context
    └── status/action
```

Feature components provide data mapping:

- `WorkerRosterCard`
- `ProjectPortfolioCard`
- `ProjectSummaryCard`
- `ProjectTeamMemberCard`
- `OrganizationMemberCard`
- `ProjectAssignmentCard`
- `InvitationResultCard`

The generic component owns spacing, strip shape, responsive reflow, press state, accessibility ordering, truncation, and column widths. Feature components own field selection, labels, permissions, and callbacks.

## 13. Content And Copy Standard

The screen title establishes the current object or task. Field labels identify data. The primary action states the result. These three layers must not repeat the same noun without adding meaning.

### 13.1 Repetition rule

- An entity noun should normally appear only once across the title, immediately adjacent visible field labels, and primary action.
- Repeat the noun only when needed to distinguish two domain concepts, especially Member versus Worker, organization role versus project responsibility, or base rate versus assignment rate.
- A helper line explains consequence, format, scope, or recovery. It must not restate the title or label.
- Visible labels may be concise when the screen provides unambiguous context. The accessibility label remains explicit and self-contained.
- Buttons use a verb or outcome: `Create`, `Save changes`, `Assign`, `Send invite`, `End assignment`. Avoid `Open Project Team`, `Save Worker`, or `Create Project` when the surrounding context already identifies the object.
- Loading text uses the same verb and an ellipsis: `Creating…`, `Saving…`, `Assigning…`.
- Use sentence case everywhere except stored codes, status values, and compact context-strip labels.
- Do not include `new` and `create/add` in all three layers of the same form.

### 13.2 Approved form copy map

| Current flow | Title | Visible labels that change | Primary action | Context/helper copy |
| --- | --- | --- | --- | --- |
| Create Worker and assign | `New worker` | `Name`, `Trade`, `Mobile`, `Rate` | `Create & assign` | `Create the record and add it to {project}.` |
| Assign existing Worker | `Assign {name}` | `Starts on` | `Assign` | Show trade and effective rate in a compact summary |
| Edit Worker allocation | `{name}` | `Starts on`, `Ends on` | `Save changes` | `Edit project allocation`; explain that trade and base rate are unchanged |
| End Worker allocation | `End assignment?` | `Ends on`, `Reason` | `End assignment` | Show Worker identity before the consequence |
| Create Project | `New project` | `Name`, `Code`, `Type`, `Status` | `Create` | Group remaining fields under Location, Timeline, and Details |
| Edit Project | `Edit project` | Same concise labels | `Save changes` | Show the Project name in a compact context row |
| Invite Member | `Invite member` | `Name`, `Email`, `Mobile`, `Role` | `Send invite` | Keep designation and project-scope meaning explicit |
| Edit Member | `Edit access` | `Role`, `Designation`, `Project scope` | `Save changes` | Show the Member identity above the fields |
| Assign Project Member | Step 1 `Choose member`; Step 2 `Set project access` | `Responsibility`, `Starts on`, `Ends on`, `Access` | `Assign` | Preserve the selected Member summary between steps |

`Rate` is the concise visible label in Worker context. The input accessibility label remains `Base daily rate`, and assigned-card accessibility text identifies an assignment rate when applicable.

### 13.3 Forms and buttons

- Do not use a large introductory card to repeat the form purpose.
- Keep one sticky primary action. Cancel is a standard close/back control or a quiet secondary footer action.
- A destructive confirmation uses the destructive verb and names the affected record in the confirmation body, not repeatedly in every control.
- Permission-limited screens hide unavailable actions without leaving blank action slots.
- The CTA width follows context: full-width for a single irreversible or high-confidence form completion; intrinsic or half-row width when paired with Cancel inside a sticky footer.

## 14. Navigation And Orientation Standard

Every screen must expose at least one clear orientation path: a selected top-level destination, a visible Back control for a pushed route, or a Close/Cancel control for a modal task. System back behavior remains predictable in all cases.

### 14.1 Protected app shell

- Home, Team, Project, and Workers are the permission-derived top-level destinations and use one persistent bottom navigation.
- Menu is a secondary utility route opened from the Home header. It is not a fifth bottom-navigation destination.
- A top-level destination does not need a Back button solely to imitate a hierarchy; its selected bottom-navigation item supplies orientation.
- A secondary route such as Menu or Organization Members shows a compact Back/Close control and does not render bottom navigation with a false selected destination.
- A focused full-screen picker or multi-step editor may hide bottom navigation only when it has a visible Back/Close path and preserves the parent state.
- Cross-links from Project detail to Team or Workers navigate to that top-level destination with the correct project context and selected navigation item. They do not create an unexplained navigation dead end.
- Direct links and permission redirects retain their current route contracts.

### 14.2 Current Project Workers finding

The standalone Project Workers screen now includes both a compact Back control and Workers-selected bottom navigation; this is the required orientation standard for the route.

Approved behavior:

- Standalone Workers: compact top app bar, current Project subtitle/switch affordance, Add action when permitted, and persistent bottom navigation with Workers selected.
- Workers inside Project Team: inherit the Team header, Back behavior, segmented tab state, and Team-selected navigation; do not render a second header or second bottom bar.
- No selected Project: keep Workers selected and show a contextual recovery action to choose a Project.

### 14.3 Header contract

```text
┌────────────────────────────────────────┐
│ [Back when pushed]  Short title   [Act]│
│                     Context subtitle   │
└────────────────────────────────────────┘
```

- Use a one- or two-word operational title where possible: `Workers`, `Team`, `Members`, `Project`.
- Put the current Project or Organization name in a single-line subtitle with a full accessibility label.
- Reserve the trailing position for one high-frequency action. Put lower-frequency actions in the entity/action sheet.
- Use the standard arrow Back icon and Close icon consistently; do not substitute arbitrary icons or labels.
- The title row remains 52–64dp at standard text size and reflows safely at large text.

## 15. Long-Collection Selection Standard

A bottom sheet containing a mapped, potentially long Member or Project collection is not approved. The number of candidates is unbounded, the keyboard reduces the visible sheet, and the current `map` implementation is not virtualized.

### 15.1 Presentation decision

| Content | Approved container |
| --- | --- |
| Short fixed actions, confirmations, or a bounded choice of roughly eight or fewer items | Bottom sheet/action sheet |
| Unknown, growing, searchable, filterable, or virtualized collection | Full-screen picker or focused full-height selection route |
| Long multi-section form | Full-screen editor or explicit steps; not a sheet nested inside another sheet |

### 15.2 Project Member assignment flow

```text
Team list
   → Choose member (full-screen FlatList)
      → Set project access (focused editor)
         → Review/save
         → Return to Team with result visible
```

Choose Member requirements:

- Compact Back/Close header titled `Choose member`.
- Search remains visible while results scroll; use `SearchField`, not a label plus duplicate placeholder.
- Virtualized `FlatList` with stable keys, memoized rows, and a stable row layout.
- Show active unassigned Members only, matching existing business behavior.
- Each row shows name, email when available, organization role, and selected check state.
- Show result count and loading, error, no-members, and no-match states.
- Return selection to the editor without discarding search, filters, or draft assignment data.
- If the selected Member changes, refresh the role-ceiling summary before custom permissions are saved.
- Client-side search is acceptable for the current already-loaded data contract. API pagination is a separate contract decision if organization size later exceeds a safe response size.

After selection, the editor shows a compact selected-Member summary with `Change` rather than continuing to display the whole collection.

## 16. Project Detail Composition

The Project detail header is an operational identity surface, not a Home hero. A 28–34sp name that wraps a three-word Project into three lines consumes the first viewport and weakens the actions below it.

### 16.1 Approved identity and action layout

```text
┌────────────────────────────────────────┐
│ NS-P-104             RESIDENTIAL ACTIVE│
├────────────────────────────────────────┤
│ Green Heights Redevelopment            │  max 2 lines, 22–24sp
│ Pune, Maharashtra                      │
├───────────────────┬────────────────────┤
│ [people] Team   > │ [helmet] Workers > │  equal quick links
└───────────────────┴────────────────────┘
                         [pencil] Edit
```

- Project name uses 22–24sp, semibold/bold, a balanced line height, maximum two visual lines at standard text size, and responsive reflow rather than clipping at large text.
- The code, type, and status use the compact context strip. Missing values collapse without filler such as `No project code` unless the absence needs action.
- Team and Workers become equal icon-plus-text quick links with at least 48dp targets; their accessible names remain `Open project team` and `Open project workers`.
- Edit is a permission-aware tertiary icon/text action in the header or summary footer, not a third full-width button of equal prominence.
- If only one quick link is authorized, it may span the available action row. Hidden actions leave no empty column.
- The summary card target is approximately 156–184dp including quick links at standard text size.
- Organization and access metadata use a compact two-column definition grid or disclosure section below the identity card, not a second oversized card.

## 17. Current-Screen Consistency Audit

This is the minimum migration map. Every current route remains in scope even when the reported issue occurred on only one screen.

| Screen/flow | Current inconsistency | Required redesign correction |
| --- | --- | --- |
| Startup | Generic waiting state can feel disconnected from the product | Branded lightweight state, stable layout, honest timeout/error recovery |
| Login | Context and labels are not consistently explicit | Concise title, visible labels, autofill/password control, keyboard-safe primary action |
| Invitation activation | Multiple activation states share one long surface | State-based progressive layout with explicit Back/Login path and preserved token behavior |
| Home | Expressive layout is the current visual reference | Preserve brand hero; keep portfolio cards compact and all destinations permission-driven |
| Project detail | Oversized name and three full-width action buttons waste the first viewport | Compact identity card, 22–24sp two-line name, two-column Team/Workers quick links, tertiary Edit |
| Create/edit Project | `Create project`, `Project name`, and `Create project` repeat context | `New project`, `Name`, `Create`; progressive groups and sticky action |
| Project Team | Member list is non-virtualized and shell behavior differs from other top-level screens | Persistent Team navigation, compact project header, segmented Members/Workers, virtualized list |
| Assign Project Member | Searchable unbounded Member collection is mapped inside a form sheet | Full-screen virtualized Choose Member step followed by focused access editor |
| Workers | Standalone route has no bottom nav or Back; cards stack facts and waste the trailing column | Persistent Workers navigation, compact context header, operational Worker cards, virtualized list |
| Add Worker | `Add new worker`, `Worker name`, and `Save worker` repeat the entity | `New worker`, `Name`, `Create & assign`; retain duplicate acknowledgement and payload behavior |
| Worker allocation | Titles/buttons repeat Worker/assignment terminology | Concise identity context, action-only CTA, unchanged date and rate rules |
| Organization Members | Secondary route uses a different shell and list is non-virtualized | Compact Back path, no false bottom-tab selection, compact capacity summary, virtualized filtered list |
| Invite/edit Member | Titles and save labels repeat Member context | Concise copy map, grouped role/scope fields, unchanged invitation/self-protection behavior |
| Member project assignments | Searchable project collection and configuration share a long sheet | Full-screen virtualized project selection, then focused project-access editor |
| Menu | Destinations can duplicate primary navigation and consume card space | Grouped flat rows, compact context, no redundant top-level links, isolated Sign Out |

Consistency means shared structure and interaction rules, not making every screen visually identical. Home may be expressive; operational lists, pickers, details, and forms each use their own approved family.

## 18. Review Gates Before Implementation

No full-app implementation begins until these layouts are reviewed in this order:

1. Worker card at 375px with assigned, unassigned, long name, missing rate, and large text.
2. Project card at 375px using only fields available in the session summary.
3. Project Team and Organization Member cards with long role/responsibility labels.
4. One list screen showing header, search, filters, three cards, and persistent navigation.
5. Project detail at 375px with a long three-word name and each permission combination for Team, Workers, and Edit.
6. Choose Member with 0, 8, 50, and 500 representative rows, keyboard open, no-match, and selection-return states.
7. Add Worker, Create Project, and Edit Member copy maps at standard and largest text sizes.
8. One complex assignment editor with keyboard open, sticky footer, and unsaved-change protection.

Required comparison for each review:

- Current screen screenshot.
- Proposed standard text screenshot.
- Largest text screenshot.
- Empty/loading/error version.
- Permission-limited version.
- Exact field-to-position mapping.

Only after these are approved should the shared component and feature migrations be implemented.
