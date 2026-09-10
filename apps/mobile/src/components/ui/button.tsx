import { ActivityIndicator, Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { mobileShadows, mobileTheme } from '../../theme';
import { AppIcon, type AppIconName } from './app-icon';
import { AppText } from './app-text';

type ButtonProps = PressableProps & {
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'brand' | 'info' | 'secondary' | 'glass' | 'outline' | 'dark' | 'success' | 'danger' | 'ghost';
  fullWidth?: boolean;
  leadingIcon?: AppIconName;
  contentStyle?: StyleProp<ViewStyle>;
  loading?: boolean;
};

export function Button({ label, size = 'md', variant = 'primary', fullWidth = true, leadingIcon, hitSlop, style, contentStyle, loading = false, disabled, accessibilityState, ...props }: ButtonProps) {
  const usesInverseContent = variant === 'primary' || variant === 'brand' || variant === 'info' || variant === 'success' || variant === 'danger' || variant === 'dark';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      aria-busy={loading || accessibilityState?.busy}
      accessibilityState={{ ...accessibilityState, disabled: Boolean(isDisabled), busy: loading || accessibilityState?.busy }}
      disabled={isDisabled}
      hitSlop={hitSlop ?? (size === 'sm' ? 4 : undefined)}
      style={(state) => [
        styles.base,
        styles[size],
        styles[variant],
        fullWidth ? styles.fullWidth : styles.inline,
        state.pressed && !isDisabled && styles.pressed,
        contentStyle,
        typeof style === 'function' ? style(state) : style,
        loading && styles.loading,
      ]}
      {...props}
    >
      {loading ? <ActivityIndicator accessible={false} size="small" color={usesInverseContent ? mobileTheme.color.text.inverse : mobileTheme.color.text.link} /> : leadingIcon ? (
        <AppIcon
          color={usesInverseContent ? mobileTheme.color.text.inverse : variant === 'ghost' ? mobileTheme.color.text.link : mobileTheme.color.text.primary}
          name={leadingIcon}
          size={mobileTheme.icon.sm}
        />
      ) : null}
      <AppText style={[styles.label, usesInverseContent ? styles.inverseLabel : variant === 'ghost' ? styles.linkLabel : styles.secondaryLabel]} weight={700}>
        {label}
      </AppText>
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
  },
  loading: {
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
  inverseLabel: {
    color: mobileTheme.color.text.inverse,
  },
  secondaryLabel: {
    color: mobileTheme.color.text.primary,
  },
  linkLabel: {
    color: mobileTheme.color.text.link,
  },
});
