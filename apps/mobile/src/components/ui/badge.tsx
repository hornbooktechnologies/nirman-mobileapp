import { StyleSheet, Text, type TextProps } from 'react-native';

import { mobileTheme } from '../../theme';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'active';

type BadgeProps = TextProps & {
  label: string;
  tone?: BadgeTone;
};

const toneStyle = {
  neutral: mobileTheme.color.status.neutral,
  success: mobileTheme.color.status.success,
  warning: mobileTheme.color.status.warning,
  danger: mobileTheme.color.status.danger,
  info: mobileTheme.color.status.info,
  purple: mobileTheme.color.status.purple,
  active: {
    foreground: mobileTheme.color.text.inverse,
    background: mobileTheme.color.action.active,
    border: mobileTheme.color.border.selected,
  },
} as const;

export function Badge({ label, tone = 'neutral', style, ...props }: BadgeProps) {
  const toneTokens = toneStyle[tone];

  return (
    <Text
      style={[
        styles.badge,
        {
          backgroundColor: toneTokens.background,
          borderColor: toneTokens.border,
          color: toneTokens.foreground,
        },
        style,
      ]}
      {...props}
    >
      {label}
    </Text>
  );
}

export function StatusBadge(props: BadgeProps) {
  return <Badge {...props} />;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: mobileTheme.radius.full,
    borderWidth: 1,
    fontSize: mobileTheme.typography.size.xs,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: mobileTheme.spacing[3],
    paddingVertical: mobileTheme.spacing[1],
  },
});
