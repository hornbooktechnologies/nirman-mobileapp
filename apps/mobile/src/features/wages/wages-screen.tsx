import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Button,
  Card,
  CompactScreenHeader,
  DateInput,
  EmptyState,
  FormField,
  LoadingState,
  NirmanScreenBackground,
  OperationalEntityCard,
} from '../../components/ui';
import { formatDate, formatInr } from '../../i18n';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import { ProjectContextCard } from '../projects';
import type { WageBatch, WagePreview } from './types';
import { createWageBatch, fetchWageBatches, fetchWagePreview } from './services';

const today = () => {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

const monthStart = () => `${today().slice(0, 8)}01`;

const isDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`));

const dateValue = (value: string) => new Date(`${value}T12:00:00`);

export function WagesScreen() {
  const { t } = useTranslation('wages');
  const { language } = useLocalization();
  const { session } = useSession();
  const activeProject = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = activeProject?.id ?? null;
  const canGenerate = permissions.includes('wages:generate');
  const [periodStart, setPeriodStart] = useState(monthStart());
  const [periodEnd, setPeriodEnd] = useState(today());
  const [preview, setPreview] = useState<WagePreview | null>(null);
  const [batches, setBatches] = useState<WageBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const loadBatches = useCallback(async () => {
    if (!organizationId || !projectId || !session?.accessToken) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      setBatches(await fetchWageBatches(organizationId, projectId, session.accessToken));
    } catch (error) {
      Alert.alert(t('errors.unavailableTitle'), error instanceof Error ? error.message : t('errors.tryAgain'));
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, projectId, session?.accessToken, t]);

  useEffect(() => {
    setPreview(null);
    void loadBatches();
  }, [loadBatches]);

  const invalidRange = periodStart > periodEnd;
  const previewReady = useMemo(
    () => Boolean(preview?.items.length) && !preview?.items.some((item) => !item.isReady),
    [preview],
  );

  async function generatePreview() {
    if (!organizationId || !projectId || !session?.accessToken || !isDate(periodStart) || !isDate(periodEnd) || invalidRange) {
      Alert.alert(t('errors.periodTitle'), t('errors.periodMessage'));
      return;
    }
    setIsBusy(true);
    try {
      setPreview(await fetchWagePreview(organizationId, projectId, periodStart, periodEnd, session.accessToken));
    } catch (error) {
      Alert.alert(t('errors.previewTitle'), error instanceof Error ? error.message : t('errors.previewMessage'));
    } finally {
      setIsBusy(false);
    }
  }

  async function confirmBatch() {
    if (!organizationId || !projectId || !session?.accessToken || !previewReady) return;
    setIsBusy(true);
    try {
      const created = await createWageBatch(organizationId, projectId, periodStart, periodEnd, session.accessToken);
      setPreview(null);
      await loadBatches();
      router.push({ pathname: '/(app)/wage-batch', params: { batchId: created.id } } as Href);
    } catch (error) {
      Alert.alert(t('errors.confirmTitle'), error instanceof Error ? error.message : t('errors.confirmMessage'));
    } finally {
      setIsBusy(false);
    }
  }

  function openBatch(batchId: string) {
    router.push({ pathname: '/(app)/wage-batch', params: { batchId } } as Href);
  }

  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="wages" />}>
      <CompactScreenHeader title={t('screen.title')} subtitle={activeProject?.name ?? t('screen.chooseProject')} />
      <ProjectContextCard compact showSwitchAction />

      {!activeProject || !projectId ? (
        <EmptyState title={t('empty.noProjectTitle')} description={t('empty.noProjectDescription')} />
      ) : (
        <>
          <Card style={styles.section}>
            <View style={styles.sectionHeading}>
              <AppText style={styles.sectionTitle} weight={700}>{t('generator.title')}</AppText>
              <AppText style={styles.sectionDescription} weight={500}>{t('generator.description')}</AppText>
            </View>
            <View style={styles.dateRow}>
              <FormField label={t('generator.startDate')} required style={styles.dateField}>
                <DateInput
                  allowClear={false}
                  accessibilityLabel={t('generator.selectStartDate')}
                  maximumDate={dateValue(periodEnd)}
                  value={periodStart}
                  onChangeText={(value) => {
                    if (value) {
                      setPeriodStart(value);
                      setPreview(null);
                    }
                  }}
                />
              </FormField>
              <FormField label={t('generator.endDate')} required error={invalidRange ? t('errors.endBeforeStart') : undefined} style={styles.dateField}>
                <DateInput
                  allowClear={false}
                  accessibilityLabel={t('generator.selectEndDate')}
                  minimumDate={dateValue(periodStart)}
                  value={periodEnd}
                  onChangeText={(value) => {
                    if (value) {
                      setPeriodEnd(value);
                      setPreview(null);
                    }
                  }}
                />
              </FormField>
            </View>
            <Button
              label={isBusy ? t('generator.working') : t('generator.generate')}
              leadingIcon="calendar-range"
              disabled={isBusy || invalidRange}
              onPress={() => void generatePreview()}
            />
          </Card>

          {preview ? (
            <Card style={styles.section}>
              <View style={styles.summaryRow}>
                <View style={styles.sectionHeading}>
                  <AppText style={styles.sectionTitle} weight={700}>{t('preview.title')}</AppText>
                  <AppText style={styles.sectionDescription} weight={500}>
                    {t('preview.workerCount', { count: preview.items.length })}
                  </AppText>
                </View>
                <View style={styles.totalCopy}>
                  <AppText style={styles.total} weight={700}>{formatInr(Number(preview.totals.netAmount), language)}</AppText>
                  <AppText style={styles.totalLabel} weight={600}>{t('preview.netPayable')}</AppText>
                </View>
              </View>
              <View style={styles.previewList}>
                {preview.items.map((item) => (
                  <OperationalEntityCard
                    key={item.workerAssignmentId}
                    compact
                    contextLeading={item.workerCode}
                    contextTrailing={item.trade}
                    title={item.workerName}
                    supporting={t('preview.attendance', { present: item.presentDays, half: item.halfDays, absent: item.absentDays })}
                    value={formatInr(Number(item.netAmount), language)}
                    valueLabel={item.isReady ? t('preview.ready') : t('preview.needsAttention')}
                    tone={item.isReady ? 'success' : 'warning'}
                    footerLeading={!item.isReady ? item.readinessIssue ?? t('preview.notReady') : undefined}
                  />
                ))}
              </View>
              {canGenerate ? (
                <Button
                  label={t('preview.confirm')}
                  leadingIcon="check-circle-outline"
                  disabled={!previewReady || isBusy}
                  onPress={() => void confirmBatch()}
                />
              ) : null}
            </Card>
          ) : null}

          <View style={styles.listSection}>
            <View style={styles.sectionHeading}>
              <AppText style={styles.sectionTitle} weight={700}>{t('batches.title')}</AppText>
              <AppText style={styles.sectionDescription} weight={500}>{t('batches.description')}</AppText>
            </View>
            {isLoading ? <LoadingState label={t('batches.loading')} /> : null}
            {!isLoading && !batches.length ? (
              <EmptyState title={t('batches.emptyTitle')} description={t('batches.emptyDescription')} />
            ) : null}
            {batches.map((batch) => {
              const due = Math.max(0, Number(batch.totals.netAmount) - Number(batch.totals.paidAmount));
              return (
                <OperationalEntityCard
                  key={batch.id}
                  accessibilityLabel={t('batches.openA11y', {
                    start: batch.periodStart,
                    end: batch.periodEnd,
                    amount: formatInr(Number(batch.totals.netAmount), language),
                  })}
                  contextLeading={`${formatDate(dateValue(batch.periodStart), language)} – ${formatDate(dateValue(batch.periodEnd), language)}`}
                  contextTrailing={t(`batchStatus.${batch.status}`)}
                  title={t('batches.batchTitle')}
                  supporting={t('batches.paid', { amount: formatInr(Number(batch.totals.paidAmount), language) })}
                  value={formatInr(due, language)}
                  valueLabel={t('batches.due')}
                  footerLeading={t('batches.open')}
                  tone={batch.status === 'PAID' ? 'success' : batch.status === 'PARTIALLY_PAID' ? 'info' : 'warning'}
                  onPress={() => openBatch(batch.id)}
                />
              );
            })}
          </View>
        </>
      )}
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  section: { gap: mobileTheme.spacing[4] },
  sectionHeading: { flex: 1, gap: mobileTheme.spacing[1] },
  sectionTitle: { ...mobileText.sectionTitle },
  sectionDescription: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  dateRow: { flexDirection: 'row', gap: mobileTheme.spacing[3] },
  dateField: { flex: 1 },
  summaryRow: { alignItems: 'flex-start', flexDirection: 'row', gap: mobileTheme.spacing[3], justifyContent: 'space-between' },
  totalCopy: { alignItems: 'flex-end' },
  total: { ...mobileText.sectionTitle, color: mobileTheme.color.action.primary, fontVariant: ['tabular-nums'] },
  totalLabel: { ...mobileText.caption, color: mobileTheme.color.text.muted },
  previewList: { gap: mobileTheme.spacing[3] },
  listSection: { gap: mobileTheme.spacing[3] },
});
