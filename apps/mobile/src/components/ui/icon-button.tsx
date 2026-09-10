import { Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { mobileShadows, mobileTheme } from '../../theme';
import { AppIcon, type AppIconName } from './app-icon';
import { AppText } from './app-text';

type IconButtonProps = PressableProps & {
  label?: string;
  icon?: AppIconName;
  showDot?: boolean;
  badgeCount?: number;
  variant?: 'default' | 'glass' | 'primary' | 'ghost' | 'dark' | 'danger';
};

export function IconButton({ label, icon: Icon, showDot = false, badgeCount = 0, variant = 'default', style, ...props }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      style={(state) => [styles.base, styles[variant], state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]}
      {...props}
    >
      {Icon ? (
        <AppIcon
          color={variant === 'primary' || variant === 'dark' || variant === 'danger' ? mobileTheme.color.text.inverse : mobileTheme.color.text.primary}
          name={Icon}
          size={mobileTheme.icon.md}
        />
      ) : (
        <AppText style={[styles.label, variant === 'primary' || variant === 'dark' || variant === 'danger' ? styles.inverseLabel : styles.defaultLabel]} weight={700}>{label}</AppText>
      )}
      {showDot ? <View style={styles.dot} /> : null}
      {badgeCount > 0 ? <View style={styles.badge}><AppText style={styles.badgeText} weight={700}>{badgeCount > 99 ? '99+' : String(badgeCount)}</AppText></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: mobileTheme.component.iconButton.radius,
    height: 50,
    justifyContent: 'center',
    width: 50,
  },
  default: {
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.subtle,
    borderWidth: 1,
    ...mobileShadows.soft,
  },
  glass: {
    backgroundColor: mobileTheme.color.glass.strong,
    borderColor: mobileTheme.color.border.inverse,
    borderWidth: 1,
    ...mobileShadows.soft,
  },
  primary: {
    backgroundColor: mobileTheme.color.action.primary,
    ...mobileShadows.copperGlow,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  dark: {
    backgroundColor: mobileTheme.color.navigation.floating,
  },
  danger: {
    backgroundColor: mobileTheme.color.action.danger,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  label: {
    fontSize: mobileTheme.typography.size.md,
  },
  defaultLabel: {
    color: mobileTheme.color.text.primary,
  },
  inverseLabel: {
    color: mobileTheme.color.text.inverse,
  },
  dot: {
    backgroundColor: mobileTheme.color.action.primary,
    borderColor: mobileTheme.color.text.inverse,
    borderRadius: mobileTheme.radius.full,
    borderWidth: 2,
    height: 11,
    position: 'absolute',
    right: 10,
    top: 9,
    width: 11,
  },
  badge: { alignItems: 'center', backgroundColor: mobileTheme.color.action.danger, borderColor: mobileTheme.color.text.inverse, borderRadius: mobileTheme.radius.full, borderWidth: 2, justifyContent: 'center', minHeight: 20, minWidth: 20, paddingHorizontal: 4, position: 'absolute', right: -4, top: -4 },
  badgeText: { color: mobileTheme.color.text.inverse, fontSize: 10, lineHeight: 12 },
});
