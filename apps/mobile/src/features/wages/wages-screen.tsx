import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { WAGE_PAYMENT_METHODS, type WagePaymentMethod } from '@nirman-app/shared';

import {
  Button,
  Card,
  CompactScreenHeader,
  EmptyState,
  GradientScreen,
  Input,
  LoadingState,
} from '../../components/ui';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import type { WageBatch, WageBatchDetail, WageItem, WagePreview } from './types';
import {
  createWageBatch,
  exportWageBatchCsv,
  fetchWageBatchDetail,
  fetchWageBatches,
  fetchWagePreview,
  recordWagePayment,
  updateWageItem,
} from './services';

const today = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const monthStart = () => `${today().slice(0, 8)}01`;

const isDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

const currency = (value: string | number | null | undefined) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0));

const paymentMethodLabels: Record<WagePaymentMethod, string> = {
  CASH: 'Cash',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank',
  CHEQUE: 'Cheque',
  OTHER: 'Other',
};

const remainingAmount = (item: WageItem) =>
  Math.max(0, Number(item.netAmount) - Number(item.paidAmount)).toFixed(2);

export function WagesScreen() {
  const { session } = useSession();
  const activeProject = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = activeProject?.id ?? null;
  const canGenerate = permissions.includes('wages:generate');
  const canPay = permissions.includes('wages:mark-paid');
  const canUpdate = permissions.includes('wages:update');
  const canExport = permissions.includes('wages:export');
  const [periodStart, setPeriodStart] = useState(monthStart());
  const [periodEnd, setPeriodEnd] = useState(today());
  const [preview, setPreview] = useState<WagePreview | null>(null);
  const [batches, setBatches] = useState<WageBatch[]>([]);
  const [detail, setDetail] = useState<WageBatchDetail | null>(null);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<WagePaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const loadBatches = useCallback(async () => {
    if (!organizationId || !projectId || !session?.accessToken) return;
    setIsLoading(true);
    try {
      setBatches(await fetchWageBatches(organizationId, projectId, session.accessToken));
    } catch (error) {
      Alert.alert('Wages unavailable', error instanceof Error ? error.message : 'Try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, projectId, session?.accessToken]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  const selectedItem = useMemo(
    () => detail?.items.find((item) => item.id === selectedItemId) ?? null,
    [detail?.items, selectedItemId],
  );
  const previewReady = Boolean(preview?.items.length) && !preview?.items.some((item) => !item.isReady);

  async function generatePreview() {
    if (!organizationId || !projectId || !session?.accessToken || !isDate(periodStart) || !isDate(periodEnd)) {
      Alert.alert('Check wage period', 'Use YYYY-MM-DD dates.');
      return;
    }
    setIsBusy(true);
    try {
      setPreview(await fetchWagePreview(organizationId, projectId, periodStart, periodEnd, session.accessToken));
    } catch (error) {
      Alert.alert('Preview failed', error instanceof Error ? error.message : 'Unable to generate preview.');
    } finally {
      setIsBusy(false);
    }
  }

  async function confirmBatch() {
    if (!organizationId || !projectId || !session?.accessToken) return;
    setIsBusy(true);
    try {
      const created = await createWageBatch(organizationId, projectId, periodStart, periodEnd, session.accessToken);
      setDetail(created);
      await loadBatches();
      Alert.alert('Wage batch confirmed', `${created.items.length} worker wage items created.`);
    } catch (error) {
      Alert.alert('Confirmation failed', error instanceof Error ? error.message : 'Check wage readiness.');
    } finally {
      setIsBusy(false);
    }
  }

  async function openBatch(batchId: string) {
    if (!organizationId || !projectId || !session?.accessToken) return;
    setIsBusy(true);
    try {
      setDetail(await fetchWageBatchDetail(organizationId, projectId, batchId, session.accessToken));
      setSelectedItemId('');
      setAmount('');
      setAdjustmentAmount('');
      setItemNotes('');
    } catch (error) {
      Alert.alert('Batch unavailable', error instanceof Error ? error.message : 'Unable to load batch.');
    } finally {
      setIsBusy(false);
    }
  }

  async function pay() {
    if (!organizationId || !projectId || !session?.accessToken || !selectedItem || !amount) return;
    setIsBusy(true);
    try {
      const updated = await recordWagePayment(
        organizationId,
        projectId,
        selectedItem.id,
        {
          amount: Number(amount),
          paymentDate,
          paymentMethod,
          reference: reference || null,
          idempotencyKey: `${selectedItem.id}-${paymentDate}-${amount}-${Date.now()}`,
        },
        session.accessToken,
      );
      setDetail(updated);
      setSelectedItemId('');
      setAmount('');
      setReference('');
      setAdjustmentAmount('');
      setItemNotes('');
      await loadBatches();
      Alert.alert('Payment recorded', 'Worker wage payment history has been updated.');
    } catch (error) {
      Alert.alert('Payment failed', error instanceof Error ? error.message : 'Check payment amount.');
    } finally {
      setIsBusy(false);
    }
  }

  async function saveAdjustment() {
    if (!organizationId || !projectId || !session?.accessToken || !selectedItem) return;
    setIsBusy(true);
    try {
      const updated = await updateWageItem(
        organizationId,
        projectId,
        selectedItem.id,
        {
          adjustmentAmount: adjustmentAmount === '' ? undefined : Number(adjustmentAmount),
          notes: itemNotes || null,
        },
        session.accessToken,
      );
      setDetail(updated);
      await loadBatches();
      Alert.alert('Wage item updated', 'Adjustment and notes have been saved.');
    } catch (error) {
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Check the adjustment amount.');
    } finally {
      setIsBusy(false);
    }
  }

  async function exportBatch() {
    if (!organizationId || !projectId || !session?.accessToken || !detail) return;
    setIsBusy(true);
    try {
      const csv = await exportWageBatchCsv(organizationId, projectId, detail.id, session.accessToken);
      Alert.alert('Wage export', csv);
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Try again when connected.');
    } finally {
      setIsBusy(false);
    }
  }

  function chooseItem(item: WageItem) {
    setSelectedItemId(item.id);
    setAmount(remainingAmount(item));
    setAdjustmentAmount(item.adjustmentAmount);
    setItemNotes(item.notes ?? '');
  }

  return (
    <GradientScreen footer={<CustomerTabBar activeKey="wages" />}>
      <CompactScreenHeader title="Wages" subtitle={activeProject?.name ?? 'Choose a project'} />
      {!activeProject || !projectId ? <EmptyState title="No project selected" description="Choose an accessible project before opening Wages." /> : null}

      <Card style={styles.section}>
        <View style={styles.row}>
          <View style={styles.field}><Text style={styles.label}>START</Text><Input value={periodStart} onChangeText={setPeriodStart} placeholder="YYYY-MM-DD" /></View>
          <View style={styles.field}><Text style={styles.label}>END</Text><Input value={periodEnd} onChangeText={setPeriodEnd} placeholder="YYYY-MM-DD" /></View>
        </View>
        <Button label={isBusy ? 'Working' : 'Generate preview'} leadingIcon="calendar-range" disabled={isBusy} onPress={() => void generatePreview()} />
      </Card>

      {preview ? (
        <Card style={styles.section}>
          <View style={styles.headerRow}><Text style={styles.title}>Preview</Text><Text style={styles.total}>{currency(preview.totals.netAmount)}</Text></View>
          {preview.items.map((item) => (
            <View key={item.workerAssignmentId} style={styles.itemRow}>
              <View style={styles.itemCopy}><Text style={styles.itemName}>{item.workerName}</Text><Text style={styles.meta}>{item.presentDays} P / {item.halfDays} H / {item.absentDays} A</Text></View>
              <View style={styles.amountCopy}><Text style={styles.itemName}>{currency(item.netAmount)}</Text><Text style={[styles.meta, !item.isReady && styles.warning]}>{item.isReady ? 'Ready' : item.readinessIssue}</Text></View>
            </View>
          ))}
          {canGenerate ? <Button label="Confirm wage batch" leadingIcon="check-circle-outline" disabled={!previewReady || isBusy} onPress={() => void confirmBatch()} /> : null}
        </Card>
      ) : null}

      <Card style={styles.section}>
        <Text style={styles.title}>Confirmed batches</Text>
        {isLoading ? <LoadingState label="Loading batches" /> : null}
        {batches.map((batch) => (
          <Pressable key={batch.id} style={styles.batchButton} onPress={() => void openBatch(batch.id)}>
            <Text style={styles.itemName}>{batch.periodStart} to {batch.periodEnd}</Text>
            <Text style={styles.meta}>{batch.status} - Net {currency(batch.totals.netAmount)} - Paid {currency(batch.totals.paidAmount)}</Text>
          </Pressable>
        ))}
        {!isLoading && !batches.length ? <Text style={styles.meta}>No wage batches yet.</Text> : null}
      </Card>

      {detail ? (
        <Card style={styles.section}>
          <View style={styles.headerRow}><Text style={styles.title}>Batch detail</Text><Text style={styles.total}>{detail.status}</Text></View>
          <View style={styles.row}>
            <Text style={styles.meta}>Net {currency(detail.totals.netAmount)}</Text>
            <Text style={styles.meta}>Paid {currency(detail.totals.paidAmount)}</Text>
          </View>
          {canExport ? <Button label="Export wages" leadingIcon="download-outline" variant="secondary" disabled={isBusy} onPress={() => void exportBatch()} /> : null}
          {detail.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemCopy}><Text style={styles.itemName}>{item.workerName}</Text><Text style={styles.meta}>Due {currency(remainingAmount(item))} - {item.paymentStatus}</Text></View>
              {canPay || canUpdate ? <Button label={item.paymentStatus !== 'PAID' ? 'Select' : 'Edit'} variant="outline" onPress={() => chooseItem(item)} /> : null}
            </View>
          ))}
          {canPay ? (
            <View style={styles.paymentBox}>
              <Text style={styles.title}>Record payment</Text>
              <Input value={selectedItem ? selectedItem.workerName : ''} editable={false} placeholder="Select worker" />
              <View style={styles.row}><View style={styles.field}><Text style={styles.label}>AMOUNT</Text><Input value={amount} onChangeText={setAmount} keyboardType="numeric" /></View><View style={styles.field}><Text style={styles.label}>DATE</Text><Input value={paymentDate} onChangeText={setPaymentDate} /></View></View>
              <View style={styles.methodRow}>{WAGE_PAYMENT_METHODS.map((method) => <Pressable key={method} style={[styles.methodButton, paymentMethod === method && styles.methodSelected]} onPress={() => setPaymentMethod(method)}><Text style={styles.methodText}>{paymentMethodLabels[method]}</Text></Pressable>)}</View>
              <Input value={reference} onChangeText={setReference} placeholder="Optional reference" />
              <Button label="Record payment" leadingIcon="credit-card-outline" disabled={!selectedItemId || !amount || isBusy} onPress={() => void pay()} />
            </View>
          ) : null}
          {canUpdate ? (
            <View style={styles.paymentBox}>
              <Text style={styles.title}>Adjustment</Text>
              <Input value={selectedItem ? selectedItem.workerName : ''} editable={false} placeholder="Select worker" />
              <Text style={styles.label}>ADJUSTMENT</Text>
              <Input value={adjustmentAmount} onChangeText={setAdjustmentAmount} keyboardType="numeric" />
              <Text style={styles.label}>NOTES</Text>
              <Input value={itemNotes} onChangeText={setItemNotes} placeholder="Optional adjustment note" />
              <Button label="Save adjustment" leadingIcon="content-save-outline" disabled={!selectedItemId || isBusy} onPress={() => void saveAdjustment()} />
            </View>
          ) : null}
        </Card>
      ) : null}
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  section: { gap: mobileTheme.spacing[4] },
  row: { flexDirection: 'row', gap: mobileTheme.spacing[3] },
  field: { flex: 1, gap: mobileTheme.spacing[1] },
  label: { ...mobileText.caption, color: mobileTheme.color.text.muted, fontFamily: 'Manrope_700Bold' },
  title: { ...mobileText.body, color: mobileTheme.color.text.primary, fontFamily: 'Manrope_800ExtraBold' },
  total: { ...mobileText.body, color: mobileTheme.color.text.brand, fontFamily: 'Manrope_800ExtraBold' },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  itemRow: { alignItems: 'center', borderTopColor: mobileTheme.color.border.subtle, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', paddingTop: mobileTheme.spacing[3] },
  itemCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  amountCopy: { alignItems: 'flex-end', gap: mobileTheme.spacing[1] },
  itemName: { ...mobileText.body, color: mobileTheme.color.text.primary, fontFamily: 'Manrope_700Bold' },
  meta: { ...mobileText.caption, color: mobileTheme.color.text.muted },
  warning: { color: mobileTheme.color.status.warning.foreground },
  batchButton: { borderColor: mobileTheme.color.border.subtle, borderRadius: mobileTheme.radius.md, borderWidth: 1, gap: mobileTheme.spacing[1], padding: mobileTheme.spacing[3] },
  paymentBox: { borderTopColor: mobileTheme.color.border.subtle, borderTopWidth: 1, gap: mobileTheme.spacing[3], paddingTop: mobileTheme.spacing[4] },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  methodButton: { backgroundColor: mobileTheme.color.surface.raised, borderColor: mobileTheme.color.border.subtle, borderRadius: mobileTheme.radius.full, borderWidth: 1, paddingHorizontal: mobileTheme.spacing[3], paddingVertical: mobileTheme.spacing[2] },
  methodSelected: { borderColor: mobileTheme.color.border.accent, borderWidth: 2 },
  methodText: { ...mobileText.caption, color: mobileTheme.color.text.primary, fontFamily: 'Manrope_700Bold' },
});
