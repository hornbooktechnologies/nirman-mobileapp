import { StyleSheet, View, type ViewProps } from 'react-native';
import { useTranslation } from 'react-i18next';

import { mobileText, mobileTheme } from '../../theme';
import { AppText } from './app-text';

type SyncTone = 'online' | 'offline' | 'syncing' | 'attention';

const toneColor: Record<SyncTone, string> = {
  online: mobileTheme.color.status.success.foreground,
  offline: mobileTheme.color.status.warning.foreground,
  syncing: mobileTheme.color.status.info.foreground,
  attention: mobileTheme.color.status.danger.foreground,
};

export function SyncStatus({ tone = 'online', label, style, ...props }: ViewProps & { tone?: SyncTone; label?: string }) {
  const { t } = useTranslation('common');

  return (
    <View style={[styles.status, style]} {...props}>
      <View style={[styles.dot, { backgroundColor: toneColor[tone] }]} />
      <AppText style={styles.label} weight={700}>{label ?? t(`sync.${tone}`)}</AppText>
    </View>
  );
}

export function OfflineBanner({ visible = true, message, style, ...props }: ViewProps & { visible?: boolean; message?: string }) {
  const { t } = useTranslation('common');

  if (!visible) return null;

  return (
    <View style={[styles.banner, style]} {...props}>
      <AppText style={styles.bannerText} weight={500}>{message ?? t('sync.offlineBanner')}</AppText>
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
