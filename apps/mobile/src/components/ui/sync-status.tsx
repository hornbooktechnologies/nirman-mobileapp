import { StyleSheet, Text, View, type ViewProps } from 'react-native';

import { mobileText, mobileTheme } from '../../theme';

type SyncTone = 'online' | 'offline' | 'syncing' | 'attention';

const syncCopy: Record<SyncTone, string> = {
  online: 'All saved',
  offline: 'Offline mode',
  syncing: 'Syncing',
  attention: 'Needs attention',
};

const toneColor: Record<SyncTone, string> = {
  online: mobileTheme.color.status.success.foreground,
  offline: mobileTheme.color.status.warning.foreground,
  syncing: mobileTheme.color.status.info.foreground,
  attention: mobileTheme.color.status.danger.foreground,
};

export function SyncStatus({ tone = 'online', label, style, ...props }: ViewProps & { tone?: SyncTone; label?: string }) {
  return (
    <View style={[styles.status, style]} {...props}>
      <View style={[styles.dot, { backgroundColor: toneColor[tone] }]} />
      <Text style={styles.label}>{label ?? syncCopy[tone]}</Text>
    </View>
  );
}

export function OfflineBanner({ visible = true, message = 'Offline mode active. New field entries can be saved locally later.', style, ...props }: ViewProps & { visible?: boolean; message?: string }) {
  if (!visible) return null;

  return (
    <View style={[styles.banner, style]} {...props}>
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  status: {
    alignItems: 'center',
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.subtle,
    borderRadius: mobileTheme.component.badge.radius,
    borderWidth: 1,
    flexDirection: 'row',
    gap: mobileTheme.spacing[2],
    paddingHorizontal: mobileTheme.spacing[3],
    paddingVertical: mobileTheme.spacing[2],
  },
  dot: {
    borderRadius: mobileTheme.radius.full,
    height: 8,
    width: 8,
  },
  label: {
    ...mobileText.caption,
    color: mobileTheme.color.text.primary,
    fontWeight: '700',
  },
  banner: {
    backgroundColor: mobileTheme.color.status.warning.background,
    borderColor: mobileTheme.color.status.warning.border,
    borderRadius: mobileTheme.radius.lg,
    borderWidth: 1,
    padding: mobileTheme.spacing[3],
  },
  bannerText: {
    ...mobileText.label,
    color: mobileTheme.color.status.warning.foreground,
  },
});
