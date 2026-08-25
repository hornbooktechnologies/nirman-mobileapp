import type { AttendanceSummaryResponse } from '@nirman-app/shared';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText } from '../../components/ui';
import { mobileText, mobileTheme } from '../../theme';

export function formatAttendanceNumber(locale: string, value: number) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
}

export function AttendanceMetric({ label, value, compact = false }: { label: string; value: string | number; compact?: boolean }) {
  return (
    <View style={[styles.metric, compact && styles.metricCompact]}>
      <AppText style={styles.metricValue} weight={700}>{value}</AppText>
      <AppText style={styles.metricLabel} weight={500}>{label}</AppText>
    </View>
  );
}

export function AttendanceTotals({ locale, totals, includeWorkers = false }: {
  locale: string;
  totals: AttendanceSummaryResponse['totals'] | {
    expectedWorkingDays: number;
    presentDays: number;
    absentDays: number;
  };
  includeWorkers?: boolean;
}) {
  const { t } = useTranslation('attendance');

  return (
    <View style={styles.grid}>
      {includeWorkers && 'workers' in totals ? (
        <AttendanceMetric label={t('summary.workers')} value={formatAttendanceNumber(locale, totals.workers)} />
      ) : null}
      <AttendanceMetric label={t('summary.expectedDays')} value={formatAttendanceNumber(locale, totals.expectedWorkingDays)} />
      <AttendanceMetric label={t('summary.presentDays')} value={formatAttendanceNumber(locale, totals.presentDays)} />
      <AttendanceMetric label={t('summary.absentDays')} value={formatAttendanceNumber(locale, totals.absentDays)} />
    </View>
  );
}

export function AttendanceTotalsTable({ locale, totals, embedded = false }: {
  locale: string;
  totals: {
    expectedWorkingDays: number;
    presentDays: number;
    absentDays: number;
  };
  embedded?: boolean;
}) {
  const { t } = useTranslation('attendance');
  const columns = [
    { key: 'working', label: t('summary.expectedDays'), value: totals.expectedWorkingDays },
    { key: 'present', label: t('summary.presentDays'), value: totals.presentDays },
    { key: 'absent', label: t('summary.absentDays'), value: totals.absentDays },
  ];

  return (
    <View style={[styles.table, embedded && styles.tableEmbedded]}>
      {columns.map((column, index) => {
        const value = formatAttendanceNumber(locale, column.value);
        return (
          <View
            accessible
            accessibilityLabel={`${column.label}: ${value}`}
            key={column.key}
            style={[styles.tableCell, embedded && styles.tableCellEmbedded, index > 0 && styles.tableCellDivider]}
          >
            <AppText style={styles.tableValue} weight={700}>{value}</AppText>
            <AppText style={styles.tableLabel} weight={600}>{column.label}</AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  metric: {
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.subtle,
    borderRadius: mobileTheme.component.card.radius,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    gap: mobileTheme.spacing[1],
    minHeight: 82,
    padding: mobileTheme.spacing[3],
  },
  metricCompact: {
    backgroundColor: mobileTheme.color.background.mist,
    borderRadius: mobileTheme.radius.md,
    flexBasis: '30%',
    minHeight: 68,
    padding: mobileTheme.spacing[2],
  },
  metricValue: { ...mobileText.sectionTitle, fontVariant: ['tabular-nums'] },
  metricLabel: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  table: {
    backgroundColor: mobileTheme.color.surface.raised,
    borderColor: mobileTheme.color.border.subtle,
    borderRadius: mobileTheme.component.card.radius,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  tableCell: {
    alignItems: 'center',
    flex: 1,
    gap: mobileTheme.spacing[1],
    justifyContent: 'center',
    minHeight: 76,
    minWidth: 0,
    paddingHorizontal: mobileTheme.spacing[1],
    paddingVertical: mobileTheme.spacing[3],
  },
  tableEmbedded: {
    borderRadius: 0,
    borderWidth: 0,
  },
  tableCellEmbedded: {
    minHeight: 60,
    paddingVertical: mobileTheme.spacing[2],
  },
  tableCellDivider: {
    borderLeftColor: mobileTheme.color.border.subtle,
    borderLeftWidth: 1,
  },
  tableValue: {
    ...mobileText.sectionTitle,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    lineHeight: 26,
    textAlign: 'center',
  },
  tableLabel: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
    textAlign: 'center',
  },
});
