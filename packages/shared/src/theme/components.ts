import { nirmanSiteThemeTokens } from './tokens';

export const componentTokenNames = {
  card: {
    default: {
      background: 'color.glass.background',
      border: 'color.border.subtle',
      innerGlow: 'color.glass.innerGlow',
      shadow: 'shadow.card',
      radius: 'component.card.radius',
    },
    elevated: {
      background: 'color.glass.elevated',
      border: 'color.border.default',
      innerGlow: 'color.glass.innerGlow',
      shadow: 'shadow.elevated',
      radius: 'component.card.radius',
    },
  },
  button: {
    primary: {
      background: 'color.action.primary',
      foreground: 'color.text.inverse',
      shadow: 'shadow.copperGlow',
      radius: 'component.button.radius',
    },
    secondary: {
      background: 'color.action.secondary',
      foreground: 'color.text.primary',
      border: 'color.border.accent',
      radius: 'component.button.radius',
    },
    success: {
      background: 'color.action.success',
      foreground: 'color.text.inverse',
      radius: 'component.button.radius',
    },
    danger: {
      background: 'color.action.danger',
      foreground: 'color.text.inverse',
      radius: 'component.button.radius',
    },
  },
  field: {
    default: {
      background: 'component.field.background',
      border: 'component.field.border',
      foreground: 'color.text.primary',
      radius: 'component.field.radius',
    },
    focused: {
      border: 'component.field.focusBorder',
      ring: 'color.action.focus',
    },
  },
  chip: {
    default: {
      background: 'color.glass.overlay',
      foreground: 'color.text.secondary',
      border: 'color.border.subtle',
      radius: 'component.chip.radius',
    },
    selected: {
      background: 'color.action.primary',
      foreground: 'color.text.inverse',
      radius: 'component.chip.radius',
    },
  },
  badge: {
    neutral: {
      background: 'color.status.neutral.background',
      foreground: 'color.status.neutral.foreground',
      border: 'color.status.neutral.border',
      radius: 'component.badge.radius',
    },
    success: {
      background: 'color.status.success.background',
      foreground: 'color.status.success.foreground',
      border: 'color.status.success.border',
      radius: 'component.badge.radius',
    },
    warning: {
      background: 'color.status.warning.background',
      foreground: 'color.status.warning.foreground',
      border: 'color.status.warning.border',
      radius: 'component.badge.radius',
    },
    danger: {
      background: 'color.status.danger.background',
      foreground: 'color.status.danger.foreground',
      border: 'color.status.danger.border',
      radius: 'component.badge.radius',
    },
    info: {
      background: 'color.status.info.background',
      foreground: 'color.status.info.foreground',
      border: 'color.status.info.border',
      radius: 'component.badge.radius',
    },
    purple: {
      background: 'color.status.purple.background',
      foreground: 'color.status.purple.foreground',
      border: 'color.status.purple.border',
      radius: 'component.badge.radius',
    },
  },
  screen: {
    default: {
      background: 'color.background.app',
      foreground: 'color.text.primary',
    },
    inverse: {
      background: 'color.background.inverse',
      foreground: 'color.text.inverse',
    },
  },
  bottomNavigation: {
    background: 'component.nav.background',
    activeBackground: 'component.nav.activeBackground',
    radius: 'component.nav.radius',
    shadow: 'shadow.floating',
  },
} as const;

export const componentDefaults = {
  card: {
    radius: nirmanSiteThemeTokens.radius.xl,
    borderWidth: 1,
  },
  button: {
    radius: nirmanSiteThemeTokens.component.button.radius,
    minHeight: nirmanSiteThemeTokens.component.button.height.md,
  },
  field: {
    minHeight: nirmanSiteThemeTokens.component.field.height,
    radius: nirmanSiteThemeTokens.component.field.radius,
  },
  mobileTapTarget: {
    minHeight: 50,
    minWidth: 50,
  },
} as const;

export type ComponentTokenNames = typeof componentTokenNames;
export type ComponentDefaults = typeof componentDefaults;
