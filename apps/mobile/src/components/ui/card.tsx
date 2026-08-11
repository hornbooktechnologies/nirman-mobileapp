import { StyleSheet, View, type ViewProps } from 'react-native';

import { mobileShadows, mobileTheme } from '../../theme';

type CardProps = ViewProps & {
  variant?: 'default' | 'raised' | 'blueprint' | 'selected';
  padding?: 'none' | 'sm' | 'md' | 'lg';
};

export function Card({ variant = 'default', padding = 'md', style, ...props }: CardProps) {
  return <View style={[styles.base, styles[variant], styles[padding], style]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: mobileTheme.component.card.radius,
    borderWidth: 1,
  },
  default: {
    backgroundColor: mobileTheme.color.surface.card,
    borderColor: mobileTheme.color.border.subtle,
    ...mobileShadows.card,
  },
  raised: {
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.default,
    ...mobileShadows.floating,
  },
  blueprint: {
    backgroundColor: mobileTheme.color.surface.blueprint,
    borderColor: mobileTheme.color.border.blueprint,
    ...mobileShadows.soft,
  },
  selected: {
    backgroundColor: mobileTheme.color.surface.selected,
    borderColor: mobileTheme.color.border.selected,
    ...mobileShadows.copperGlow,
  },
  none: {
    padding: 0,
  },
  sm: {
    padding: mobileTheme.spacing[4],
  },
  md: {
    padding: mobileTheme.component.card.padding,
  },
  lg: {
    padding: mobileTheme.spacing[6],
  },
});
