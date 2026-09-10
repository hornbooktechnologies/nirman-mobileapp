# Dashboard accent previews — 2026-09-10

Actual React Native dashboard components rendered through React Native Web in isolated headless Edge with synthetic fixture data. These are verification screenshots, not generated design concepts or app assets. No concept images were included in code.

| Width | English | Hindi | Gujarati |
| --- | --- | --- | --- |
| 320px | [Preview](dashboard-320-en.png) | [Preview](dashboard-320-hi.png) | [Preview](dashboard-320-gu.png) |
| 375px | [Preview](dashboard-375-en.png) | [Preview](dashboard-375-hi.png) | [Preview](dashboard-375-gu.png) |
| 425px | [Preview](dashboard-425-en.png) | [Preview](dashboard-425-hi.png) | [Preview](dashboard-425-gu.png) |

All nine combinations passed page-error, horizontal-overflow, on-screen/minimum-50px interactive target, and Actions/Attention selection checks. See [results](verification.json). Reduced motion was enabled. English 375px and Gujarati 320px screenshots were visually inspected.

Shared build, Mobile type-check and 18-namespace en/hi/gu locale parity passed. No API, dependency, status/category/type, or business-rule changes. Device, authenticated workflow, native font scaling, and screen-reader acceptance are not established by these fixtures.

Reproduce from the repository root with `DASHBOARD_PREVIEW_TOOLS` pointing to verification-only node_modules containing esbuild and playwright, and `DASHBOARD_PREVIEW_ARTIFACTS=docs/tasks/artifacts/dashboard-accents`, then run `node apps/mobile/scripts/dashboard-preview/render.cjs`. The default artifact destination remains the older dashboard-redesign directory. Preview tooling was installed outside the repository.
