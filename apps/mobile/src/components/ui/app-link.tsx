import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';
import { AppIcon } from './app-icon';
import { AppText } from './app-text';

type TextLinkProps = PressableProps & {
  label: string;
  variant?: 'default' | 'muted' | 'accent' | 'destructive';
  withChevron?: boolean;
};

export function TextLink({ label, variant = 'accent', withChevron = false, style, ...props }: TextLinkProps) {
  return (
    <Pressable style={(state) => [styles.link, state.pressed && styles.pressed, typeof style === 'function' ? style(state) : style]} {...props}>
      <AppText style={[styles.label, styles[variant]]} weight={600}>{label}</AppText>
      {withChevron ? <AppIcon color={linkColors[variant]} name="chevron-right" size={mobileTheme.icon.xs} /> : null}
    </Pressable>
  );
}

const linkColors = {
  default: mobileTheme.color.text.primary,
  muted: mobileTheme.color.text.muted,
  accent: mobileTheme.color.action.primary,
  destructive: mobileTheme.color.status.danger.foreground,
} as const;

const styles = StyleSheet.create({
  link: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: mobileTheme.spacing[1],
    minHeight: 40,
  },
  pressed: {
    opacity: 0.72,
  },
  label: {
    ...mobileText.label,
  },
  default: {
    color: linkColors.default,
  },
  muted: {
    color: linkColors.muted,
  },
  accent: {
    color: linkColors.accent,
  },
  destructive: {
    color: linkColors.destructive,
  },
});
