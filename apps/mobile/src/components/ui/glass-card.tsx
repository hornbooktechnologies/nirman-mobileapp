import { StyleSheet, View, type ViewProps } from 'react-native';

import { mobileShadows, mobileTheme } from '../../theme';

type GlassCardProps = ViewProps & {
  variant?: 'subtle' | 'default' | 'strong' | 'sheet' | 'selected';
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

export function GlassCard({ variant = 'default', padding = 'md', style, ...props }: GlassCardProps) {
  return <View style={[styles.base, styles[variant], styles[padding], style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: mobileTheme.component.card.radius,
    borderWidth: 1,
  },
  subtle: {
    backgroundColor: mobileTheme.color.glass.subtle,
    borderColor: mobileTheme.color.border.inverse,
    ...mobileShadows.soft,
  },
  default: {
    backgroundColor: mobileTheme.color.glass.background,
    borderColor: mobileTheme.color.border.inverse,
    ...mobileShadows.card,
  },
  strong: {
    backgroundColor: mobileTheme.color.glass.strong,
    borderColor: mobileTheme.color.border.inverse,
    ...mobileShadows.floating,
  },
  sheet: {
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.inverse,
    borderTopLeftRadius: mobileTheme.radius.xl,
    borderTopRightRadius: mobileTheme.radius.xl,
    ...mobileShadows.sheet,
  },
  selected: {
    backgroundColor: mobileTheme.color.surface.selected,
    borderColor: mobileTheme.color.border.inverse,
    ...mobileShadows.copperGlow,
  },
  none: {
    padding: 0,
  },
  sm: {
    padding: mobileTheme.spacing[4],
  },
  md: {
    padding: mobileTheme.spacing[5],
  },
  lg: {
    padding: mobileTheme.spacing[6],
  },
});
