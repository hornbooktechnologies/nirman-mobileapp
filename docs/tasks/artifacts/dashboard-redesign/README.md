# Dashboard content previews — 2026-09-09

These screenshots render the actual reusable React Native dashboard components through React Native Web in isolated headless Edge, using clearly synthetic fixture data. They do not show an authenticated session or a physical Android device. Header and bottom navigation are outside the preview; their existing implementation was preserved and checked separately.

| Width | English | Hindi | Gujarati | Attention tab |
| --- | --- | --- | --- | --- |
| 320px | [Preview](dashboard-320-en.png) | [Preview](dashboard-320-hi.png) | [Preview](dashboard-320-gu.png) | [Preview](dashboard-320-attention.png) |
| 375px | [Preview](dashboard-375-en.png) | [Preview](dashboard-375-hi.png) | [Preview](dashboard-375-gu.png) | [Preview](dashboard-375-attention.png) |
| 425px | [Preview](dashboard-425-en.png) | [Preview](dashboard-425-hi.png) | [Preview](dashboard-425-gu.png) | [Preview](dashboard-425-attention.png) |

The nine width/language combinations have no page errors, no horizontal page overflow, no off-screen or sub-50px interactive targets, and successful Actions/Attention tab selection. See [machine-readable results](verification.json). Screenshot capture uses reduced motion. The fixtures intentionally keep the sample project name, date and numeric values fixed across languages; production values use the existing localized formatters. The illustrated activity thumbnail is fixture imagery; production renders authenticated Gallery media.

Static validation: Mobile TypeScript and all 18 locale namespaces passed; Expo web and Android exports passed. Physical-device scrolling/parallax, budget-Android performance, native font scaling, screen-reader navigation, authenticated Gallery/location reads, and fluent Hindi/Gujarati review remain acceptance gates.

The local render fixture lives in `apps/mobile/scripts/dashboard-preview/`. It needs esbuild and Playwright as verification tooling; neither was added to the app's dependencies. Set `DASHBOARD_PREVIEW_TOOLS` to the directory containing those packages, then run `node apps/mobile/scripts/dashboard-preview/render.cjs` from the repository root. The script launches an isolated headless Edge session and closes it afterward; it does not connect to the user's browser profile or the API.
