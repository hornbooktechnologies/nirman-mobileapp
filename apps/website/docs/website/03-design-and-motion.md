# Visual and motion direction

## Working creative direction

Cinematic construction context, editorial typography, real mobile-product demonstrations, and restrained spatial movement. The website should feel modern, premium, warm, human, confident, Indian, and practical.

Use a consistent visual system across distinct section compositions. Continuity comes from colour, type, spacing, imagery, and motion behavior; section layouts may vary.

## Required palette

| Colour | Value | Intended role |
| --- | --- | --- |
| Warm Background | `#FEF6EB` | Dominant light canvas |
| Dark Coffee | `#2F2010` | Main text and deep contrast |
| Construction Orange | `#FE4F04` | Primary interaction and selective emphasis |
| Construction Green | `#194826` | Contrasting sections and supporting accents |

Extend the existing semantic tokens in `src/styles/tokens.css`; components should consume semantic names. Check actual foreground/background contrast, especially small text on orange and text over photography.

### Gradients

Use broad, low-opacity orange or green glows fading into the cream background. Keep central reading areas calm. The earlier 6–12% orange and 4–8% green suggestions are visual starting points, not approved tokens.

Avoid saturated orange-to-green interpolation, strong rainbow effects, and continuously moving full-screen gradients. A gradient is atmosphere, not a separate visual subject.

## Typography and layout

- Readability requirement (revised 2026-09-15 after visual feedback): use 13px minimum labels, 14px supporting content and controls, 16px general body content, and 18px hero description at default browser font size. Apply this to illustrative product screens, chart labels, navigation, captions, and mobile breakpoints as well. Shared tokens: `--text-small`, `--text-supporting`, and `--text-body`. Keep rem units to respect user text sizing. Secondary copy uses darker coffee `#514331` on light surfaces; muted copy on green uses `#E0E7D8`.

- Strong headline hierarchy, intentional line breaks, selective emphasis, and generous whitespace.
- Large type can establish an editorial rhythm; body copy remains concise and readable.
- Select a font after comparing brand fit and Hindi/Gujarati support. Final family and type scale remain open.
- Do not adopt the design-search tool's fashion-oriented Cormorant/Montserrat recommendation as the brand default.
- Use shared containers and spacing tokens with controlled section-specific variation.
- Establish a few reusable compositions: cinematic opening, editorial statement, immersive product stage, quiet detail, and full-width contrast.
- Avoid uniform cards throughout the page and excessive floating elements.

## Imagery and spatial presentation

Hero photography should occupy approximately half the background, with a soft atmospheric fade into cream. Prefer warm natural light, a realistic Indian site, unfinished structures, and a small number of naturally engaged people reviewing work or a phone/tablet.

Construction detail can include concrete, reinforcement bars, materials, project drawings, and structural lines. Avoid stock hard-hat and crane repetition.

Use real screens inside restrained phone framing, with readable enlarged details and soft shadows. Perspective is decorative and must not make the app hard to read. Align lighting and shadows across photo, phone, and overlays.

## Motion decision

Core stack: **CSS + Motion + native HTML video**.

| Tool | Status | Purpose |
| --- | --- | --- |
| CSS | Selected | Gradients, press/hover feedback, simple fades, perspective, predetermined effects |
| Motion | Selected direction; not installed by this planning task | Coordinated screen changes, exits, scroll-linked sequences, interruptible springs |
| HTML video | Selected | Actual short application recordings |
| Lottie | Optional | Custom vector explanations, only when an asset justifies a player |
| R3F + Drei | Deferred | A specific interactive 3D scene only if it earns its cost |
| React Spring | Deferred | Avoid a second overlapping animation system |
| Hover.dev | Reference | Study composition; check applicable terms before reusing any code or asset |

R3F is a React renderer for Three.js; Drei is its helper collection. Neither is needed for ordinary CSS perspective or a phone containing video. Lottie is suitable for vector illustration, not an authoritative substitute for real app behavior.

### Animation rules

- Name each animation's purpose: explanation, feedback, state indication, spatial continuity, or bridging a content change.
- Use CSS for simple effects; introduce Motion when sequencing, exits, springs, or scroll values require it.
- Prefer transforms and opacity. Treat masks, blur, shadows, and clip-path as effects requiring device measurement, not guaranteed cheap operations.
- Keep reading text stable; animate a short entrance rather than continuous movement.
- Button feedback: 100–160 ms. Small overlays: 125–250 ms. Longer marketing sequences need a clear explanatory purpose.
- Proposed shared curves: `cubic-bezier(0.23, 1, 0.32, 1)` for entry/exit and `cubic-bezier(0.77, 0, 0.175, 1)` for on-screen movement. Extend existing tokens if present.
- Small stagger intervals: 30–80 ms. Do not delay interaction until the stagger finishes.
- Avoid scale-from-zero, `transition: all`, excessive bounce, and sluggish controls.
- Preserve natural scrolling and keyboard access; do not trap visitors in a scroll sequence.
- Pause offscreen motion and video. Provide pause/replay controls for ongoing demonstrations.
- Reduced motion: readable final states or short crossfades; remove parallax, perspective travel, and continuous decorative movement. Do not auto-play the walkthrough in that mode.
- Gate hover effects to hover-capable pointers. Every essential action must work by touch and keyboard.

## Hero behavior

One focal product sequence, roughly 6–10 seconds, beside a readable headline and the two CTAs. Keep the construction photo calm while the app demonstrates activity. At most one or two supporting details should compete for attention.

If video is unavailable, use authentic screenshots with controlled transitions in the same media container. A later video replacement should not require rebuilding the layout.

## Responsive and performance principles

- Desktop: spacious image and product composition. Mobile: deliberate vertical sequence with readable screen crops and shorter motion.
- Test at 375, 768, 1024, and 1440 px, plus a narrow 320 px check and enlarged text.
- Avoid horizontal page overflow. Any intentional carousel needs explicit controls and a readable mobile alternative.
- Reserve media dimensions; show a poster before video is ready. Lazy-load below-fold media and avoid fetching every clip on initial load.
- Do not load WebGL or a Lottie player without a concrete consumer.
- Keep marketing content server-rendered; interactive animation belongs in small client components, consistent with the architecture guide.

## Research references

Reviewed during planning on 2026-09-15. These are inspiration and technical references, not copied designs or proof of NirmanSite capabilities. The initial research inspected page content and documentation; exact animation feel still needs visual browser review.

- [OpenSpace platform](https://www.openspace.ai/platform/): construction context linked to product demonstrations.
- [BuildTools](https://www.buildtools.com/): chapter-based product tour.
- [Buildots product](https://buildots.com/product/): outcomes preceding detailed capabilities.
- [Orbix Studio](https://www.orbix.studio/): product presentation reference; the user's Payno reference remains a taste reference rather than a design to reproduce.
- [Motion React](https://motion.dev/docs/react): animation and scroll capabilities.
- [React Three Fiber](https://r3f.docs.pmnd.rs/getting-started/introduction) and [Drei](https://github.com/pmndrs/drei): optional 3D stack.
- [React Spring](https://react-spring.dev/docs/getting-started): alternative spring system.
- [Lottie React](https://docs.lottiefiles.com/en/runtimes/distributions/react): vector playback.
- [Hover.dev](https://www.hover.dev/): component composition inspiration.

Skill influence: UI/UX Pro Max informed spacious storytelling and accessibility priorities; Apple Design informed direct feedback and spatial continuity; Emil Design Engineering and Animate informed restrained, purposeful motion; Pick UI Library informed dependency restraint. The user's palette and product requirements override generic skill recommendations.
