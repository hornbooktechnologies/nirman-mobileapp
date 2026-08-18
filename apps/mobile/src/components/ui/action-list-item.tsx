import { Pressable, StyleSheet, Text, View, type PressableProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';
import { AppIcon, type AppIconName } from './app-icon';

export type ActionTone = 'primary' | 'brand' | 'info' | 'danger' | 'neutral';

type ActionListItemProps = Omit<PressableProps, 'children'> & {
  icon: AppIconName;
  label: string;
  tone?: ActionTone;
};

export const actionToneTokens = {
  primary: {
    foreground: mobileTheme.color.action.primary,
    background: mobileTheme.color.brand.secondarySoft,
    border: mobileTheme.color.border.accent,
  },
  brand: {
    foreground: mobileTheme.color.brand.primary,
    background: mobileTheme.color.brand.primarySoft,
    border: mobileTheme.color.status.success.border,
  },
  info: mobileTheme.color.status.info,
  danger: mobileTheme.color.status.danger,
  neutral: mobileTheme.color.status.neutral,
} as const;

export function ActionListItem({ icon, label, tone = 'neutral', disabled, style, ...props }: ActionListItemProps) {
  const tokens = actionToneTokens[tone];

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.row,
        { backgroundColor: tokens.background, borderColor: tokens.border },
        disabled && styles.disabled,
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...props}
    >
      <View style={[styles.iconShell, { borderColor: tokens.border }]}>
        <AppIcon color={tokens.foreground} name={icon} size={mobileTheme.icon.lg} />
      </View>
      <Text style={[styles.label, { color: tokens.foreground }]}>{label}</Text>
      <AppIcon color={tokens.foreground} name="chevron-right" size={mobileTheme.icon.md} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderRadius: mobileTheme.radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[3],
    minHeight: 60,
    paddingHorizontal: mobileTheme.spacing[3],
    paddingVertical: mobileTheme.spacing[2],
  },
  iconShell: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.glass.strong,
    borderRadius: mobileTheme.component.iconContainer.radius,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  label: {
    ...mobileText.label,
    flex: 1,
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
  },
  disabled: { opacity: 0.46 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
