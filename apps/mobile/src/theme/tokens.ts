import { nirmanSiteThemeTokens } from '@nirman-app/shared';

export const mobileTheme = nirmanSiteThemeTokens;

export const mobileShadows = {
  soft: {
    shadowColor: mobileTheme.shadow.soft.color,
    shadowOffset: {
      width: mobileTheme.shadow.soft.offsetX,
      height: mobileTheme.shadow.soft.offsetY,
    },
    shadowOpacity: 1,
    shadowRadius: mobileTheme.shadow.soft.blur / 2,
    elevation: mobileTheme.elevation.soft,
  },
  card: {
    shadowColor: mobileTheme.shadow.card.color,
    shadowOffset: {
      width: mobileTheme.shadow.card.offsetX,
      height: mobileTheme.shadow.card.offsetY,
    },
    shadowOpacity: 1,
    shadowRadius: mobileTheme.shadow.card.blur / 2,
    elevation: mobileTheme.elevation.card,
  },
  copperGlow: {
    shadowColor: mobileTheme.shadow.copperGlow.color,
    shadowOffset: {
      width: mobileTheme.shadow.copperGlow.offsetX,
      height: mobileTheme.shadow.copperGlow.offsetY,
    },
    shadowOpacity: 1,
    shadowRadius: mobileTheme.shadow.copperGlow.blur / 2,
    elevation: mobileTheme.elevation.soft,
  },
  floating: {
    shadowColor: mobileTheme.shadow.floating.color,
    shadowOffset: {
      width: mobileTheme.shadow.floating.offsetX,
      height: mobileTheme.shadow.floating.offsetY,
    },
    shadowOpacity: 1,
    shadowRadius: mobileTheme.shadow.floating.blur / 2,
    elevation: mobileTheme.elevation.floating,
  },
  sheet: {
    shadowColor: mobileTheme.shadow.sheet.color,
    shadowOffset: {
      width: mobileTheme.shadow.sheet.offsetX,
      height: mobileTheme.shadow.sheet.offsetY,
    },
    shadowOpacity: 1,
    shadowRadius: mobileTheme.shadow.sheet.blur / 2,
    elevation: mobileTheme.elevation.sheet,
  },
  navigation: {
    shadowColor: mobileTheme.shadow.navigation.color,
    shadowOffset: {
      width: mobileTheme.shadow.navigation.offsetX,
      height: mobileTheme.shadow.navigation.offsetY,
    },
    shadowOpacity: 1,
    shadowRadius: mobileTheme.shadow.navigation.blur / 2,
    elevation: mobileTheme.elevation.navigation,
  },
} as const;

export const mobileText = {
  display: {
    color: mobileTheme.color.text.primary,
    fontFamily: 'Manrope_700Bold',
    fontSize: mobileTheme.typography.size.display,
    lineHeight: mobileTheme.typography.size.display * mobileTheme.typography.lineHeight.tight,
  },
  title: {
    color: mobileTheme.color.text.primary,
    fontFamily: 'Manrope_700Bold',
    fontSize: mobileTheme.typography.size.xxl,
    lineHeight: mobileTheme.typography.size.xxl * mobileTheme.typography.lineHeight.tight,
  },
  sectionTitle: {
    color: mobileTheme.color.text.primary,
    fontFamily: 'Manrope_700Bold',
    fontSize: mobileTheme.typography.size.lg,
    lineHeight: mobileTheme.typography.size.lg * mobileTheme.typography.lineHeight.normal,
  },
  body: {
    color: mobileTheme.color.text.secondary,
    fontFamily: 'Manrope_500Medium',
    fontSize: mobileTheme.typography.size.md,
    lineHeight: mobileTheme.typography.size.md * mobileTheme.typography.lineHeight.normal,
  },
  label: {
    color: mobileTheme.color.text.secondary,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: mobileTheme.typography.size.sm,
    lineHeight: mobileTheme.typography.size.sm * mobileTheme.typography.lineHeight.normal,
  },
  caption: {
    color: mobileTheme.color.text.muted,
    fontFamily: 'Manrope_500Medium',
    fontSize: mobileTheme.typography.size.xs,
    lineHeight: mobileTheme.typography.size.xs * mobileTheme.typography.lineHeight.normal,
  },
  numericHero: {
    color: mobileTheme.color.text.primary,
    fontFamily: 'Manrope_700Bold',
    fontSize: 52,
    lineHeight: 58,
  },
  button: {
    color: mobileTheme.color.text.inverse,
    fontFamily: 'Manrope_700Bold',
    fontSize: mobileTheme.typography.size.sm,
    lineHeight: mobileTheme.typography.size.sm * mobileTheme.typography.lineHeight.normal,
  },
} as const;
