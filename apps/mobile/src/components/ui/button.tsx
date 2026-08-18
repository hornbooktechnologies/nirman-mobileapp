import { Pressable, StyleSheet, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { mobileShadows, mobileTheme } from '../../theme';
import { AppIcon, type AppIconName } from './app-icon';

type ButtonProps = PressableProps & {
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'brand' | 'info' | 'secondary' | 'glass' | 'outline' | 'dark' | 'success' | 'danger' | 'ghost';
  fullWidth?: boolean;
  leadingIcon?: AppIconName;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Button({ label, size = 'md', variant = 'primary', fullWidth = true, leadingIcon, hitSlop, style, contentStyle, ...props }: ButtonProps) {
  const usesInverseContent = variant === 'primary' || variant === 'brand' || variant === 'info' || variant === 'success' || variant === 'danger' || variant === 'dark';

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={hitSlop ?? (size === 'sm' ? 4 : undefined)}
      style={(state) => [
        styles.base,
        styles[size],
        styles[variant],
        fullWidth ? styles.fullWidth : styles.inline,
        state.pressed && styles.pressed,
        contentStyle,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      {leadingIcon ? (
        <AppIcon
          color={usesInverseContent ? mobileTheme.color.text.inverse : mobileTheme.color.text.primary}
          name={leadingIcon}
          size={mobileTheme.icon.sm}
        />
      ) : null}
      <Text style={[styles.label, usesInverseContent ? styles.inverseLabel : styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: mobileTheme.component.button.radius,
    flexDirection: 'row',
    gap: mobileTheme.spacing[2],
    justifyContent: 'center',
  },
  sm: {
    minHeight: mobileTheme.component.button.height.sm,
    paddingHorizontal: mobileTheme.component.button.paddingX.sm,
  },
  md: {
    minHeight: mobileTheme.component.button.height.md,
    paddingHorizontal: mobileTheme.component.button.paddingX.md,
  },
  lg: {
    minHeight: mobileTheme.component.button.height.lg,
    paddingHorizontal: mobileTheme.component.button.paddingX.lg,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  inline: {
    alignSelf: 'flex-start',
  },
  primary: {
    backgroundColor: mobileTheme.color.action.primary,
    ...mobileShadows.copperGlow,
  },
  brand: {
    backgroundColor: mobileTheme.color.brand.primary,
  },
  info: {
    backgroundColor: mobileTheme.color.brand.blueprint,
  },
  secondary: {
    backgroundColor: mobileTheme.color.action.secondary,
    borderColor: mobileTheme.color.border.accent,
    borderWidth: 1,
  },
  glass: {
    backgroundColor: mobileTheme.color.glass.strong,
    borderColor: mobileTheme.color.border.inverse,
    borderWidth: 1,
  },
  outline: {
    backgroundColor: 'transparent',
    borderColor: mobileTheme.color.border.default,
    borderWidth: 1,
  },
  dark: {
    backgroundColor: mobileTheme.color.navigation.floating,
  },
  success: {
    backgroundColor: mobileTheme.color.action.success,
  },
  danger: {
    backgroundColor: mobileTheme.color.action.danger,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
  },
  inverseLabel: {
    color: mobileTheme.color.text.inverse,
  },
  secondaryLabel: {
    color: mobileTheme.color.text.primary,
  },
});
