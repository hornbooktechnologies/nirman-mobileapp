# Official branding assets

Preserve the user-supplied artwork and aspect ratios. Each app accesses its assets
through its `brandAssets` theme export.

## Mobile

Only `apps/mobile/assets/brand/app-icon.png` and `horizontal-logo.png` are active
Mobile branding artwork. The square icon is used for the launcher, iOS light/dark
icons, Android adaptive foreground, splash, loading identity and Mobile web favicon.
Authentication and activation use the horizontal logo. Legacy Mobile theme keys
alias these two approved files. Expo configuration keeps literal asset paths.
Backgrounds, illustrations and loading animations remain separate assets.

## Web

Web square identity placements use `apps/web/public/brand/app-icon.png` unchanged:
sidebar, compact design-preview mark, light/dark favicon, shortcut and Apple touch
icon. Legacy square variant theme keys alias this file. This supersedes the earlier
sidebar image selection. Existing horizontal and stacked Web logos remain unchanged.

Native Mobile launcher/splash changes require a new build and installation.
Expo Go retains its own installed launcher icon. Browser/device visual acceptance
is separate from static checks.
