# Mobile Multilingual Implementation Plan

## 1. Status

```text
slice_3_current_mobile_customer_surface_implemented_static_verified_native_review_pending
```

The Product Owner approved English, Hindi, and Gujarati localization plus the font decision on 2026-08-19. This document sequences implementation without expanding into offline business sync, backend schema, or web localization.

## 2. Objective

Add a production-safe localization foundation to the existing Expo/React Native application and migrate the current customer mobile surface with explicit verification gates.

## 3. Approved Decisions

- Supported languages: English, Hindi, Gujarati.
- Preference: `system`, `en`, `hi`, or `gu`; English fallback.
- Runtime: `expo-localization`, `i18next`, `react-i18next`, AsyncStorage, and `Intl`.
- Resources: bundled, namespaced JSON under `apps/mobile/src/i18n/locales`.
- Preference scope: device-local and preserved across sign-out.
- Font families: Manrope, Noto Sans Devanagari, Noto Sans Gujarati.
- All three current languages are LTR; Arabic/RTL is not in scope.
- Stable backend values are never translated or mutated.
- Human Hindi/Gujarati review is required before production acceptance.
- No third-party localization skill is required for runtime implementation.

## 4. Slice 1 — Contract, Glossary, And Font Decision

Status: completed documentation gate.

Artifacts:

- `docs/modules/foundation/localization/CONTRACTS.md`;
- `docs/modules/foundation/localization/GLOSSARY.md`;
- this implementation plan;
- Module Index, progress ledger, and current-task updates.

Verification:

- current Manrope glyph coverage inspected;
- official Noto Devanagari/Gujarati source and OFL metadata checked;
- documentation consistency and diff checks.

No package, font asset, API, schema, migration, seed, or runtime source change is included.

## 5. Slice 2 — Runtime Foundation And Pilot

Status: implementation complete; physical-device and fluent-language acceptance pending.

Dependency commands:

```powershell
pnpm --filter @nirman-app/mobile exec expo install expo-localization
pnpm --filter @nirman-app/mobile exec expo install @react-native-async-storage/async-storage
pnpm --filter @nirman-app/mobile add i18next react-i18next
```

Installed versions:

- `expo-localization` `~17.0.9`;
- `@react-native-async-storage/async-storage` `2.2.0`;
- `i18next` `^26.3.6`;
- `react-i18next` `^17.0.11`.

Font assets:

- add official static Regular/Medium/SemiBold/Bold Noto Sans Devanagari files;
- add official static Regular/Medium/SemiBold/Bold Noto Sans Gujarati files;
- retain license notices and record sources;
- verify glyph maps after download.

Foundation files:

```text
apps/mobile/src/i18n/index.ts
apps/mobile/src/i18n/resources.ts
apps/mobile/src/i18n/language-resolver.ts
apps/mobile/src/i18n/language-storage.ts
apps/mobile/src/i18n/formatters.ts
apps/mobile/src/i18n/types.ts
apps/mobile/src/i18n/locales/{en,hi,gu}/{common,auth,navigation,errors}.json
apps/mobile/src/providers/localization-provider.tsx
apps/mobile/src/components/ui/app-text.tsx
apps/mobile/src/components/ui/language-picker.tsx
```

Configuration:

- declare `en`, `hi`, and `gu` in the `expo-localization` config plugin;
- initialize localization before SessionProvider copy renders;
- type translation keys from canonical resources;
- add locale-aware typography aliases;
- add pre-auth and Profile/Settings language selection.

Pilot copy:

- loading/bootstrap states;
- Login;
- invitation activation;
- shared actions and common states;
- bottom navigation and primary menu;
- generic API/network/session error presentation.

Do not migrate Projects, Members, Team, or Workers in this slice.

Implemented pilot evidence:

- device-locale resolution with `system`, `en`, `hi`, and `gu` preferences;
- AsyncStorage persistence independent of the authenticated session;
- bundled English/Hindi/Gujarati resources with English fallback;
- locally bundled Noto Sans Devanagari v2.006 and Noto Sans Gujarati v2.106 static weights plus OFL notices;
- locale-aware `AppText`/`Input` font selection with platform-font fallback on font-load failure;
- India-locale date, number, list, and INR formatter helpers;
- localized code/status-based API error presentation for the pilot;
- Login and invitation activation language selectors;
- authenticated Menu/Profile-area language selector;
- localized bootstrap/loading, shared form/button/state copy, bottom navigation, and primary Menu copy;
- project-owned key/placeholder validator.

Static verification on 2026-08-19:

- mobile and shared type-checks passed;
- all four namespaces passed English/Hindi/Gujarati key and placeholder parity;
- Expo public config resolved `en`, `hi`, and `gu` supported locales;
- `git diff --check` passed;
- a cached retry of the Expo web export passed and emitted the entry bundle plus all eight Noto font files;
- no browser backend was available for visual interaction;
- no emulator or physical-device test was run;
- Hindi and Gujarati copy remains draft pending fluent construction-domain review.

## 6. Slice 3 — Current Foundation Features

Requires the Slice 2 runtime and static gates to pass.

Migrate one namespace at a time:

1. Projects;
2. Organization Members;
3. Project Team and Project permissions;
4. Workers;
5. Home/dashboard and remaining shared components.

For each namespace:

- inventory visible text, accessibility labels, confirmation copy, errors, status labels, and formatted values;
- write canonical English keys;
- create Hindi/Gujarati draft resources;
- map stable enums/permissions to keys;
- validate parity and placeholders;
- run type-check;
- obtain native-language review;
- test layout before beginning the next namespace.

Avoid broad automated replacement across all screens because context determines translation and accessibility wording.

### 6.1 Approved Home/Dashboard Namespace

Status: implementation complete; physical-device layout and fluent-language review pending.

The Product Owner chose Home/dashboard as the first Slice 3 namespace after testing the Gujarati pilot. This is an approved sequencing change from the original list above; it does not imply that the Slice 2 native/fluent acceptance matrix has passed.

Included:

- welcome heading and field-workspace eyebrow;
- selected-Project context, switch action, access/status/scope labels, and Project-count copy;
- working-site and Project-scope metric cards;
- main-navigation and workspace headings;
- dashboard create-Project action and empty state;
- relevant accessibility labels and plural forms.

Project, Organization, user, and role/responsibility names remain user-entered data and are displayed exactly as stored. Add/Edit Project forms, Organization Members, Project Team, and Workers were migrated in subsequent tasks.

Static verification on 2026-08-19:

- the `home` namespace passed English/Hindi/Gujarati key and placeholder parity;
- mobile and shared type-checks passed;
- translated labels were reviewed for wrapping instead of forced truncation in the selected-Project card;
- Expo web export passed and emitted the bundle plus all eight Noto font files;
- scoped hard-coded Home-copy review and `git diff --check` passed;
- emulator, physical-device layout, screen-reader, large-text, and fluent Hindi/Gujarati review remain pending.

### 6.2 Approved Projects Namespace

Status: implementation complete; physical-device layout and fluent-language review pending.

After the Home handoff, the Product Owner reported the remaining English Project screen and Add/Edit Project form. Projects was selected as the next namespace; Team/assignment and Workers forms followed in the completion pass below.

Included:

- Project Detail heading, state, actions, Organization/access summary, empty state, alerts, and accessibility labels;
- Add/Edit Project sheet headings, sections, visible field labels, helper text, buttons, validation/recovery messages, and accessibility labels;
- localized Project type, Project status, Project access-scope, and Organization-type display mappings without mutating API values;
- locale-aware shared modal, compact-header, quick-action, and operational-card text used by the Project flow;
- wrapping Project-form rows and choice collections for longer Hindi/Gujarati labels.

Project names, codes, addresses, descriptions, Organization names, and custom responsibility/role labels remain user-entered data and are displayed exactly as stored.

Static verification on 2026-08-19:

- all six namespaces passed English/Hindi/Gujarati key and placeholder parity;
- mobile and shared type-checks passed;
- scoped Project Detail/form hard-coded copy review passed;
- Expo web export passed and emitted one entry bundle plus all eight Noto font files;
- `git diff --check` passed;
- emulator, authenticated physical-device layout, screen-reader, large-text, and fluent Hindi/Gujarati review remain pending.

### 6.3 Current Mobile Customer Surface Completion

Status: implementation complete; authenticated physical-device layout and fluent-language review pending.

The Product Owner clarified that “everything should be multilingual” applies to the complete current Expo customer surface rather than requiring separate reports for each remaining screen. The completion pass includes:

- Organization Members listing, capacity, search, invite/edit access, activation/deactivation, delivery states, and multi-Project assignment;
- Project Team listing, member picker, Assign/Edit Member sheet, responsibility/dates/status, role-default/custom permission modes, presets, warnings, and unassign confirmation;
- Workers roster, assignment filters/states, Assign/Edit/End sheets, Add Worker form, duplicate handling, trade suggestions, dates, rates, and validation/recovery copy;
- shared field requirement labels, collection pickers, sync/offline copy, progress labels, headers, tabs, links, cards, buttons, and locale-aware typography;
- localized accessibility labels, status/type/permission display mappings, dates, counts, and INR presentation throughout those flows.

System enum and permission values remain stable and are translated only for display. User-entered Project, Organization, person, Worker trade, designation, role, and responsibility values are stored and displayed in the script entered by the user; Gujarati/Hindi input is supported by the device keyboard without parallel translation columns.

Static verification on 2026-08-19:

- all nine namespaces passed English/Hindi/Gujarati key and interpolation-placeholder parity;
- mobile and shared type-checks passed;
- the mobile source literal audit found no remaining hard-coded user-facing English copy outside locale resources; only internal provider guard errors and the `NirmanSite` brand remain;
- Expo web export passed with one entry bundle and all eight Noto font files;
- `git diff --check` passed;
- authenticated emulator/physical-device interaction, screen reader, large text, and fluent construction-domain Hindi/Gujarati review remain pending.

## 7. Slice 4 — Enforcement And Release Verification

Add project-owned checks for:

- missing/extra keys;
- placeholder drift;
- JSON parse errors;
- plural structure;
- untranslated target values;
- hard-coded user-facing strings;
- development-only expanded pseudo-locale generation.

Release matrix:

- `system`, English, Hindi, and Gujarati resolution;
- unsupported device locale fallback;
- restart and sign-out persistence;
- offline launch with bundled resources;
- small/large Android phone;
- large text/font scaling;
- authenticated Organization/Project switching;
- Projects, Members, Team, Workers, and role-restricted navigation;
- dates, counts, and INR;
- screen-reader labels;
- font shaping, vowel marks, conjuncts, and truncation.

## 8. File Boundaries

- Mobile owns locale resources and presentation mappings.
- `packages/shared` continues to own machine enums, permissions, statuses, and schemas.
- API error codes remain machine-readable; mobile owns their localized presentation.
- Web components and translations are not imported into mobile.
- No database driver or SQL enters mobile/shared localization code.

## 9. Verification Commands

After dependency and runtime work:

```powershell
pnpm --filter @nirman-app/mobile type-check
pnpm --filter @nirman-app/shared type-check
git diff --check
```

Run any added localization validator separately and report its result. Report Expo build/export, automated tests, emulator, and physical-device evidence as separate verification categories.

## 10. Rollback

- Translation resources and provider integration are additive.
- Keep English resources complete so fallback is always usable.
- If localized fonts fail, fall back to the platform system font while preserving translated copy.
- Do not remove current English literals until their keys and fallback behavior are verified within the active slice.
- Package removal and app-config rollback must be included if Slice 2 is reverted.

## 11. Next Approval Gate

Accept the current mobile localization surface only after Hindi/Gujarati fluent review and authenticated physical-device checks for font shaping, restart/sign-out persistence, small and large text, screen-reader labels, and every role-visible route. New mobile screens must add all three locale resources in the same implementation task.
