# Official logo pack

Use the user-supplied named PNG files in `apps/mobile/assets/brand/` and
`apps/web/public/brand/`. Preserve the original artwork and aspect ratios.
App code accesses the pack through each app's `brandAssets` theme export.
Expo native configuration keeps literal asset paths in `apps/mobile/app.json`.

| Asset | Placement |
| --- | --- |
| `horizontal-logo.png` | Mobile authentication and Web login/password recovery |
| `primary-logo.png` | Mobile splash; stacked full-color identity |
| `app-icon-light.png` | Default Mobile icon, Android adaptive foreground, Mobile web favicon, Web sidebar and light browser icon |
| `app-icon-dark.png` | iOS dark icon and dark browser icon |
| `app-icon.png` | Web Apple touch icon; general app tile |
| `app-icon-round.png` | Available for circular app identity placements |
| `text-only-logo.png` | Available wordmark-only variant |
| `black-stacked-logo.png`, `black-symbol.png` | Available monochrome variants for light surfaces |
| `white-stacked-logo.png`, `white-symbol.png` | Available monochrome variants for dark surfaces |

Do not force every variant onto an existing screen. The named variants are the
official source; legacy `logo-full.png` and `logo-mark.png` are no longer used by
Web. Existing Mobile backgrounds and illustrations remain separate from logos.

Native launcher/splash changes require a new native build. Browser and physical
device visual acceptance must be checked separately from TypeScript/config checks.
