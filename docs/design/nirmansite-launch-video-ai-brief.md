# NirmanSite — product overview and launch-video brief

Prepared 28 September 2026. Share this entire document with the AI producing the video.

## Assignment

Create a polished launch video for **NirmanSite**, a mobile-first construction management app with a separate desktop web workspace. First explore the supplied applications, then develop the storyboard, capture the actual interfaces, and produce the video using those captures and supporting motion graphics.

Use this brief as product context. Treat the accessible application as the authority for exact screen appearance, labels, available actions, and demonstrated behavior. This brief was checked against repository source and selected product contracts; it is not an authenticated runtime certification of every feature.

Suggested creative starting point: a 60-second English launch film, with a 16:9 master and a separately composed 9:16 social version. These are proposed defaults, not approved campaign requirements. Use “Book a demo” as the draft CTA; obtain the final destination and campaign wording from the owner.

## Product in one paragraph

NirmanSite helps builders, contractors, supervisors, project managers, and real-estate sales teams organize daily work around their construction projects. Field teams use the mobile app to work with attendance, worker advances, wages, materials, site expenses, progress, project photos, and sales activity. Owners and office teams use the web app for project review, detailed records, team management, and operational follow-through. Both clients connect to the same backend and use organization, project, and permission context to determine what each person can see and do.

Suggested positioning: **“Your site work. Your office view. One connected workspace.”** This is proposed campaign copy, not an existing official tagline.

## Audience and problem

The primary audience is builders and contractors in the Indian construction market. Other users include supervisors, project managers, office staff, and sales teams.

The problem is familiar: attendance in registers, advances remembered verbally, expenses scattered across messages, progress shared through disconnected photos, and leads followed up separately. NirmanSite brings these operational records into project-based workflows so teams can record work and review it with context.

Make the film feel grounded in a working construction business. Lead with clarity, coordination, and visibility. Avoid invented savings percentages, customer counts, testimonials, or guaranteed outcomes.

## Two distinct product surfaces

| Surface | Purpose | Video treatment |
| --- | --- | --- |
| Mobile app | Daily field work, quick capture, project actions, and role-relevant tasks | Portrait compositions, readable close-ups, deliberate taps, short action sequences |
| Mobile browser preview | Browser-rendered version of the Expo mobile app | Useful for capturing the mobile interface; it does not establish native device behavior |
| Web app | Separate desktop workspace for operations and office oversight | Wide compositions showing navigation, lists, detail views, filters, and project context |

Show both actual clients. Do not stretch the mobile preview into a desktop frame and label it the web app. Shared data does not establish instant live updates: demonstrate the actual refresh behavior before suggesting automatic synchronization.

## Feature overview and useful screen candidates

These areas have current client source. Select only those that load and behave correctly in the supplied environment; source presence alone does not prove deployment readiness or complete parity.

| Area | Plain-language value | Screens or flows to inspect |
| --- | --- | --- |
| Projects and dashboards | Keep work organized around the selected project and the user's responsibilities | Home, project selection, project details, role-relevant summaries |
| Workers and team | Organize the workforce and project responsibilities | Worker list/detail, team, members, project assignments |
| Attendance and work calendar | Record daily attendance in project and calendar context | Date/project selection, attendance marking, attendance review, work calendar |
| Kharchi / worker advances | Track money already given to workers against future wages | Advance list/detail, outstanding balances, worker context |
| Wages | Review wage calculations using attendance, applicable rates, and advance adjustments | Wage preview, worker breakdown, batch details; only show confirmation with permission |
| Materials | Keep material records and configured approval steps visible | Materials list, entry detail, status and approval controls available to the demo role |
| Site expenses | Organize site spending and its review history | Expense list, detail, category/date/amount, supported review controls |
| Progress | Record construction-stage progress and retain update history | Stage overview, progress detail/history, update form |
| Gallery / project diary | Keep project photos together for visual review | Populated gallery, photo viewer, actual available captions or metadata |
| Sales | Keep leads and their next actions organized | Leads, lead detail, follow-ups, site visits, unit inventory and bookings if accessible |
| Notifications | Surface relevant in-app updates | Inbox, unread state, navigation to a related record |

Explain “Kharchi” on first use as **worker advances**. Recording an advance or wage payment is not evidence that NirmanSite transfers money through a bank.

Mobile localization resources exist for English, Hindi, and Gujarati. A language-switch shot is optional and must be checked in the running app. Do not imply identical language support across both clients without verification.

## Recommended story

Use one fictional project consistently across both clients. Follow a supervisor's morning work into the owner's office review, then finish with a short sales sequence. Keep project names, dates, worker names, and amounts consistent across shots. Capture enough context that a viewer understands the task before zooming into a detail.

| Time | Story beat | Suggested imagery | Draft on-screen copy |
| --- | --- | --- | --- |
| 0–6s | Daily work is scattered | Brief abstract treatment of a register, receipts, messages, and project photos | “Every site. So many moving parts.” |
| 6–12s | Introduce NirmanSite | Logo reveal into the actual mobile project dashboard | “Bring the day into focus.” |
| 12–23s | Start with the workforce | Attendance → worker advance detail → wage breakdown | “Attendance. Advances. Wages.” |
| 23–33s | Organize site operations | Material record → expense detail; show real status labels | “Keep site records together.” |
| 33–42s | See progress | Stage progress → project gallery | “See how work is moving.” |
| 42–49s | Bring office oversight into frame | Mobile beside the separate web project workspace; matched project context | “From the site to the office.” |
| 49–55s | Keep the next sales action visible | Lead detail → follow-up or site visit | “Keep the next step in view.” |
| 55–60s | Brand and invitation | Mobile and desktop hero composition, logo, CTA | “NirmanSite. Book a demo.” |

If a sequence is unavailable, replace it with another verified flow and revise the copy. Do not manufacture a successful approval, booking, notification, or cross-client update to preserve the storyboard.

### Draft voiceover

“Every construction project brings people, payments, materials, and decisions together. Keeping track should feel simpler. Meet NirmanSite. Record attendance, track worker advances, and review wages in project context. Keep material records and site expenses organized. Follow construction progress and bring project photos into one place. Give field teams a mobile workspace, and owners an office view through the web app. Keep sales leads, follow-ups, and site visits in focus. From the first task of the day to the next project review, bring your team around a shared picture of the work. NirmanSite. Book a demo.”

Time this against the final edit and shorten it where necessary. Allow space for UI reading and the end card.

## Visual and motion direction

Use the actual NirmanSite identity. Current shared palette: olive `#676F4B`, copper `#C16C31`, dark coffee `#2A211B`, warm page background `#F7F5EF`, and sage `#EAF2EC`. Manrope is used in the brand/UI typography. Follow the captured UI where surface details differ.

Aim for warm, confident, practical presentation: construction context, clear typography, subtle depth, and ample space around device frames. Use gentle camera moves, focused masks, and transitions tied to the task. Let project headers or record cards connect scenes. Keep UI readable; avoid constant spinning devices, excessive zooming, or fast cuts through dense tables.

Use motion graphics to explain relationships between verified screens. Preserve actual button labels, statuses, totals, and interaction order. Any separately drawn explanatory diagram should be visually distinguishable from the application UI.

Repository assets, if the owner supplies them:

- `apps/mobile/assets/brand/primary-logo.png`
- `apps/mobile/assets/brand/horizontal-logo.png`
- `apps/mobile/assets/brand/logo-mark.png`
- `apps/mobile/assets/brand/logo-full.png`
- `apps/web/public/brand/logo-full.png`

Inspect the assets before choosing the appropriate logo variant. Do not redraw or invent the logo.

## Access package the owner should provide

- Mobile browser preview public URL: **[OWNER TO FILL]**
- Separate web app public URL: **[OWNER TO FILL]**
- Demo access: **[PROVIDE THROUGH THE APPROPRIATE PRIVATE ACCESS CHANNEL]**
- Demo organization and project: **[OWNER TO FILL]**
- Available demo roles: **[OWNER TO FILL — ideally Owner plus Supervisor/Sales where needed]**
- Permission to create or change demo records: **[YES/NO, WITH SCOPE]**
- Logo assets and final CTA URL: **[OWNER TO FILL]**
- Desired language, duration, aspect ratio, and delivery format: **[OWNER TO CONFIRM OR USE PROPOSED DEFAULTS]**

A `localhost` URL points to the visiting machine, so an AI on another machine needs a reachable public URL. A public URL also does not guarantee the AI has browser interaction or capture tools. Confirm its capabilities before depending on autonomous exploration.

As of this handoff, the local mobile web server previously returned HTTP 200 at `http://localhost:8081`, but the attempted Expo/ngrok tunnel timed out. No working public URL was established in that attempt. Recheck availability before sharing. This brief does not establish that the separate web server is running.

Keep the host PC and servers running during exploration and capture. Verify login and data loading through each public URL, not just the landing page. The browser-facing mobile preview needs the API to accept its public origin under the API's CORS configuration. A publicly visible login page alone is insufficient.

## Exploration and capture instructions for the video AI

1. Open both supplied URLs and report which application each contains. Confirm login and the selected organization/project. If access fails, report the exact blocked step; do not substitute invented interfaces.
2. Explore the navigation before recording. Note which modules are visible for the supplied role. Do not use Platform Super Admin as a substitute for a customer Owner: it has different responsibilities and access.
3. Build a screen inventory: client, role, navigation path, visible data, intended scene, and any limitation. Prefer populated, coherent demo records.
4. Trace the core sequences in the feature table. Read-only exploration is the default. Submit forms, approve records, record payments, or change business data only within explicit demo-write authorization.
5. Capture mobile at a consistent portrait viewport, such as 390 × 844 CSS pixels, and web at a consistent desktop viewport, such as 1440 × 900. These are capture suggestions; render the video at the required delivery resolution.
6. Wait for fonts, data, and images to settle. Capture clean overview frames and useful detail states with space for editorial handles. Preserve original captures separately from edited shots.
7. Use demo data suitable for public marketing. Exclude credentials, access tokens, personal contact details, and private business records from captures and exports.
8. Present a storyboard tied to captured evidence. For every scene identify the actual screen, message, transition, and voiceover line. Flag any missing capture instead of silently filling the gap.
9. Produce the video, subtitles, a thumbnail/end card, and editable project/source files when the available tools support them. State clearly which deliverables were actually generated.

If browser access or recording is unavailable, request a screen-recording package and screenshots for the same flows. Continue storyboard and script work from this brief, but label uncaptured scenes as pending assets.

## Claims to exclude unless separately verified and approved

- App-wide offline operation or automatic offline synchronization.
- Instant real-time synchronization between clients.
- AI-powered predictions, automatic construction monitoring, or biometric/GPS attendance.
- Bank payouts, accounting integrations, WhatsApp automation, or other unverified integrations.
- Universal reports/export functionality merely because some modules support exports.
- Guaranteed push delivery, complete mobile/web feature parity, or every role seeing every module.
- App Store/Play Store availability, pricing, free trials, customer counts, or performance/savings statistics without supplied evidence.

Materials approval policy and other runtime-dependent workflows must be demonstrated in the supplied environment before appearing as completed actions. Several repository status documents retain migration, authenticated, cross-client, or device acceptance gates. Do not translate “implemented in source” into “verified for launch.”

## Source basis for this brief

Product positioning: `MVP_REQUIREMENTS.md`. Current feature/acceptance context: `docs/modules/MODULE_INDEX.md`. Mobile routes and navigation: `apps/mobile/app/(app)/` and `apps/mobile/src/features/home/customer-screens.tsx`. Separate web routes and navigation: `apps/web/src/app/(app)/` and `apps/web/src/config/navigation.ts`. Kharchi and progress behavior: their contracts under `docs/modules/construction/`. Wage preview/confirmation source: `apps/mobile/src/features/wages/wages-screen.tsx`. Brand colors: `packages/shared/src/theme/palette.ts`; typography: shared theme tokens and `apps/web/src/app/layout.tsx`.
