# 003. Design System Direction

## Status

Approved direction for planning and future UI implementation.

## Date

2026-07-21

## Context

NirmanSite is a mobile-first construction ERP for real estate builders. The web app is the admin and back-office portal. The mobile app is primarily for Supervisor, Contractor, and Agency users who need fast, clear field workflows.

The UI must feel premium, calm, modern, soft, glass-like, and construction-tech. It must avoid the old ERP feeling of dense tables, hard rectangles, harsh borders, and visually heavy admin screens.

The finalized fourth logo direction is the visual reference: a dark olive premium presentation, sage and copper mark, soft glow, high trust, and restrained construction-tech energy.

## 2026-07-28 Addendum: Component-First Design Architecture

The web admin panel and mobile app are being developed together. They must feel like the same NirmanSite / BuilderSaaS product, but they must not share React component implementations.

The correct architecture is:

- Define shared design meaning once in global theme tokens.
- Map those tokens separately into web and mobile.
- Build platform-specific reusable UI component libraries.
- Build pages and screens from those reusable components.
- Avoid copied one-off styles inside each page or screen.

The BuilderSaaS design brief introduces a warm, premium construction SaaS direction with warm backgrounds, blueprint-inspired surfaces, dark coffee typography, construction-orange CTA and active states, and status accents such as yellow, green, and purple. The current NirmanSite token foundation already uses sage, olive, copper, warm ivory, and soft glass. Before implementation, these must be reconciled into one semantic token system so screens use names such as `color.action.primary`, `color.background.app`, and `color.status.warning`, not raw palette names or hardcoded hex values.

The uploaded smart-home mobile references are visual inspiration only. Use them for soft cards, premium spacing, rounded glass-like panels, floating navigation, calm hierarchy, and strong selected states. Do not copy smart-home content, device controls, or exact feature structure. Convert the visual language into construction ERP workflows such as projects, workers, attendance, wages, Kharchi, materials, expenses, gallery, approvals, units, agencies, invoices, notifications, and dashboards.

## 1. Brand Personality

NirmanSite should feel:

- Modern and premium.
- Calm, trustworthy, and operationally serious.
- Construction-tech, not generic SaaS.
- Mobile-first and field-friendly.
- Soft, layered, and tactile.
- Warm enough for daily use, but not decorative or playful.

The product should communicate: right place, right build, clear control, and reliable execution.

## 2. Logo Direction Summary

The approved logo direction uses a geometric location/build mark with two-tone sage and caramel copper treatment.

Logo principles:

- Use the fourth dark-background logo direction as the strongest brand mood reference.
- Preserve the sage/copper split as a recognizable brand signal.
- Use the icon as a premium app mark, sidebar mark, splash mark, and compact identity.
- Prefer clean spacing around the logo; do not crowd it inside busy headers.
- On dark surfaces, allow soft glow and subtle metallic depth.
- On light surfaces, use the mark in sage/copper without heavy shadow.

## 3. Core Color Palette

Brand colors:

```ts
brand = {
  primary: "#5C6B57",
  secondary: "#C68A4E",
  dark: "#2F372B",
  light: "#EAF2EC",
}
```

Surface colors:

```ts
surface = {
  page: "#FAF8F5",
  card: "#F4F6F1",
  elevated: "#FFFFFF",
  muted: "#E6D6BB",
}
```

Text colors:

```ts
text = {
  primary: "#2F372B",
  secondary: "#6F756A",
  muted: "#9B9F94",
  inverse: "#FFFFFF",
}
```

Status colors:

```ts
status = {
  success: "#194826",
  warning: "#FCBD41",
  danger: "#D9534F",
  info: "#8FA48F",
}
```

Supporting colors from the logo reference:

```ts
supporting = {
  sageMist: "#EAF2EC",
  mintCream: "#DDEBE2",
  warmIvory: "#FAF8F5",
  oliveCharcoal: "#3C433B",
  caramelCopper: "#B8793D",
  warmSand: "#E6D6BB",
  sageGreen: "#8FA48F",
}
```

## 4. Semantic Theme Tokens

Use semantic tokens in app code. Do not hardcode brand hex values directly inside screens.

Recommended token groups:

```ts
theme = {
  color: {
    brand: {
      primary: "#5C6B57",
      secondary: "#C68A4E",
      dark: "#2F372B",
      light: "#EAF2EC",
    },
    background: {
      app: "#FAF8F5",
      panel: "#F4F6F1",
      elevated: "#FFFFFF",
      inverse: "#2F372B",
    },
    text: {
      primary: "#2F372B",
      secondary: "#6F756A",
      muted: "#9B9F94",
      inverse: "#FFFFFF",
      accent: "#C68A4E",
    },
    border: {
      subtle: "rgba(47, 55, 43, 0.10)",
      default: "rgba(47, 55, 43, 0.16)",
      inverse: "rgba(255, 255, 255, 0.18)",
    },
    action: {
      primary: "#C68A4E",
      primaryHover: "#B8793D",
      secondary: "rgba(244, 246, 241, 0.72)",
      success: "#5C6B57",
      danger: "#D9534F",
    },
    status: {
      success: "#194826",
      warning: "#FCBD41",
      danger: "#D9534F",
      info: "#8FA48F",
    },
  },
  radius: {
    xs: 6,
    sm: 8,
    md: 12,
    lg: 18,
    xl: 24,
    full: 999,
  },
  shadow: {
    soft: "soft low-opacity shadow",
    card: "ambient card shadow",
    elevated: "larger blurred elevation",
  },
  spacing: {
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
  },
}
```

## 5. Typography Direction

Typography should be clean, modern, and highly readable on both mobile and web.

Rules:

- Prefer a neutral geometric or humanist sans-serif.
- Use strong but not aggressive headings.
- Keep body text calm and legible.
- Use medium weights for labels and controls.
- Avoid decorative fonts.
- Avoid overly condensed admin typography.
- Use tabular numbers where financial values, unit counts, or dashboard metrics must align.

Web can use a web font after the local certificate/font-loading issue is resolved. Until then, system fonts are acceptable.

Mobile should use system fonts first for performance and native feel.

## 6. Spacing And Radius Rules

Spacing should feel generous enough to avoid old ERP density, while still supporting operational workflows.

Rules:

- Mobile screens should use 16-24px outer padding.
- Web content should use clear page gutters and consistent grid rhythm.
- Cards should generally use 18-24px radius.
- Small controls can use 8-12px radius.
- Pills, chips, and toggles can use full radius.
- Dense tables should be avoided in primary mobile workflows.
- Web tables are allowed for back-office work, but should be softened with spacing, sticky context, and clear hierarchy.

## 7. Card Style

Cards should be the primary visual container language.

Card rules:

- Large rounded radius.
- Soft glass background.
- Subtle border.
- Light inner glow.
- Soft ambient shadow.
- No hard rectangle feel.
- Use layered surfaces instead of heavy outlines.
- Avoid stacking cards inside cards unless the nested item is a repeated entity card.
- Prefer warm ivory page backgrounds with sage mist or glass panels.

Suggested visual language:

```ts
card = {
  background: "rgba(244, 246, 241, 0.78)",
  border: "1px solid rgba(47, 55, 43, 0.10)",
  shadow: "0 18px 45px rgba(47, 55, 43, 0.08)",
  innerGlow: "inset 0 1px 0 rgba(255, 255, 255, 0.72)",
  radius: 24,
}
```

## 8. Button Style

Buttons should feel tactile, rounded, and calm.

Button rules:

- Primary button: caramel copper.
- Secondary button: transparent or glass outline.
- Danger button: muted red.
- Success button: sage green.
- Buttons should use rounded corners and soft depth.
- Primary CTA can use a subtle copper gradient or soft fill.
- Avoid harsh saturated button colors.
- Icon buttons should use familiar icons where useful.
- Disabled states should be clearly muted but still readable.

Button token direction:

```ts
button = {
  primary: {
    background: "#C68A4E",
    text: "#FFFFFF",
  },
  secondary: {
    background: "rgba(255, 255, 255, 0.42)",
    border: "rgba(198, 138, 78, 0.45)",
    text: "#2F372B",
  },
  success: {
    background: "#5C6B57",
    text: "#FFFFFF",
  },
  danger: {
    background: "#D9534F",
    text: "#FFFFFF",
  },
}
```

## 9. Mobile UI Principles

Mobile is the primary experience for Supervisor, Contractor, and Agency users.

Mobile principles:

- Design for fast field actions first.
- Use large tap targets and clear thumb-friendly spacing.
- Prefer cards, lists, step flows, quick actions, and status chips over dense grids.
- Keep each screen focused on one operational job.
- Surface only the information needed for the user role and task.
- Use bottom navigation or simple protected shell navigation when mobile modules are introduced.
- Make status, assignment, due date, and evidence capture easy to scan.
- Keep forms short and progressive.
- Preserve offline-first sync as a future dedicated design and architecture task.

Mobile should feel like a premium field command app, not a squeezed web admin panel.

## 10. Web Admin UI Principles

The web app is the back-office portal for admin, operations, finance, sales, and management users.

Web principles:

- Use calm dashboards, clear modules, and permission-aware navigation.
- Avoid old ERP table-heavy first impressions.
- Use tables only where comparison, bulk review, or back-office operations require them.
- Pair tables with filters, summaries, and cards to reduce visual fatigue.
- Use soft panels, section bands, and meaningful empty/loading states.
- Keep advanced workflows organized through tabs, drawers, dialogs, and detail pages.
- Avoid marketing-style hero sections inside the authenticated portal.
- Use data density carefully; operational clarity matters more than decorative space.

## 11. Shared Token Strategy

The design system should separate shared meaning from platform implementation.

Shared strategy:

- Define color, fonts and typography, status colors, surfaces, spacing, radius, shadows, button sizes, card styles, form field styles, layout spacing, and icon sizes once.
- Web and mobile should consume the same semantic token names.
- Web and mobile may implement token mechanics differently.
- Future color combinations should require changing token values, not rewriting components.
- Product screens should reference semantic tokens, not raw palette names.

Example:

- Use `theme.color.action.primary`, not `#C68A4E`.
- Use `theme.color.background.app`, not `warmIvory`.
- Use `theme.radius.lg`, not a random one-off radius.

## 12. What Belongs In `packages/shared`

`packages/shared` should contain platform-neutral design definitions:

- Theme token names.
- Theme token TypeScript types.
- Brand color constants.
- Semantic color token contracts.
- Status color token contracts.
- Spacing/radius/elevation token contracts.
- Typography, icon-size, button-size, card, form-field, and layout token contracts.
- Shared status labels if they are already part of domain constants.

`packages/shared` should not contain:

- React components.
- React Native components.
- CSS classes.
- Tailwind-only configuration.
- Expo-specific style objects.
- Web-only layout rules.
- Business screen implementation.

## 13. What Belongs Separately In `apps/web` And `apps/mobile`

`apps/web` should own:

- CSS variables.
- Tailwind/theme mapping if used.
- Web component implementations.
- Web layout components such as sidebar, top bar, tables, drawers, and dialogs.
- Web-specific interaction states such as hover, focus-visible, keyboard navigation, and responsive desktop layouts.

`apps/mobile` should own:

- React Native style mappings.
- Native UI component implementations.
- Mobile screen shell, safe-area layout, bottom navigation, headers, cards, list items, and touch feedback.
- Mobile-specific state handling, tap targets, and navigation patterns.
- Secure storage and mobile session UX.

Both apps should use the same design language, but they should not share React component code.

## 14. Component Foundation List

Build component foundations before business screens.

Shared token foundation:

- Theme token types.
- Brand palette constants.
- Semantic color tokens.
- Radius, spacing, and elevation tokens.
- Status token mapping.

Web component foundation:

- Button.
- IconButton.
- Input.
- Select.
- Textarea.
- Checkbox.
- Radio.
- Card.
- Badge.
- StatusBadge.
- Chip.
- Tabs.
- Dialog.
- Modal.
- Drawer.
- DataTable.
- Table.
- PageHeader.
- SectionHeader.
- FilterBar.
- FormLayout.
- Sidebar.
- TopBar.
- EmptyState.
- LoadingState.
- ConfirmDialog.
- StatsCard.
- DashboardCard.

Mobile component foundation:

- Screen.
- Button.
- IconButton.
- Input.
- Card.
- Badge.
- StatusBadge.
- Chip.
- ListItem.
- SectionHeader.
- Header.
- BottomTabs.
- FloatingActionButton.
- Toggle.
- Modal.
- EmptyState.
- LoadingState.
- ActionSheet or bottom sheet.
- FormField.
- OfflineBanner.
- SyncStatus.
- WorkerCard.
- ProjectCard.
- ApprovalCard.

## 15. Rules For Future AI-Generated UI

AI-generated UI must follow these rules:

- Start from tokens and existing components.
- Build the design system and reusable UI foundation before creating web admin pages or mobile screens.
- Do not hardcode colors in screens unless creating or updating token files.
- Do not write copied one-off styles inside every page or screen.
- Do not create business screens before component foundations exist.
- Keep mobile and web components separate.
- Do not reuse web React components inside React Native.
- Keep mobile workflows card/list/action based.
- Avoid old ERP density unless a web back-office table genuinely needs it.
- Use the reconciled NirmanSite / BuilderSaaS semantic tokens for brand base, CTA, active states, status badges, surfaces, and text.
- Use warm ivory and soft glass surfaces for page and panel backgrounds.
- Use subtle shadow and borders; avoid heavy outlines.
- Preserve rounded, premium, calm, construction-tech feel.
- Any new palette must be introduced by changing semantic tokens first.
- New UI must remain accessible: readable contrast, clear focus states on web, and large tap targets on mobile.
- Do not introduce unrelated decorative gradients, blobs, or visual noise.

## 16. Acceptance Criteria

The design system direction is accepted when:

- The brand personality is documented as premium, calm, modern, trustworthy, construction-tech, and mobile-first.
- The finalized fourth logo direction is identified as the visual reference.
- The sage/olive, caramel copper, warm ivory, soft glass, and warm sand palette is documented.
- BuilderSaaS warm background, blueprint, dark coffee, construction-orange, and status-accent direction is reconciled into the same semantic token system before implementation.
- Semantic tokens are defined separately from raw palette values.
- Web and mobile responsibilities are separated.
- `packages/shared` is limited to token contracts and shared constants, not components.
- Web and mobile component foundation lists are documented.
- Component-first implementation is documented as the required path before building pages or screens.
- Future UI rules prevent hardcoded colors and old ERP styling.
- The document gives enough guidance for future token/component implementation without creating app code now.
