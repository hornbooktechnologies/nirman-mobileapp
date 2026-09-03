import { WAGE_PAYMENT_METHODS, type WagePaymentMethod } from '@nirman-app/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Badge,
  BottomSheet,
  Button,
  Card,
  CompactScreenHeader,
  DateInput,
  EmptyState,
  FormError,
  FormField,
  IconButton,
  Input,
  NirmanScreenBackground,
  OperationalEntityCard,
  StatusBadge,
  getStatusTone,
} from '../../components/ui';
import { formatDate, formatInr } from '../../i18n';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import { ProjectContextCard } from '../projects';
import { exportWageBatchCsv, fetchWageBatchDetail, recordWagePayment, updateWageItem } from './services';
import type { WageBatchDetail, WageItem } from './types';

type AdjustmentMode = 'ADD' | 'DEDUCT';

const today = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const dateValue = (value: string) => new Date(`${value}T12:00:00`);
const remainingValue = (item: WageItem) => Math.max(0, Number(item.netAmount) - Number(item.paidAmount));
const isSettledByKharchi = (item: WageItem) =>
  remainingValue(item) === 0 &&
  Number(item.paidAmount) <= 0 &&
  Number(item.kharchiDeduction) > 0;

export function WageBatchDetailScreen() {
  const { t } = useTranslation('wages');
  const { t: tCommon } = useTranslation('common');
  const { language } = useLocalization();
  const { batchId } = useLocalSearchParams<{ batchId?: string }>();
  const { session } = useSession();
  const activeProject = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = activeProject?.id ?? null;
  const canPay = permissions.includes('wages:mark-paid');
  const canUpdate = permissions.includes('wages:update');
  const canExport = permissions.includes('wages:export');
  const [detail, setDetail] = useState<WageBatchDetail | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [paymentMethod, setPaymentMethod] = useState<WagePaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [adjustmentMode, setAdjustmentMode] = useState<AdjustmentMode>('ADD');
  const [adjustmentAmount, setAdjustmentAmount] = useState('');
  const [itemNotes, setItemNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const loadDetail = useCallback(async () => {
    if (!organizationId || !projectId || !session?.accessToken || !batchId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      setDetail(await fetchWageBatchDetail(organizationId, projectId, batchId, session.accessToken));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('errors.batchMessage'));
    } finally {
      setIsLoading(false);
    }
  }, [batchId, organizationId, projectId, session?.accessToken, t]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  const selectedItem = useMemo(
    () => detail?.items.find((item) => item.id === selectedItemId) ?? null,
    [detail?.items, selectedItemId],
  );
  const selectedRemaining = selectedItem ? remainingValue(selectedItem) : 0;
  const selectedSettledByKharchi = selectedItem ? isSettledByKharchi(selectedItem) : false;
  const paymentValue = Number(amount);
  const paymentError = !amount
    ? ''
    : !Number.isFinite(paymentValue) || paymentValue <= 0
      ? t('payment.invalidAmount')
      : paymentValue > selectedRemaining
        ? t('payment.exceedsDue', { amount: formatInr(selectedRemaining, language) })
        : '';
  const adjustmentValue = Number(adjustmentAmount);
  const adjustmentError = !adjustmentAmount
    ? ''
    : !Number.isFinite(adjustmentValue) || adjustmentValue < 0
      ? t('adjustment.invalidAmount')
      : '';

  function openWorker(item: WageItem) {
    const existingAdjustment = Number(item.adjustmentAmount);
    setSelectedItemId(item.id);
    setAmount(remainingValue(item).toFixed(2));
    setPaymentDate(today());
    setPaymentMethod('CASH');
    setReference('');
    setAdjustmentMode(existingAdjustment < 0 ? 'DEDUCT' : 'ADD');
    setAdjustmentAmount(Math.abs(existingAdjustment).toFixed(2));
    setItemNotes(item.notes ?? '');
  }

  function closeWorker() {
    if (!isBusy) setSelectedItemId(null);
  }

  async function pay() {
    if (!organizationId || !projectId || !session?.accessToken || !selectedItem || !amount || paymentError) return;
    setIsBusy(true);
    try {
      const updated = await recordWagePayment(
        organizationId,
        projectId,
        selectedItem.id,
        {
          amount: paymentValue,
          paymentDate,
          paymentMethod,
          reference: reference.trim() || null,
          idempotencyKey: `${selectedItem.id}-${paymentDate}-${amount}-${Date.now()}`,
        },
        session.accessToken,
      );
      setDetail(updated);
      setSelectedItemId(null);
      Alert.alert(t('payment.successTitle'), t('payment.successMessage'));
    } catch (paymentFailure) {
      Alert.alert(t('payment.failedTitle'), paymentFailure instanceof Error ? paymentFailure.message : t('payment.failedMessage'));
    } finally {
      setIsBusy(false);
    }
  }

  async function saveAdjustment() {
    if (!organizationId || !projectId || !session?.accessToken || !selectedItem || !adjustmentAmount || adjustmentError) return;
    setIsBusy(true);
    try {
      const signedAmount = adjustmentMode === 'DEDUCT' ? -adjustmentValue : adjustmentValue;
      const updated = await updateWageItem(
        organizationId,
        projectId,
        selectedItem.id,
        { adjustmentAmount: signedAmount, notes: itemNotes.trim() || null },
        session.accessToken,
      );
      setDetail(updated);
      setSelectedItemId(null);
      Alert.alert(t('adjustment.successTitle'), t('adjustment.successMessage'));
    } catch (adjustmentFailure) {
      Alert.alert(t('adjustment.failedTitle'), adjustmentFailure instanceof Error ? adjustmentFailure.message : t('adjustment.failedMessage'));
    } finally {
      setIsBusy(false);
    }
  }

  async function exportBatch() {
    if (!organizationId || !projectId || !session?.accessToken || !detail) return;
    setIsBusy(true);
    try {
      const csv = await exportWageBatchCsv(organizationId, projectId, detail.id, session.accessToken);
      Alert.alert(t('export.title'), csv);
    } catch (exportFailure) {
      Alert.alert(t('export.failedTitle'), exportFailure instanceof Error ? exportFailure.message : t('export.failedMessage'));
    } finally {
      setIsBusy(false);
    }
  }

  const totalDue = detail ? Math.max(0, Number(detail.totals.netAmount) - Number(detail.totals.paidAmount)) : 0;
  const header = (
    <View style={styles.headerContent}>
      <CompactScreenHeader
        leading={<IconButton accessibilityLabel={tCommon('actions.back')} icon="arrow-left" variant="glass" onPress={() => router.back()} />}
        title={t('detail.title')}
        subtitle={activeProject?.name ?? t('screen.chooseProject')}
      />
      <ProjectContextCard compact showSwitchAction />
      {detail ? (
        <Card style={styles.summaryCard}>
          <View style={styles.summaryTopRow}>
            <View style={styles.sectionHeading}>
              <AppText style={styles.period} weight={700}>
                {formatDate(dateValue(detail.periodStart), language)} – {formatDate(dateValue(detail.periodEnd), language)}
              </AppText>
              <AppText style={styles.muted} weight={500}>{t('detail.workerCount', { count: detail.items.length })}</AppText>
            </View>
            <StatusBadge label={t(`batchStatus.${detail.status}`)} tone={getStatusTone(detail.status)} />
          </View>
          <View style={styles.totalsRow}>
            <Total label={t('detail.net')} value={formatInr(Number(detail.totals.netAmount), language)} />
            <Total label={t('detail.paid')} value={formatInr(Number(detail.totals.paidAmount), language)} />
            <Total emphasis label={t('detail.due')} value={formatInr(totalDue, language)} />
          </View>
          {canExport ? (
            <Button label={t('export.action')} leadingIcon="download-outline" variant="secondary" disabled={isBusy} onPress={() => void exportBatch()} />
          ) : null}
        </Card>
      ) : null}
      {detail ? (
        <View style={styles.sectionHeading}>
          <AppText style={styles.sectionTitle} weight={700}>{t('detail.workersTitle')}</AppText>
          <AppText style={styles.muted} weight={500}>{t('detail.workersDescription')}</AppText>
        </View>
      ) : null}
      {error ? <EmptyState title={t('errors.batchTitle')} description={error} actionLabel={tCommon('actions.retry')} onAction={() => void loadDetail()} /> : null}
    </View>
  );

  return (
    <>
      <NirmanScreenBackground footer={<CustomerTabBar activeKey="wages" />} scroll={false}>
        <FlatList
          data={error ? [] : detail?.items ?? []}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={header}
          ListEmptyComponent={isLoading ? (
            <View style={styles.loading} accessibilityLiveRegion="polite">
              <ActivityIndicator color={mobileTheme.color.action.primary} />
              <AppText style={styles.muted}>{t('detail.loading')}</AppText>
            </View>
          ) : !error && detail ? (
            <EmptyState title={t('detail.emptyTitle')} description={t('detail.emptyDescription')} />
          ) : null}
          renderItem={({ item }) => {
            const settledByKharchi = isSettledByKharchi(item);
            const statusLabel = settledByKharchi
              ? t('paymentStatus.KHARCHI_SETTLED')
              : t(`paymentStatus.${item.paymentStatus}`);
            const statusTone = settledByKharchi
              ? 'info'
              : item.paymentStatus === 'PAID'
                ? 'success'
                : item.paymentStatus === 'PARTIALLY_PAID'
                  ? 'warning'
                  : 'danger';

            return (
              <OperationalEntityCard
                accessibilityLabel={t('worker.openA11y', { worker: item.workerName, due: formatInr(remainingValue(item), language) })}
                compact
                contextLeading={item.workerCode}
                contextTrailing={item.trade}
                title={item.workerName}
                supporting={t('worker.attendance', { present: item.presentDays, half: item.halfDays, absent: item.absentDays })}
                value={formatInr(remainingValue(item), language)}
                valueLabel={t('worker.due')}
                footerLeading={<Badge label={statusLabel} tone={statusTone} />}
                footerTrailing={(canPay || canUpdate) ? <AppText style={styles.manage} weight={700}>{t('worker.manage')}</AppText> : undefined}
                tone={settledByKharchi ? 'info' : item.paymentStatus === 'PAID' ? 'success' : item.paymentStatus === 'PARTIALLY_PAID' ? 'info' : 'warning'}
                onPress={(canPay || canUpdate) ? () => openWorker(item) : undefined}
              />
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={false}
          onRefresh={() => void loadDetail()}
        />
      </NirmanScreenBackground>

      {selectedItem ? (
        <BottomSheet
          visible
          scroll
          title={selectedItem.workerName}
          description={`${selectedItem.workerCode} · ${selectedItem.trade}`}
          onClose={closeWorker}
        >
          <OperationalEntityCard
            compact
            contextLeading={t('worker.currentSummary')}
            title={t('worker.netPayable')}
            supporting={t('worker.paidAmount', { amount: formatInr(Number(selectedItem.paidAmount), language) })}
            value={formatInr(selectedRemaining, language)}
            valueLabel={t('worker.due')}
            footerLeading={
              <Badge
                label={selectedSettledByKharchi ? t('paymentStatus.KHARCHI_SETTLED') : t(`paymentStatus.${selectedItem.paymentStatus}`)}
                tone={selectedSettledByKharchi ? 'info' : selectedItem.paymentStatus === 'PAID' ? 'success' : selectedItem.paymentStatus === 'PARTIALLY_PAID' ? 'warning' : 'danger'}
              />
            }
            tone="neutral"
          />

          {canPay ? (
            <View style={styles.sheetSection}>
              <View style={styles.sectionHeading}>
                <AppText style={styles.sectionTitle} weight={700}>{t('payment.title')}</AppText>
                <AppText style={styles.muted} weight={500}>{t('payment.description')}</AppText>
              </View>
              {selectedRemaining > 0 ? (
                <>
                  <View style={styles.formRow}>
                    <FormField label={t('payment.amount')} required error={paymentError || undefined} style={styles.formField}>
                      <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" inputMode="decimal" />
                    </FormField>
                    <FormField label={t('payment.date')} required style={styles.formField}>
                      <DateInput allowClear={false} accessibilityLabel={t('payment.selectDate')} value={paymentDate} onChangeText={(value) => value && setPaymentDate(value)} />
                    </FormField>
                  </View>
                  <FormField label={t('payment.method')} required>
                    <View style={styles.methodRow}>
                      {WAGE_PAYMENT_METHODS.map((method) => (
                        <Pressable
                          key={method}
                          accessibilityRole="button"
                          accessibilityState={{ selected: paymentMethod === method }}
                          style={({ pressed }) => [styles.methodButton, paymentMethod === method && styles.methodSelected, pressed && styles.pressed]}
                          onPress={() => setPaymentMethod(method)}
                        >
                          <AppText style={styles.methodText} weight={700}>{t(`paymentMethod.${method}`)}</AppText>
                        </Pressable>
                      ))}
                    </View>
                  </FormField>
                  <FormField label={t('payment.reference')} optional>
                    <Input value={reference} onChangeText={setReference} placeholder={t('payment.referencePlaceholder')} />
                  </FormField>
                  <Button
                    label={isBusy ? t('payment.recording') : t('payment.action')}
                    leadingIcon="credit-card-outline"
                    disabled={!amount || Boolean(paymentError) || isBusy}
                    onPress={() => void pay()}
                  />
                </>
              ) : selectedSettledByKharchi ? (
                <AppText style={styles.infoMessage} weight={600}>
                  {t('payment.settledByKharchi', { amount: formatInr(Number(selectedItem.kharchiDeduction), language) })}
                </AppText>
              ) : selectedItem.paymentStatus === 'PAID' ? (
                <AppText style={styles.successMessage} weight={600}>{t('payment.alreadyPaid')}</AppText>
              ) : (
                <AppText style={styles.infoMessage} weight={600}>{t('payment.noPaymentDue')}</AppText>
              )}
            </View>
          ) : null}

          {canUpdate ? (
            <View style={styles.sheetSection}>
              <View style={styles.sectionHeading}>
                <AppText style={styles.sectionTitle} weight={700}>{t('adjustment.title')}</AppText>
                <AppText style={styles.muted} weight={500}>{t('adjustment.description')}</AppText>
              </View>
              <View style={styles.modeRow}>
                {(['ADD', 'DEDUCT'] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    accessibilityRole="button"
                    accessibilityState={{ selected: adjustmentMode === mode }}
                    style={({ pressed }) => [styles.modeButton, adjustmentMode === mode && styles.modeSelected, pressed && styles.pressed]}
                    onPress={() => setAdjustmentMode(mode)}
                  >
                    <AppText style={styles.modeText} weight={700}>{t(`adjustment.mode.${mode}`)}</AppText>
                  </Pressable>
                ))}
              </View>
              <FormField
                label={t('adjustment.amount')}
                required
                error={adjustmentError || undefined}
                helperText={t(adjustmentMode === 'ADD' ? 'adjustment.addHelper' : 'adjustment.deductHelper')}
              >
                <Input value={adjustmentAmount} onChangeText={setAdjustmentAmount} keyboardType="decimal-pad" inputMode="decimal" />
              </FormField>
              <FormField label={t('adjustment.notes')} optional>
                <Input value={itemNotes} onChangeText={setItemNotes} placeholder={t('adjustment.notesPlaceholder')} />
              </FormField>
              <FormError message={adjustmentMode === 'DEDUCT' && adjustmentValue > Number(selectedItem.netAmount) ? t('adjustment.largeDeduction') : undefined} />
              <Button
                label={isBusy ? t('adjustment.saving') : t('adjustment.action')}
                leadingIcon="content-save-outline"
                variant="brand"
                disabled={!adjustmentAmount || Boolean(adjustmentError) || isBusy}
                onPress={() => void saveAdjustment()}
              />
            </View>
          ) : null}
        </BottomSheet>
      ) : null}
    </>
  );
}

function Total({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.totalLine}>
      <AppText style={styles.totalLabel} weight={600}>{label}</AppText>
      <AppText style={[styles.totalValue, emphasis && styles.totalEmphasis]} weight={700}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  listContent: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[4] },
  headerContent: { gap: mobileTheme.spacing[4], marginBottom: mobileTheme.spacing[1] },
  loading: { alignItems: 'center', gap: mobileTheme.spacing[3], paddingVertical: mobileTheme.spacing[8] },
  summaryCard: { gap: mobileTheme.spacing[4] },
  summaryTopRow: { alignItems: 'flex-start', flexDirection: 'row', gap: mobileTheme.spacing[3], justifyContent: 'space-between' },
  sectionHeading: { flex: 1, gap: mobileTheme.spacing[1] },
  sectionTitle: { ...mobileText.sectionTitle },
  period: { ...mobileText.sectionTitle },
  muted: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  totalsRow: { borderTopColor: mobileTheme.color.border.subtle, borderTopWidth: 1, gap: mobileTheme.spacing[2], paddingTop: mobileTheme.spacing[3] },
  totalLine: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3], justifyContent: 'space-between', minHeight: 28 },
  totalValue: { ...mobileText.body, color: mobileTheme.color.text.primary, flexShrink: 0, fontVariant: ['tabular-nums'], textAlign: 'right' },
  totalEmphasis: { color: mobileTheme.color.action.primary },
  totalLabel: { ...mobileText.body, color: mobileTheme.color.text.secondary, flex: 1 },
  manage: { ...mobileText.caption, color: mobileTheme.color.action.primary },
  sheetSection: { borderTopColor: mobileTheme.color.border.subtle, borderTopWidth: 1, gap: mobileTheme.spacing[3], paddingTop: mobileTheme.spacing[4] },
  formRow: { flexDirection: 'row', gap: mobileTheme.spacing[3] },
  formField: { flex: 1 },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  methodButton: { alignItems: 'center', backgroundColor: mobileTheme.color.surface.raised, borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.full, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: mobileTheme.spacing[4] },
  methodSelected: { backgroundColor: mobileTheme.color.status.info.background, borderColor: mobileTheme.color.action.primary, borderWidth: 2 },
  methodText: { ...mobileText.caption, color: mobileTheme.color.text.primary },
  modeRow: { flexDirection: 'row', gap: mobileTheme.spacing[3] },
  modeButton: { alignItems: 'center', backgroundColor: mobileTheme.color.surface.raised, borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.md, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: mobileTheme.spacing[3] },
  modeSelected: { backgroundColor: mobileTheme.color.status.info.background, borderColor: mobileTheme.color.action.primary, borderWidth: 2 },
  modeText: { ...mobileText.body, color: mobileTheme.color.text.primary },
  successMessage: { ...mobileText.body, backgroundColor: mobileTheme.color.status.success.background, borderColor: mobileTheme.color.status.success.border, borderRadius: mobileTheme.radius.md, borderWidth: 1, color: mobileTheme.color.status.success.foreground, padding: mobileTheme.spacing[3] },
  infoMessage: { ...mobileText.body, backgroundColor: mobileTheme.color.status.info.background, borderColor: mobileTheme.color.status.info.border, borderRadius: mobileTheme.radius.md, borderWidth: 1, color: mobileTheme.color.status.info.foreground, padding: mobileTheme.spacing[3] },
  pressed: { opacity: 0.78 },
});
