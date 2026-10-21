# First homepage implementation

Date: 2026-09-15

Authorization: user requested implementation using UI/UX Pro Max and asked to proceed without approval pauses.

## Implemented

- Responsive header, navigation, hero and footer.
- Existing NirmanSite horizontal logo and construction onboarding artwork reused without modifying originals.
- Brand palette with soft cream/orange atmosphere and a green expense section.
- Local Manrope fonts; local Noto Hindi/Gujarati fonts for the language concept, with supplied Noto license notices.
- Narrative sections for scattered information, flexible working arrangements, workforce/Kharchi/wages, spending, materials/progress, languages, supporting sales, founder story and final CTA.
- Four selectable working arrangements, including one-person overlapping responsibilities and independent contractors.
- Animated illustrative phone examples with manual screen selection and play/pause; playback pauses offscreen/when the tab is hidden and is disabled under reduced motion.
- English/Hindi/Gujarati language concept selection.
- Reduced-motion support, semantic headings and controls, skip link, mobile navigation, and responsive layout.
- `NEXT_PUBLIC_DEMO_URL` configuration for an eventual booking destination. Unconfigured preview shows an honest availability disclosure and does not collect or transmit personal data.
- Motion 13.2.0 installed using the repository's existing pnpm store. Other animation runtimes remain deferred.

## Deliberate temporary choices

- Phone screens are illustrative UI with synthetic demo values. They are explicitly labelled and must be replaced with verified app captures before production approval.
- Language cards are translated concepts, not screenshots of the real app. Fluent review and actual captures remain outstanding.
- The hero secondary CTA reads “Explore the app” and links to the product examples. Change to the planned “Watch Overview” once an actual overview video exists.
- No video file or Lottie asset was available. There is no claim that the current phone animation is a real recording.
- The supplied onboarding artwork supports the first hero. Its provenance and production usage should be confirmed before publication.
- Final contact/legal destinations and booking configuration remain pending. No fake contacts, testimonials or success submissions were added.

## Validation

- Type-check, ESLint and production build passed during implementation.
- Local browser rendered the homepage successfully.
- Desktop visual review at 1440 px.
- Mobile DOM checks at 375 and 320 px confirmed no horizontal page overflow after correcting decorative ring overflow.
- Working-arrangement switching, Gujarati language selection, Kharchi example selection and booking-unavailable disclosure checked in the browser.
- Fixed wrapped hero CTA text and increased illustrative phone content space after browser review.
- DOM width checks at 768 and 1024 px also passed without horizontal page overflow.
- Hindi selection and the mobile language section were visually reviewed.
- An initial development CSS import-resolution error was resolved by importing the marketing stylesheet directly from the root layout.

Still needed: physical-device testing, measured performance/accessibility audit, authentic app media, fluent language review, final conversion integration, and release verification.

## Next implementation work

### Readability correction — 2026-09-15

Replaced sub-12px font declarations throughout the marketing stylesheet with shared typography tokens. Supporting text and navigation now use 13px, general body copy 14px, and small labels/captions at least 12px at default browser font size. Headline sizes are preserved. Expanded phone content, allowed CTA wrapping, and adjusted narrow-screen records/chart layouts to accommodate readable text.

Verification: type-check and whitespace checks passed. Browser checks at 320, 375, 768 and 1440 px found no horizontal page overflow. Rendered text checks at 375 and 1440 px found zero text elements below 12px; phone overview and Kharchi content fit their containers at narrow widths.

1. Replace illustrative product stages with actual app screenshots/recordings while preserving the page composition and media controls.
2. Verify product-specific data presentation and narratives against current mobile behavior.
3. Connect the booking destination and overview media.
4. Finish craft review, media budgets, metadata/social assets and launch details.

### Stronger readability and contrast correction — 2026-09-15

User review found the first increase insufficient. Superseding that scale, labels now use 13px, supporting content 14px, general body copy 16px, and hero description 18px. Secondary foreground changed from `#746650` to `#514331`; green-section supporting text is lighter for stronger contrast. Expanded phone examples and paragraph leading to accommodate larger type. Removed the root's fixed minimum width so narrow viewports with a desktop scrollbar can fit naturally.

Browser inspection confirmed rendered 16px body and 18px hero copy with the darker foreground. Desktop visual review and narrow-screen phone content checks completed; this is not a full accessibility audit.

### Animated hero proof — 2026-09-15

Replaced only the hero's static/manual phone example with `HeroStory`, a 16-second autoplaying explanatory sequence: site-diary advance → staged Kharchi fields → recorded confirmation → wage breakdown. Includes a perspective-changing phone, a travelling diary note, staggered field entry, confirmation card and synchronized timeline. The rest of the page is unchanged.

Animate skill decision: rare marketing visit; purpose is explanation and spatial continuity. Predetermined transform/opacity choreography uses CSS with shared ease-out/ease-in-out tokens; React manages pause/replay and visibility. No additional package is needed. UI/UX Pro Max's targeted motion guidance informed pause controls, limited focal movement and reduced-motion handling.

All animation layers pause together when manually paused, offscreen, or the document is hidden. Reduced-motion CSS shows the final wage summary without the moving overlays. A static screen-reader description conveys the full example. Figures are synthetic and explicitly labelled; Kharchi records money already given, not a payment transfer.

Verification: type-check and ESLint passed. Browser confirmed active autoplay, paused CSS state after Pause, replay interaction, and scene content fitting at 1440/375/320px; narrow widths had no horizontal document overflow. Reduced-motion fallback is implemented but not device-tested. Physical-device motion feel remains a review gate.

## Files

Home presentation: `src/features/home/components/home-page.tsx`.

Interactive examples: `src/features/home/components/product-experience.tsx`.

Shared visual system: `src/styles/tokens.css` and `src/styles/marketing.css`.

This record supersedes initial statements that design implementation had not begun. Unchecked planning items must not be treated as completed simply because a visual example exists.
