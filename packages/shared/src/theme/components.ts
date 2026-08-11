import { nirmanSiteThemeTokens } from './tokens';

export const componentTokenNames = {
  card: {
    default: {
      background: 'color.glass.background',
      border: 'color.border.subtle',
      innerGlow: 'color.glass.innerGlow',
      shadow: 'shadow.card',
      radius: 'radius.xl',
    },
    elevated: {
      background: 'color.glass.elevated',
      border: 'color.border.default',
      innerGlow: 'color.glass.innerGlow',
      shadow: 'shadow.elevated',
      radius: 'radius.xl',
    },
  },
  button: {
    primary: {
      background: 'color.action.primary',
      foreground: 'color.text.inverse',
      shadow: 'shadow.copperGlow',
      radius: 'radius.lg',
    },
    secondary: {
      background: 'color.action.secondary',
      foreground: 'color.text.primary',
      border: 'color.border.accent',
      radius: 'radius.lg',
    },
    success: {
      background: 'color.action.success',
      foreground: 'color.text.inverse',
      radius: 'radius.lg',
    },
    danger: {
      background: 'color.action.danger',
      foreground: 'color.text.inverse',
      radius: 'radius.lg',
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
      radius: 'radius.full',
    },
    selected: {
      background: 'color.action.primary',
      foreground: 'color.text.inverse',
      radius: 'radius.full',
    },
  },
  badge: {
    neutral: {
      background: 'color.status.neutral.background',
      foreground: 'color.status.neutral.foreground',
      border: 'color.status.neutral.border',
      radius: 'radius.full',
    },
    success: {
      background: 'color.status.success.background',
      foreground: 'color.status.success.foreground',
      border: 'color.status.success.border',
      radius: 'radius.full',
    },
    warning: {
      background: 'color.status.warning.background',
      foreground: 'color.status.warning.foreground',
      border: 'color.status.warning.border',
      radius: 'radius.full',
    },
    danger: {
      background: 'color.status.danger.background',
      foreground: 'color.status.danger.foreground',
      border: 'color.status.danger.border',
      radius: 'radius.full',
    },
    info: {
      background: 'color.status.info.background',
      foreground: 'color.status.info.foreground',
      border: 'color.status.info.border',
      radius: 'radius.full',
    },
    purple: {
      background: 'color.status.purple.background',
      foreground: 'color.status.purple.foreground',
      border: 'color.status.purple.border',
      radius: 'radius.full',
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
    radius: nirmanSiteThemeTokens.radius.lg,
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
