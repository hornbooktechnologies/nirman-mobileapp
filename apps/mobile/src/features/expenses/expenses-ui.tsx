import type { ExpenseStatus } from '@nirman-app/shared';
import { StyleSheet, View } from 'react-native';

import { AppText, type BadgeTone } from '../../components/ui';
import { mobileText, mobileTheme } from '../../theme';

export const expenseTone = (status: ExpenseStatus): BadgeTone => {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'danger';
  if (status === 'PENDING_APPROVAL') return 'warning';
  return 'neutral';
};

export const mutationKey = (scope: string) => `${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
export const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Kolkata', year: 'numeric' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

export function ExpenseDetailRows({ rows }: { rows: { label: string; value: string }[] }) {
  return <View style={styles.rows}>{rows.map((row) => <View accessible accessibilityLabel={`${row.label}: ${row.value}`} key={row.label} style={styles.row}><AppText style={styles.label}>{row.label}</AppText><AppText style={styles.value} weight={700}>{row.value}</AppText></View>)}</View>;
}

const styles = StyleSheet.create({
  rows: { gap: mobileTheme.spacing[2] },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: mobileTheme.spacing[3], justifyContent: 'space-between', minHeight: 30 },
  label: { ...mobileText.caption, color: mobileTheme.color.text.secondary, flex: 1 },
  value: { ...mobileText.body, color: mobileTheme.color.text.primary, flex: 1.35, textAlign: 'right' },
});
