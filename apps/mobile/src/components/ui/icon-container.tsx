import { StyleSheet, View, type ViewProps } from 'react-native';

import { mobileTheme } from '../../theme';
import { AppIcon, type AppIconName } from './app-icon';

type IconContainerProps = ViewProps & {
  icon: AppIconName;
  variant?: 'neutral' | 'glass' | 'accent' | 'success' | 'warning' | 'danger' | 'dark';
  size?: 'sm' | 'md' | 'lg';
};

const sizeStyles = {
  sm: { box: 54, icon: mobileTheme.icon.md },
  md: { box: 62, icon: mobileTheme.icon.lg },
  lg: { box: 72, icon: mobileTheme.icon.xl },
} as const;

export function IconContainer({ icon: Icon, variant = 'glass', size = 'md', style, ...props }: IconContainerProps) {
  const dimensions = sizeStyles[size];

  return (
    <View style={[styles.base, styles[variant], { height: dimensions.box, width: dimensions.box }, style]} {...props}>
      <AppIcon color={iconColors[variant]} name={Icon} size={dimensions.icon} />
    </View>
  );
}

const iconColors = {
  neutral: mobileTheme.color.text.primary,
  glass: mobileTheme.color.brand.primary,
  accent: mobileTheme.color.action.primary,
  success: mobileTheme.color.status.success.foreground,
  warning: mobileTheme.color.status.warning.foreground,
  danger: mobileTheme.color.status.danger.foreground,
  dark: mobileTheme.color.text.inverse,
} as const;

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: mobileTheme.radius.full,
    justifyContent: 'center',
  },
  neutral: {
    backgroundColor: mobileTheme.color.surface.raised,
  },
  glass: {
    backgroundColor: mobileTheme.color.glass.strong,
    borderColor: mobileTheme.color.border.inverse,
    borderWidth: 1,
  },
  accent: {
    backgroundColor: mobileTheme.color.brand.secondarySoft,
  },
  success: {
    backgroundColor: mobileTheme.color.status.success.background,
  },
  warning: {
    backgroundColor: mobileTheme.color.status.warning.background,
  },
  danger: {
    backgroundColor: mobileTheme.color.status.danger.background,
  },
  dark: {
    backgroundColor: mobileTheme.color.navigation.floating,
  },
});
