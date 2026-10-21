# NirmanSite marketing website frontend architecture

## Objectives

This foundation keeps the current website static while preserving clean boundaries for future API or CMS data. It prioritizes maintainability, readability, scalability, responsive behavior, reuse, accessibility, and centralized theming.

Visual direction is documented in `docs/website/`. The first implementation uses the brand palette, local Manrope/Noto fonts, existing mobile brand imagery, and feature-owned interactive examples.

## Source structure

```text
src/
├── app/                    # Next.js routes, layouts, metadata, route states
│   └── (marketing)/        # Public marketing routes without a URL prefix
├── components/
│   ├── layout/             # Site-wide shell, header, footer
│   └── ui/                 # Reusable, domain-neutral primitives
├── config/                 # Site metadata and non-secret application config
├── features/               # Vertical feature slices
│   └── home/
│       ├── components/     # Home-specific presentation
│       ├── data/           # Static/API data boundary
│       └── model/          # Feature-owned types
├── lib/
│   ├── api/                # Shared HTTP client, errors, transport contracts
│   └── utils/              # Framework-independent utilities
└── styles/
    ├── globals.css         # Single global CSS entry point
    └── tokens.css          # Central semantic theme and responsive tokens
```

Create folders only when they have a real consumer. Add `hooks`, `providers`, or `services` later rather than keeping empty architecture placeholders.

## Dependency rules

1. `app` composes features and shared components; it should contain little business or content logic.
2. `features` own their content models, feature components, and data access entry points.
3. `components/ui` and `components/layout` must not import from features.
4. `lib` is shared infrastructure and must not import from `app` or features.
5. Import a feature through its public `index.ts` outside that feature. Internal feature files may use relative imports.
6. Keep Server Components as the default. Add `"use client"` only to the smallest interactive leaf that needs browser state or effects.

## Static now, API-ready later

Routes consume a feature data function such as `getHomePageData()`, not a static object directly. Today that function returns typed local content. A future implementation can call `apiRequest`, a CMS adapter, or another server-side source without changing the route or presentation component.

Future flow:

```text
App Router page (server)
  -> feature data function
    -> shared API/CMS adapter
      -> validated feature model
        -> feature presentation component
```

Keep credentials and private API origins server-only. Only browser-safe variables may use the `NEXT_PUBLIC_` prefix.

## Theme control

All theme decisions begin in `src/styles/tokens.css` as semantic variables. Tailwind aliases are declared once in `src/styles/globals.css`. Components consume semantic names such as `background`, `foreground`, `surface`, `border`, and `muted-foreground`; they should not contain independent brand hex values.

The current values use the approved cream, coffee, orange, and green palette. Marketing styles live in `src/styles/marketing.css`, imported by the root layout after the shared global entry point. Motion is confined to the home feature's interactive presentation; the page composition remains a Server Component.

## Responsive and accessibility baseline

- Build mobile-first and validate at 375px, 768px, 1024px, and 1440px.
- Use the shared `Container` and `Section` primitives for consistent gutters and vertical rhythm.
- Preserve visible keyboard focus, semantic landmarks, skip navigation, sufficient contrast, and reduced-motion behavior.
- Prefer `next/image` for production imagery and reserve image dimensions to avoid layout shift.

## Growth conventions

- Add routes inside `(marketing)` and give large routes their own feature slice.
- Colocate route-specific loading, error, metadata, and not-found states with that route.
- Introduce client state only when interaction requires it; do not add a global state library preemptively.
- Add schema validation at external data boundaries when the first API or CMS is connected.
- Add tests alongside meaningful utilities, data adapters, and interactive components when those are introduced.
