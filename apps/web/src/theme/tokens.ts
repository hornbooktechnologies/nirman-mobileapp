import { nirmanSiteThemeTokens } from "@nirman-app/shared";

export const webTheme = nirmanSiteThemeTokens;

const shadowToCss = (shadow: (typeof webTheme.shadow)[keyof typeof webTheme.shadow]) =>
  `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.spread}px ${shadow.color}`;

export const webThemeCssVariables = {
  "--color-canvas": webTheme.color.background.app,
  "--color-card": webTheme.color.background.panel,
  "--color-surface": webTheme.color.background.elevated,
  "--color-sunken": webTheme.color.background.mist,
  "--color-ink": webTheme.color.brand.coffee,
  "--color-body": webTheme.color.text.primary,
  "--color-sub": webTheme.color.text.secondary,
  "--color-muted": webTheme.color.text.muted,
  "--color-hairline": webTheme.color.border.default,
  "--color-lime": webTheme.color.action.primary,
  "--color-lime-pale": webTheme.gradient.constructionPrimary[0],
  "--color-lime-ink": webTheme.color.text.inverse,
  "--color-lime-sub": webTheme.color.action.primaryHover,
  "--color-lime-faint": webTheme.color.status.warning.background,
  "--color-success": webTheme.color.status.success.foreground,
  "--color-danger": webTheme.color.status.danger.foreground,
  "--color-warning": webTheme.color.status.warning.foreground,
  "--color-info": webTheme.color.status.info.foreground,
  "--glass-card": webTheme.color.glass.background,
  "--glass-elevated": webTheme.color.glass.elevated,
  "--glass-inner": `inset 0 1px 0 ${webTheme.color.glass.innerGlow}`,
  "--shadow-card": shadowToCss(webTheme.shadow.card),
  "--shadow-copper": shadowToCss(webTheme.shadow.copperGlow),
  "--shadow-floating": shadowToCss(webTheme.shadow.floating),
} as const;

export const brandAssets = {
  logoFull: "/brand/logo-full.png",
  logoMark: "/brand/logo-mark.png",
} as const;
