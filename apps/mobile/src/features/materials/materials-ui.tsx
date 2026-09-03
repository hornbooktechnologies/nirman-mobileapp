import type { MaterialRequestStatus } from '@nirman-app/shared';
import { StyleSheet, View } from 'react-native';

import { AppText, type BadgeTone } from '../../components/ui';
import { mobileText, mobileTheme } from '../../theme';

export const materialTone = (status: MaterialRequestStatus): BadgeTone => {
  if (status === 'DELIVERED' || status === 'APPROVED') return 'success';
  if (status === 'REJECTED' || status === 'CANCELLED') return 'danger';
  if (status === 'ORDERED' || status === 'PARTIALLY_DELIVERED') return 'info';
  if (status === 'RETURNED_FOR_CHANGES' || status.startsWith('PENDING')) return 'warning';
  return 'neutral';
};

export function MaterialDetailRows({ rows }: { rows: { label: string; value: string }[] }) {
  return <View style={styles.rows}>{rows.map((row) => <View accessible accessibilityLabel={`${row.label}: ${row.value}`} key={row.label} style={styles.row}><AppText style={styles.label}>{row.label}</AppText><AppText style={styles.value} weight={700}>{row.value}</AppText></View>)}</View>;
}

export const mutationKey = (scope: string) => `${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
export const today = () => new Date().toISOString().slice(0, 10);

const styles = StyleSheet.create({
  rows: { gap: mobileTheme.spacing[2] },
  row: { alignItems: 'flex-start', flexDirection: 'row', gap: mobileTheme.spacing[3], justifyContent: 'space-between', minHeight: 28 },
  label: { ...mobileText.caption, color: mobileTheme.color.text.secondary, flex: 1 },
  value: { ...mobileText.body, color: mobileTheme.color.text.primary, flex: 1.2, textAlign: 'right' },
});
