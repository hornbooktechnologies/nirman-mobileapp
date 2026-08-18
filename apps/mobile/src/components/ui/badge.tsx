import { StyleSheet, Text, type TextProps } from 'react-native';

import { mobileTheme } from '../../theme';

export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'active' | 'current';

type BadgeProps = TextProps & {
  label: string;
  tone?: BadgeTone;
};

export const badgeToneTokens = {
  neutral: mobileTheme.color.status.neutral,
  success: mobileTheme.color.status.success,
  warning: mobileTheme.color.status.warning,
  danger: mobileTheme.color.status.danger,
  info: mobileTheme.color.status.info,
  purple: mobileTheme.color.status.purple,
  active: mobileTheme.color.status.success,
  current: {
    foreground: mobileTheme.color.text.inverse,
    background: mobileTheme.color.brand.blueprint,
    border: mobileTheme.color.brand.blueprint,
  },
} as const;

const SUCCESS_STATUSES = new Set([
  'ASSIGNED', 'APPROVED', 'COMPLETED', 'EMAIL_SENT', 'PAID', 'SUCCESS',
]);
const WARNING_STATUSES = new Set([
  'DRAFT', 'INVITED', 'ON_HOLD', 'PARTIAL', 'PENDING', 'UNASSIGNED', 'UNPAID',
]);
const DANGER_STATUSES = new Set([
  'ARCHIVED', 'CANCELLED', 'DEACTIVATED', 'EXPIRED', 'FAILED', 'INACTIVE', 'REJECTED', 'REVOKED', 'SUSPENDED',
]);
const INFO_STATUSES = new Set(['CUSTOM', 'IN_PROGRESS', 'SELECTED']);

export function getStatusTone(status: string | null | undefined): BadgeTone {
  const normalized = status?.trim().replaceAll('-', '_').replaceAll(' ', '_').toUpperCase() ?? '';
  if (normalized === 'CURRENT') return 'current';
  if (normalized === 'ACTIVE') return 'active';
  if (SUCCESS_STATUSES.has(normalized)) return 'success';
  if (WARNING_STATUSES.has(normalized)) return 'warning';
  if (DANGER_STATUSES.has(normalized)) return 'danger';
  if (INFO_STATUSES.has(normalized)) return 'info';
  return 'neutral';
}

export function Badge({ label, tone = 'neutral', style, ...props }: BadgeProps) {
  const toneTokens = badgeToneTokens[tone];

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

export function StatusBadge({ label, tone, ...props }: BadgeProps) {
  return <Badge label={label} tone={tone ?? getStatusTone(label)} {...props} />;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: mobileTheme.component.badge.radius,
    borderWidth: 1,
    fontSize: mobileTheme.typography.size.xs,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: mobileTheme.spacing[3],
    paddingVertical: mobileTheme.spacing[1],
  },
});
