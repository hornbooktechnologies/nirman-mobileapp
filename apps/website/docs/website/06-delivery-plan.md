# Delivery plan and decision log

Last updated: 2026-09-15

## Current state

- Existing foundation: Next.js App Router, React, TypeScript, Tailwind, pnpm, shared layout/UI primitives, semantic token files, and a static feature data boundary.
- First visual homepage implemented; see [implementation record](07-implementation-record.md). Media examples remain illustrative pending authentic product captures.
- This planning folder records the brief and proposed execution path.
- Motion 13.2.0 is installed. Lottie, React Spring, R3F, and Drei remain deferred.
- No production media set, demo submission service, or deployment target has been verified.

## Phase 1 — Direction and evidence

- [x] Consolidate the website's purpose and product truths.
- [x] Document visual direction, motion strategy, storyboard, and asset requirements.
- [ ] Inventory approved logos and current mobile screens.
- [ ] Verify detailed capabilities against current screens/contracts.
- [ ] Inspect chosen visual references in a browser for composition and motion feel.
- [ ] Resolve conversion destinations and production media sourcing.

Exit: a usable asset inventory and clear evidence for planned demonstrations.

## Phase 2 — Concrete visual concept

- [ ] Define semantic colours, type scale, spacing, surfaces, and motion tokens.
- [ ] Develop a desktop and mobile hero composition using actual screens or faithful placeholders explicitly marked for review.
- [ ] Design the signature working-arrangements section.
- [ ] Design one feature demonstration, preferably Kharchi or expense visibility.
- [ ] Review these together for brand continuity, readability, originality, and production feasibility.

Exit: a concrete visual direction that can guide every remaining section. Do not build an entire page before proving the hero and a representative product section.

## Phase 3 — Homepage implementation

- [ ] Read the relevant installed Next.js guides before framework changes, as required by AGENTS.md.
- [ ] Preserve the existing architecture and extend shared semantic tokens.
- [ ] Build the site shell and static narrative in correct reading order.
- [ ] Implement distinct section compositions from the storyboard.
- [ ] Add Motion only where required; keep interactive boundaries small.
- [ ] Integrate authentic captures, poster fallbacks, and media controls.
- [ ] Build the mobile compositions and reduced-motion behavior alongside desktop.
- [ ] Wire Request Demo and Watch Overview to their agreed destinations.

Exit: a complete, navigable local homepage with all missing production items visibly tracked.

## Phase 4 — Content, craft and validation

- [ ] Review every claim against verified product behavior or supplied evidence.
- [ ] Check en/hi/gu app preview consistency and legibility.
- [ ] Verify links, CTA behavior, keyboard navigation, focus, and form feedback if a form is used.
- [ ] Review layouts at target widths, narrow screens, enlarged text, and touch input.
- [ ] Review motion on real mobile hardware and in reduced-motion mode.
- [ ] Measure image/video loading, layout shift, animation performance, and initial payload.
- [ ] Run appropriate type-check, lint, and production build checks.
- [ ] Review metadata, social preview, favicon, contact and legal destinations.

Exit: no unresolved issue preventing comprehension, conversion, accessibility, or trustworthy presentation. Static checks, browser checks, physical-device checks, and product verification must be recorded separately.

## Phase 5 — Release preparation

- [ ] Resolve any remaining placeholder asset or destination.
- [ ] Document hosting configuration and deployment procedure once the target is known.
- [ ] Prepare the completed site for release review.
- [ ] Deploy only when the user requests or authorizes publication.
- [ ] Verify the deployed site and capture a concise release record.

## Open decisions

| Decision | Current direction | When needed |
| --- | --- | --- |
| Hero recording | User may supply references/recording; screenshots can support concept work | Before final media integration |
| Photography | Warm Indian site with natural human activity | Before final hero approval |
| Font family | Editorial confidence with readable body and Indian scripts | Visual concept |
| Working-arrangements interaction | Stable product stage with changing context | Visual concept |
| Website languages | App supports en/hi/gu; website translation scope undecided | Before content architecture expands |
| Request Demo | Label required; form/scheduler/contact destination undecided | Before functional completion |
| Watch Overview | Label required; final video/player destination undecided | Before functional completion |
| Contact/legal details | Must use verified information | Before release |
| Founder assets | Authentic minimal story; photograph optional | Content completion |
| 3D/Lottie | Optional only if a concrete section needs them | After visual concept |
| Hosting | Not selected in this planning task | Release preparation |

## Decision history

| Date | Decision | Basis |
| --- | --- | --- |
| 2026-09-15 | Product flexibility is the central narrative | User's product and design briefs |
| 2026-09-15 | Preserve cream/coffee/orange/green with subtle gradients | Explicit brand direction and follow-up |
| 2026-09-15 | Real app demonstration is the preferred hero media | User interest in app video; recommended working direction |
| 2026-09-15 | Use short contextual demonstrations through the page | User's Kharchi example and storytelling brief |
| 2026-09-15 | Motion + CSS + native video are the planned core | Animate-guided recommendation accepted for planning |
| 2026-09-15 | Defer R3F/Drei, React Spring, and optional Lottie | No specific additional runtime need established |
| 2026-09-15 | Preserve different section compositions within one theme | Explicit rejection of repetitive SaaS structure |
| 2026-09-15 | Start with documentation before design implementation | Current user request |

## Future context handoff

Read the planning index, soul, product truth, and existing architecture. Check repository status and current assets. Continue the earliest incomplete authorized phase. Treat open choices as open; do not turn earlier suggestions into fabricated approvals. Update this plan with completed work, new evidence, decisions, and remaining gaps after each meaningful milestone.
