import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon, AppText, OperationalEntityCard, type AppIconName } from '../../components/ui';
import { formatDate } from '../../i18n/formatters';
import { mobileText, mobileTheme } from '../../theme';
import type { SalesActivity } from './types';

export function SalesActivityCard({ activity }: { activity: SalesActivity }) {
  const { t, i18n } = useTranslation('sales');
  const language = (i18n.resolvedLanguage ?? 'en') as 'en' | 'hi' | 'gu';

  return <OperationalEntityCard compact contextLeading={t(`activity.${activity.activityType}`)} contextTrailing={formatDate(activity.occurredAt, language, { dateStyle: 'medium', timeStyle: 'short' })} title={activity.summary} supporting={activity.actorName ?? t('leadDetail.system')} tone={activity.activityType === 'LEAD_BOOKED' ? 'success' : activity.activityType === 'LEAD_LOST' || activity.activityType === 'BOOKING_CANCELLED' ? 'danger' : 'neutral'} />;
}

export function SalesSectionHeading({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <View style={styles.heading}><View style={styles.headingCopy}><AppText style={styles.title} weight={700}>{title}</AppText>{description ? <AppText style={styles.description} weight={500}>{description}</AppText> : null}</View>{action}</View>;
}

export function SalesChoice({ label, description, icon = 'chevron-right', selected = false, onPress }: { label: string; description?: string; icon?: AppIconName; selected?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}><View style={styles.choiceCopy}><AppText style={styles.choiceLabel} weight={700}>{label}</AppText>{description ? <AppText style={styles.description} weight={500}>{description}</AppText> : null}</View><AppIcon color={selected ? mobileTheme.color.action.primary : mobileTheme.color.text.muted} name={selected ? 'check-circle' : icon} size={24} /></Pressable>;
}

export function SalesDetailRows({ rows }: { rows: Array<{ label: string; value: string | null | undefined }> }) {
  return <View style={styles.rows}>{rows.filter((row) => row.value).map((row) => <View key={row.label} style={styles.row}><AppText style={styles.rowLabel} weight={600}>{row.label}</AppText><AppText style={styles.rowValue} weight={600}>{row.value}</AppText></View>)}</View>;
}

const styles = StyleSheet.create({
  heading: { alignItems: 'flex-start', flexDirection: 'row', gap: mobileTheme.spacing[3], justifyContent: 'space-between' },
  headingCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  title: { ...mobileText.sectionTitle },
  description: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  choice: { alignItems: 'center', backgroundColor: mobileTheme.color.surface.raised, borderColor: mobileTheme.color.border.subtle, borderRadius: mobileTheme.radius.lg, borderWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[3], minHeight: 52, padding: mobileTheme.spacing[3] },
  choiceSelected: { borderColor: mobileTheme.color.border.selected, backgroundColor: mobileTheme.color.action.secondary },
  pressed: { opacity: 0.8 },
  choiceCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  choiceLabel: { ...mobileText.label, color: mobileTheme.color.text.primary, fontSize: 15 },
  rows: { paddingHorizontal: mobileTheme.spacing[4], paddingVertical: mobileTheme.spacing[2] },
  row: { alignItems: 'flex-start', borderBottomColor: mobileTheme.color.border.subtle, borderBottomWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[3], justifyContent: 'space-between', minHeight: 42, paddingVertical: mobileTheme.spacing[2] },
  rowLabel: { ...mobileText.caption, color: mobileTheme.color.text.secondary, flex: 1 },
  rowValue: { ...mobileText.label, color: mobileTheme.color.text.primary, flex: 1.4, textAlign: 'right' },
});
