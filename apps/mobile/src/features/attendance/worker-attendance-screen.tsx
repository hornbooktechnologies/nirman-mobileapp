import type { AttendanceException, WorkerAttendancePeriodResponse } from '@nirman-app/shared';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Badge,
  Card,
  CompactScreenHeader,
  DateInput,
  EmptyState,
  FormField,
  IconButton,
  NirmanScreenBackground,
  OperationalEntityCard,
} from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { ApiRequestError } from '../../lib/api';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import { ProjectContextCard } from '../projects';
import { AttendanceTotalsTable } from './attendance-ui';
import { monthRange, monthValue } from './date-utils';
import { fetchWorkerAttendancePeriod } from './services';

const ExceptionCard = memo(function ExceptionCard({ exception, locale }: { exception: AttendanceException; locale: string }) {
  const { t } = useTranslation('attendance');
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(new Date(`${exception.workDate}T12:00:00`));

  return (
    <Card
      accessible
      accessibilityLabel={t('history.exceptionA11y', {
        date,
        duration: t(`durations.${exception.duration}`),
        reason: exception.reasonCode || t('history.noReason'),
      })}
      style={styles.exceptionCard}
    >
      <View style={styles.exceptionTopRow}>
        <View style={styles.exceptionDateCopy}>
          <AppText style={styles.exceptionDate} weight={700}>{date}</AppText>
          <AppText style={styles.exceptionType} weight={500}>{t('history.absenceException')}</AppText>
        </View>
        <Badge label={t(`durations.${exception.duration}`)} tone={exception.duration === 'FULL_DAY' ? 'danger' : 'warning'} />
      </View>
      <View style={styles.detailGrid}>
        <View style={styles.detailBlock}>
          <AppText style={styles.detailLabel} weight={600}>{t('form.reason')}</AppText>
          <AppText style={styles.detailValue} weight={500}>{exception.reasonCode || t('history.noReason')}</AppText>
        </View>
        <View style={styles.detailBlock}>
          <AppText style={styles.detailLabel} weight={600}>{t('form.notes')}</AppText>
          <AppText style={styles.detailValue} weight={500}>{exception.notes || t('history.noNotes')}</AppText>
        </View>
      </View>
    </Card>
  );
});

export function WorkerAttendanceScreen() {
  const { t } = useTranslation('attendance');
  const { t: tCommon } = useTranslation('common');
  const { locale } = useLocalization();
  const params = useLocalSearchParams<{
    workerId?: string;
    projectId?: string;
    startDate?: string;
    endDate?: string;
    workerName?: string;
    workerCode?: string;
    workerTrade?: string;
  }>();
  const { refreshSession, session, signOut, switchActiveProject } = useSession();
  const activeProject = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = activeProject?.id ?? null;
  const workerId = params.workerId ?? '';
  const canRead = permissions.includes('attendance:read');
  const defaultRange = useMemo(() => monthRange(monthValue()), []);
  const [startDate, setStartDate] = useState(params.startDate ?? defaultRange.startDate);
  const [endDate, setEndDate] = useState(params.endDate ?? defaultRange.endDate);
  const [period, setPeriod] = useState<WorkerAttendancePeriodResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [deepLinkReady, setDeepLinkReady] = useState(false);
  const requestId = useRef(0);
  const deepLinkHandled = useRef(false);
  const invalidRange = startDate > endDate;
  const requiredParamsMissing = !params.workerId || !params.projectId;
  const requestedProjectAccessible = Boolean(
    params.projectId && session?.projectAccess.projects.some((project) => project.id === params.projectId),
  );
  const contextKey = `${organizationId ?? ''}:${projectId ?? ''}:${workerId}`;

  useEffect(() => {
    if (deepLinkHandled.current || !session) return;
    deepLinkHandled.current = true;
    if (!params.projectId) {
      setDeepLinkReady(true);
      return;
    }
    const target = session.projectAccess.projects.find((project) => project.id === params.projectId);
    if (!target || target.id === session.activeProjectId) {
      setDeepLinkReady(true);
      return;
    }
    void switchActiveProject(target.id).catch(() => undefined).finally(() => setDeepLinkReady(true));
  }, [params.projectId, session, switchActiveProject]);

  const load = useCallback(async (background = false) => {
    if (!deepLinkReady || !session?.accessToken || !organizationId || !projectId || !workerId || !canRead || invalidRange) return;
    const activeRequest = ++requestId.current;
    if (background && period) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');
    try {
      const response = await fetchWorkerAttendancePeriod(organizationId, projectId, workerId, { startDate, endDate }, session.accessToken);
      if (activeRequest === requestId.current) setPeriod(response);
    } catch (loadError) {
      if (activeRequest !== requestId.current) return;
      if (loadError instanceof ApiRequestError && loadError.status === 401) {
        await signOut();
        return;
      }
      if (loadError instanceof ApiRequestError && loadError.status === 403) {
        setError(t('errors.accessChanged'));
        await refreshSession().catch(() => undefined);
      } else {
        setError(getLocalizedErrorMessage(loadError, t('errors.loadHistory')));
      }
    } finally {
      if (activeRequest === requestId.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [canRead, deepLinkReady, endDate, invalidRange, organizationId, period, projectId, refreshSession, session?.accessToken, signOut, startDate, t, workerId]);

  useEffect(() => {
    setPeriod(null);
    void load();
  }, [contextKey, deepLinkReady, startDate, endDate]);

  const workerName = params.workerName ?? t('history.workerFallback');
  const header = (
    <View style={styles.headerContent}>
      <CompactScreenHeader
        leading={<IconButton accessibilityLabel={tCommon('actions.back')} icon="arrow-left" variant="glass" onPress={() => router.back()} />}
        title={t('history.title')}
        subtitle={activeProject?.name ?? t('project.none')}
      />
      <ProjectContextCard compact showSwitchAction />
      <OperationalEntityCard
        accessibilityLabel={[workerName, params.workerCode, params.workerTrade].filter(Boolean).join(', ')}
        compact
        contextLeading={params.workerCode ?? t('history.workerFallback')}
        contextTrailing={params.workerTrade}
        title={workerName}
        tone="info"
      />
      <Card style={styles.periodCard}>
        <View style={styles.sectionHeading}>
          <AppText style={styles.sectionTitle} weight={700}>{t('period.title')}</AppText>
          <AppText style={styles.sectionDescription} weight={500}>{t('history.periodDescription')}</AppText>
        </View>
        <View style={styles.dateRow}>
          <FormField label={t('period.startDate')} required style={styles.dateField}>
            <DateInput allowClear={false} accessibilityLabel={t('period.selectStartDate')} maximumDate={new Date(`${endDate}T12:00:00`)} value={startDate} onChangeText={(value) => value && setStartDate(value)} />
          </FormField>
          <FormField label={t('period.endDate')} required error={invalidRange ? t('period.invalidRange') : undefined} style={styles.dateField}>
            <DateInput allowClear={false} accessibilityLabel={t('period.selectEndDate')} minimumDate={new Date(`${startDate}T12:00:00`)} value={endDate} onChangeText={(value) => value && setEndDate(value)} />
          </FormField>
        </View>
      </Card>
      {canRead && period ? <AttendanceTotalsTable locale={locale} totals={period.totals} /> : null}
      {isRefreshing ? (
        <View accessibilityLiveRegion="polite" style={styles.refreshing}>
          <ActivityIndicator color={mobileTheme.color.action.primary} />
          <AppText style={styles.subtleText}>{t('loading.refreshing')}</AppText>
        </View>
      ) : null}
      {error ? <EmptyState title={t('errors.historyTitle')} description={error} actionLabel={tCommon('actions.retry')} onAction={() => void load()} /> : null}
    </View>
  );

  const blockingState = requiredParamsMissing
    ? <EmptyState title={t('history.invalidLinkTitle')} description={t('history.invalidLinkDescription')} actionLabel={t('actions.backToSummary')} onAction={() => router.replace('/(app)/attendance' as Href)} />
    : !requestedProjectAccessible
      ? <EmptyState title={t('empty.permissionTitle')} description={t('empty.permissionDescription')} actionLabel={t('actions.backToSummary')} onAction={() => router.replace('/(app)/attendance' as Href)} />
    : !canRead
      ? <EmptyState title={t('empty.permissionTitle')} description={t('empty.permissionDescription')} actionLabel={tCommon('actions.retry')} onAction={() => void refreshSession()} />
      : null;
  const exceptions = blockingState || error || invalidRange ? [] : period?.exceptions ?? [];

  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="attendance" />} scroll={false}>
      <FlatList
        data={exceptions}
        keyExtractor={(exception) => exception.id}
        renderItem={({ item }) => <ExceptionCard exception={item} locale={locale} />}
        ListHeaderComponent={header}
        ListEmptyComponent={blockingState ?? (isLoading ? (
          <View style={styles.loading}><ActivityIndicator color={mobileTheme.color.action.primary} /><AppText>{t('loading.history')}</AppText></View>
        ) : !error && !invalidRange ? (
          <EmptyState title={t('history.emptyTitle')} description={t('history.emptyDescription')} />
        ) : null)}
        contentContainerStyle={styles.listContent}
        refreshing={false}
        showsVerticalScrollIndicator={false}
        onRefresh={() => void load(true)}
      />
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  listContent: { gap: mobileTheme.spacing[4], paddingBottom: mobileTheme.spacing[4] },
  headerContent: { gap: mobileTheme.spacing[4], marginBottom: mobileTheme.spacing[1] },
  subtleText: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  periodCard: { gap: mobileTheme.spacing[4] },
  sectionHeading: { gap: mobileTheme.spacing[1] },
  sectionTitle: { ...mobileText.sectionTitle },
  sectionDescription: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[3] },
  dateField: { flexBasis: 150, flexGrow: 1 },
  exceptionCard: { gap: mobileTheme.spacing[4] },
  exceptionTopRow: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[3], justifyContent: 'space-between' },
  exceptionDateCopy: { flex: 1, gap: mobileTheme.spacing[1], minWidth: 190 },
  exceptionDate: { ...mobileText.sectionTitle, fontSize: 17, lineHeight: 23 },
  exceptionType: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  detailGrid: { gap: mobileTheme.spacing[3] },
  detailBlock: { gap: mobileTheme.spacing[1] },
  detailLabel: { ...mobileText.caption, color: mobileTheme.color.text.muted },
  detailValue: { ...mobileText.body, color: mobileTheme.color.text.primary },
  refreshing: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2] },
  loading: { alignItems: 'center', gap: mobileTheme.spacing[3], justifyContent: 'center', minHeight: 180 },
});
