# Mobile Localization Foundation Contract

## 1. Status

```text
contract_approved
```

Approved by the Product Owner on 2026-08-19.

This contract approves the English, Hindi, and Gujarati localization model for the NirmanSite mobile application. It does not by itself authorize unrelated business modules, offline record synchronization, database changes, or web localization.

## 2. Authority And Inputs

This contract follows:

1. `MVP_REQUIREMENTS.md`, especially Mobile UX, Accessibility, Localization, API Contract, and Offline-First requirements;
2. `docs/decisions/003-design-system-direction.md`;
3. `docs/design/mobile-operational-layout-spec.md`;
4. `docs/architecture/mobile.md`;
5. `docs/ai-context/04-mobile-development-rules.md`;
6. the current Expo/React Native source under `apps/mobile`.

If this contract conflicts with a higher-authority requirement, the higher-authority requirement wins and the conflict must be recorded before implementation continues.

## 3. Business Outcome

NirmanSite mobile users can use the same permission-aware, project-scoped workflows in:

- English;
- Hindi (`hi` / `hi-IN`);
- Gujarati (`gu` / `gu-IN`).

The language layer changes presentation only. It must not change authorization, organization/project context, workflow transitions, validation authority, persisted business values, or API payload meaning.

## 4. Scope

Included:

- device-locale detection;
- an explicit in-app language preference;
- English fallback behavior;
- bundled translation resources available without network access;
- localized visible copy and accessibility labels;
- pluralization and interpolation;
- India-friendly date, number, and INR formatting;
- localized presentation of stable statuses, permissions, and error codes;
- Hindi and Gujarati script-capable typography;
- missing-key, placeholder, plural, and layout verification;
- a project-owned terminology glossary and native-language review gate.

Excluded:

- web portal localization;
- server-side user-language persistence;
- organization-wide language policy;
- runtime translation downloads or remote translation management;
- Arabic or RTL behavior;
- translation of user-entered content;
- offline business-record storage, queues, conflict handling, or sync;
- schema, migration, seed, or database changes.

## 5. Supported Language Model

The preference model is:

```ts
type LanguagePreference = 'system' | 'en' | 'hi' | 'gu';
type SupportedLanguage = 'en' | 'hi' | 'gu';
```

Resolution order:

1. use a saved explicit `en`, `hi`, or `gu` preference;
2. for `system`, select the first supported language from the device locale list;
3. fall back to `en`.

Translation resources use the short language codes `en`, `hi`, and `gu`. Formatting uses `en-IN`, `hi-IN`, and `gu-IN` respectively.

All three approved languages are left-to-right. New UI should nevertheless prefer direction-neutral layout patterns where practical so a future RTL language does not require a complete component rewrite.

## 6. Runtime Architecture

Approved runtime responsibilities:

| Concern | Owner |
| --- | --- |
| Device locale discovery and supported-locale declaration | `expo-localization` |
| Translation keys, fallback, interpolation, namespaces, and plurals | `i18next` |
| React/React Native integration | `react-i18next` |
| Device-local language preference | `@react-native-async-storage/async-storage` |
| Date, number, list, and INR formatting | JavaScript `Intl` APIs |
| Language state exposed to the app | Mobile `LocalizationProvider` |

The provider must initialize before protected or unauthenticated route copy is rendered. A language change must update the visible UI without signing out, resetting navigation, clearing forms, or changing the active Organization/Project.

The saved language preference survives app restart and sign-out. It is not secret and must not be stored in the authenticated session payload.

## 7. Resource Ownership And Structure

Locale resources live under:

```text
apps/mobile/src/i18n/locales/<language>/<namespace>.json
```

Initial namespaces:

- `common`;
- `auth`;
- `navigation`;
- `projects`;
- `members`;
- `team`;
- `workers`;
- `errors`.

Future modules add their own namespace only when their module contract and mobile workflow are approved.

English is the canonical source locale. Hindi and Gujarati must maintain key, placeholder, and plural parity with English. Translation keys are stable semantic identifiers, not English sentences or positional names such as `text1`.

Preferred form:

```ts
t('empty.noActive.title', { ns: 'workers' });
t('assignment.pendingCount', { ns: 'workers', count });
```

Sentence fragments must not be joined to create translated prose. Dynamic values use interpolation inside one complete translation unit.

## 8. Machine Values And User Content

Never translate or mutate:

- database IDs;
- permission keys;
- API enum/status values;
- analytics event names;
- route names;
- ISO currency codes;
- ISO dates in API payloads;
- email addresses, phone numbers, codes, or URLs;
- Organization, Project, Member, Worker, role-label, designation, responsibility, trade, or other user-entered names.

Stable machine values are mapped to presentation keys at the mobile boundary. For example, `ON_HOLD` remains `ON_HOLD` in contracts and is rendered through a locale key such as `common.projectStatus.ON_HOLD`.

System permission labels/descriptions may be localized from their stable permission keys. Custom role names and descriptions remain as entered by the customer.

## 9. API Error Presentation

The backend remains authoritative and continues returning a machine-readable error code plus a human-readable diagnostic message.

Mobile behavior:

1. map a recognized error code to `errors.api.<CODE>`;
2. otherwise show a localized generic recovery message appropriate to the status/failure family;
3. retain the backend message only for diagnostics, not as the primary production UI copy;
4. never infer authorization or workflow behavior from a translated message.

Network, session-expiry, permission-loss, validation, and server-failure states require distinct localized recovery copy.

## 10. Formatting

Use `Intl.DateTimeFormat`, `Intl.NumberFormat`, `Intl.ListFormat`, and plural rules instead of manual string assembly.

Rules:

- INR remains the MVP currency regardless of UI language;
- India-style digit grouping is required;
- API dates remain ISO values;
- visible dates are formatted with the resolved `*-IN` locale;
- input/storage contracts must not depend on localized display strings;
- counts use plural translation units with the `count` variable;
- never construct currency with a raw `₹${amount}` template.

## 11. Approved Typography

The current Manrope assets cover English but do not contain Devanagari or Gujarati glyphs. The approved family model is:

| Language | Primary UI family | Weights |
| --- | --- | --- |
| English | Manrope | 400, 500, 600, 700 |
| Hindi | Noto Sans Devanagari | 400, 500, 600, 700 |
| Gujarati | Noto Sans Gujarati | 400, 500, 600, 700 |

Implementation rules:

- bundle the approved font files locally so core UI remains available offline;
- source Noto files from the official Google/Noto repositories and retain the applicable OFL license notice;
- use standard Noto Sans Devanagari and Noto Sans Gujarati, not unrelated display or handwriting families;
- introduce locale-aware typography aliases or an `AppText` primitive rather than setting Manrope inside feature screens;
- preserve the existing semantic type scale while allowing script-specific line-height adjustment;
- validate conjuncts, vowel marks, clipping, baseline, numerals, and the Rupee symbol on physical Android devices;
- fall back to the platform system font if a localized font fails to load.

Font files and packages are installed only in the approved runtime-foundation slice.

## 12. UX And Accessibility

The language selector is available before authentication and from the authenticated Profile/Settings flow. It displays native language names:

- English;
- हिन्दी;
- ગુજરાતી.

Changing language applies immediately and keeps current input/navigation state.

Localized UI must:

- keep visible form labels;
- localize accessibility labels together with visible copy;
- reflow at large text sizes;
- wrap chip/filter collections instead of clipping labels;
- allow cards, buttons, sheets, and rows to grow vertically;
- preserve full accessible names where visible text must truncate;
- keep touch targets at the approved mobile minimum;
- avoid flags as language identifiers;
- avoid relying on color to communicate status.

## 13. Translation Voice And Review

English uses short, plain construction-site language.

Hindi uses respectful modern software language and the formal `आप` register. Avoid overly Sanskritized terminology when a field-familiar term is clearer.

Gujarati uses respectful modern language and the `તમે` register. Avoid literary or administrative wording when a field-familiar term is clearer.

AI or machine translation may produce a draft only. Production acceptance requires human review by fluent Hindi and Gujarati reviewers familiar with construction operations. High-risk copy includes approvals, destructive actions, money, wages, Kharchi, authentication, invitations, permissions, offline/sync states, and legal/account notices.

`GLOSSARY.md` owns approved terminology. A repeated term must not be translated independently inside feature files.

## 14. Offline Boundary

Locale JSON and fonts are bundled in the app. Language selection and already-shipped translations therefore work without network access.

This does not implement or imply persisted offline business data. Workers writes remain online-only until the separate Offline Sync Foundation contract is approved and implemented.

## 15. Quality Gates

Every migrated namespace must pass:

- English/Hindi/Gujarati key parity;
- placeholder parity;
- required plural-form validation through the runtime plural rules;
- JSON parse validation;
- missing-key and fallback tests;
- hard-coded user-facing string review;
- long-text/pseudo-localization layout review;
- font glyph and shaping review;
- accessibility-label review;
- `pnpm --filter @nirman-app/mobile type-check`;
- physical-device review at normal and large text sizes.

Runtime evidence must be reported separately from static checks. An Expo web export or type-check does not prove physical-device font shaping, language persistence, or authenticated workflow behavior.

## 16. Acceptance Criteria

- English, Hindi, and Gujarati can be selected from Login and authenticated Settings/Profile.
- A supported device locale resolves correctly when preference is `system`.
- Unsupported or missing preferences fall back to English.
- The preference survives restart and sign-out.
- Core resources and fonts render without network access.
- Existing routes, permissions, sessions, Organization/Project selection, APIs, and handlers are unchanged.
- Machine values remain unchanged in payloads and persistence.
- Dates, counts, and INR are locale-formatted for India.
- No missing glyph boxes, clipped vowel marks, or broken conjuncts appear in the accepted screen matrix.
- Hindi and Gujarati translations have recorded human approval.

## 17. Remaining Product Inputs

These inputs do not block the runtime foundation but block production acceptance of translated modules:

- named Hindi reviewer;
- named Gujarati reviewer;
- approval of glossary candidates for construction-domain terms;
- decision on how much familiar English transliteration is preferred for terms such as Project, Site, Supervisor, Member, Worker, and Sync.

