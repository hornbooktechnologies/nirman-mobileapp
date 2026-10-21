# NirmanSite V2 — Phase 1

> Superseded: this interpretation was rejected. The active `/v2` now uses the faithful v3 reference port documented in `v2-reference-port.md`.

## Scope and isolation

Preview route: `/v2`, outside the existing `(marketing)` route group. The original `/` page, its components, shared styles, and configuration are unchanged. V2 has its own header/footer, feature directory, CSS Module, and public asset directory. Root Manrope fonts and brand configuration are reused. The preview is marked `noindex, nofollow`.

This stage delivers the foundation and layered hero. It is not the complete V2 landing page. The compact product introduction establishes the next-section boundary.

## Hero story and implementation

The construction environment sits behind a real mobile product presentation. A restrained line-art crane and lift move slowly. In front, dimensional CSS masonry assembles from the bottom upwards. The foreground never accepts pointer events.

Four real mobile screens form a 22-second automatic presentation: project dashboard, attendance, Kharchi, and materials. Each chapter lasts 5.5 seconds; screen crossfades take 650ms, pointer movement 850ms, and supporting record cards enter over 1.05 seconds. The pointer selects presentation chapters rather than claiming to perform unsupported in-app actions. Cards describe product areas; they are illustrative editorial graphics, not live records.

GSAP owns the product and brick timelines. CSS/SVG handles environmental motion. No Canvas, WebGL, Three.js, Rive, Lottie, or video dependency is needed for this stage. Existing Motion remains available for later React interactions.

Pause/play, replay, and manual chapter selection are available. Selecting a chapter pauses automatic progression. Timelines pause when the hero is offscreen or the document is hidden. Reduced-motion mode shows a stable screen and assembled wall; chapter selection remains available. No automatic announcements are sent to screen readers. Animation setup is scoped and reverted on unmount.

On mobile, the phone appears below the copy, chapters become a two-column selector below the phone, and the foreground/environment are reduced. The desktop composition is not scaled down as one unit.

## Source assets

Original images remain untouched. Delivery copies were resized and encoded as WebP, with no fabricated UI or content changes.

| Delivery file (`public/media/landing-v2/`) | Source | Size |
| --- | --- | --- |
| `dashboard.webp` | `Nirmansite_Screens/dashboard_marketing.jpg` | 72,678 bytes |
| `attendance.webp` | `Nirmansite_Screens/attendance_marketing.jpg` | 48,702 bytes |
| `kharchi.webp` | `Nirmansite_Screens/kharchi_detail_marketing.jpg` | 40,692 bytes |
| `materials.webp` | `Nirmansite_Screens/meterials_marketing.jpg` | 37,374 bytes |
| `construction.webp` | existing `public/media/site.png` | 117,878 bytes |

Logo: existing `public/brand/logo.png`. Fonts: existing local Manrope. Crane/scaffold: new decorative SVG. Brick wall: new CSS-generated dimensional visual. Total new delivery image sources: approximately 310 KiB before Next image optimization.

## Content safeguards and later stages

- Kharchi represents recording/tracking advances already paid, not a request/approval feature.
- The supplied materials screen shows draft requests. This stage does not invent an approved/delivered state.
- Screens have different dates/counts. They are labeled an illustrative sequence and are not synchronized as one live transaction.
- Demo links use existing `siteConfig.demoUrl`, falling back to `/contact`.
- Phase 2: scattered-to-connected, operating models, working-day stories, materials/progress, language and sales sequences, broader capabilities, closing CTA.
- Later mobile stories can use the supplied source screens, with missing intermediate states clearly identified before portraying transactions.
- Web overview needs actual web screenshots; no fake desktop dashboard has been introduced.
- Photorealistic video or genuine 3D can be assessed for later sections based on assets and visual need.

## Dependency

Added `gsap@3.15.0`. No framework replacement or unrelated dependency upgrade.

## Verification

- TypeScript check and focused ESLint passed.
- Production build passed; `/v2` is statically prerendered alongside the unchanged existing routes. The sandbox blocked the TypeScript child process on the first attempt; the permitted build completed.
- Headless Edge verified loaded images, all four chapter selections, automatic progression, pause/replay, offscreen pause/resume, reduced-motion selection, and the initial screen with JavaScript disabled.
- Responsive checks covered 320, 390, 760, 768, 1024 and 1440px widths, with no horizontal document overflow. Desktop and mobile screenshots were visually inspected.
- Existing `/` and navigation to `/about` load without browser errors.
- SHA-256 comparison of all 45 pre-existing source/configuration files matched the baseline, including pre-existing uncommitted changes.

These are local implementation checks. Physical-device and final creative acceptance remain separate; no deployment or commit was performed.
