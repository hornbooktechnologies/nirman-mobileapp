# V2: faithful v3 reference port

The active `/v2` now renders the supplied **NirmanSite Homepage v3.dc.html** design. This supersedes the rejected Phase 1 interpretation. The existing `/` route and its implementation remain separate.

## What was preserved

- All ten sections, the original logo drawing, typography, colors, spacing, construction graphics and mock product UI.
- Original timeline calculations, cursor positions, easing curves, durations and automatic loops.
- Hero: home → project, attendance count/dots, notification, material request, flying record and return home over 19 seconds.
- Scattered records, operating models, four working-day demonstrations, building construction, languages, sales sequence, FAQ and closing construction animation.
- Original model, working-day, language and FAQ interactions, with keyboard activation added to clickable controls.

## Native implementation

`scripts/port-v3-reference.py` translates the supplied template's `sc-if`, `sc-for`, interpolated text/styles and event bindings into native JSX. `reference-experience.jsx` adapts the original state calculations to the installed React runtime. It does not load Claude's `support.js`, its separate React runtime, Babel, or evaluate code dynamically. No iframe or embedded HTML page is used.

The original CSS values remain inline. A scoped CSS Module resets inherited legacy styles to the source document defaults and isolates its keyframes. The source's Google Fonts stylesheet is retained. The empty site-footage slot remains empty; no replacement artwork was invented.

The 1440px reference canvas fits narrower viewports proportionally. This deliberately preserves the exact composition for comparison; it is not a separately redesigned mobile layout. Reduced-motion uses the original poster states and disables environmental motion. Background tabs stop advancing the clock.

## Content boundary

This is a **design-fidelity preview**, not a production-validated product demonstration. It intentionally retains the prototype's sample names, figures, request/approval scenes and marketing claims. Those must be reconciled with real NirmanSite behavior before release. The supplied real app screenshots are not substituted in this pass.

Some navigation/CTA items were visual-only in the original and remain so. No sign-in destination, contact details or backend action has been invented.

The older Phase 1 files are retained but no longer imported by `/v2`.

## Approved hero composition update

The hero now contains only the centered animated product group over a warm construction-photo banner. Its left-side headline, supporting copy, buttons and language strip were removed. The phone, surrounding records, notification, cursor and flying-card choreography are unchanged. The banner reuses `public/media/landing-v2/construction.webp`, with layered warm overlays for product contrast. This adjustment lives in the port script, so regeneration preserves it. The remaining nine sections and the original handoff file are unchanged.

The exact-reference measurements below describe the baseline before this requested hero layout change.

## Reference verification

- Original HTML served separately without editing the handoff. Headless Edge compared both pages at 1440px.
- All ten section bounding rectangles matched; both full pages measured 1440 × 8143px with the first FAQ open.
- Animation values and rendered text matched at 0, 3.2, 4.6, 6.2, 9.3, 10.5, 12, 12.5, 13.6, 14.5, 18.9, 22, 27, 32 and 34.2 seconds.
- Hero captures at 0, 6.2 and 14.5 seconds were pixel-identical after freezing ambient animation at the same phase. The 12.5-second capture had a tiny localized moving-card difference; mean channel difference rounded to 0.0000 on a 0–255 scale.
- FAQ, model, language and working-day selection passed. Reduced-motion poster states and proportional narrow-viewport fitting passed. No browser page errors.
- TypeScript, focused ESLint and the production build passed. All 45 pre-existing source/configuration files still match the baseline hashes.
