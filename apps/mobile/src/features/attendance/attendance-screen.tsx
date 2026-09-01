import type { AttendanceSummaryResponse, AttendanceSummaryRow } from '@nirman-app/shared';
import { router, useFocusEffect, type Href } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppIcon,
  AppText,
  Button,
  Card,
  CompactScreenHeader,
  DateInput,
  EmptyState,
  FormField,
  IconButton,
  NirmanScreenBackground,
  OperationalEntityCard,
  SearchField,
  Toggle,
} from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { ApiRequestError } from '../../lib/api';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import { ProjectContextCard } from '../projects';
import { AttendanceTotalsTable, formatAttendanceNumber } from './attendance-ui';
import { monthRange, monthValue } from './date-utils';
import { fetchAttendanceSummary } from './services';

const PAGE_SIZE = 20;

const WorkerSummaryCard = memo(function WorkerSummaryCard({ locale, row, onView }: {
  locale: string;
  row: AttendanceSummaryRow;
  onView: (row: AttendanceSummaryRow) => void;
}) {
  const { t } = useTranslation('attendance');

  return (
    <OperationalEntityCard
      accessibilityHint={t('workerCard.viewHint')}
      accessibilityLabel={t('workerCard.summaryA11y', {
        name: row.worker.name,
        code: row.worker.workerCode,
        trade: row.worker.trade,
        expected: formatAttendanceNumber(locale, row.expectedWorkingDays),
        present: formatAttendanceNumber(locale, row.presentDays),
        absent: formatAttendanceNumber(locale, row.absentDays),
      })}
      compact
      contextLeading={row.worker.workerCode}
      contextTrailing={row.worker.trade}
      details={<AttendanceTotalsTable embedded locale={locale} totals={row} />}
      footerLeading={t('actions.viewAttendance')}
      footerTone="info"
      footerTrailing={<AppIcon name="chevron-right" size={20} color={mobileTheme.color.status.info.foreground} />}
      onPress={() => onView(row)}
      title={row.worker.name}
    />
  );
});

export function AttendanceScreen() {
  const { t } = useTranslation('attendance');
  const { t: tCommon } = useTranslation('common');
  const { locale } = useLocalization();
  const { refreshSession, session, signOut } = useSession();
  const activeProject = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = activeProject?.id ?? null;
  const canRead = permissions.includes('attendance:read');
  const canMark = permissions.includes('attendance:mark') || permissions.includes('attendance:update');
  const canViewCalendar = permissions.includes('work-calendar:read');
  const initialRange = useMemo(() => monthRange(monthValue()), []);
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exceptionsOnly, setExceptionsOnly] = useState(false);
  const [summary, setSummary] = useState<AttendanceSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const contextKey = `${organizationId ?? ''}:${projectId ?? ''}`;
  const invalidRange = startDate > endDate;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (page = 1, background = false) => {
    if (!session?.accessToken || !organizationId || !projectId || !canRead || invalidRange) return;
    const activeRequest = ++requestId.current;
    if (page > 1) setIsLoadingMore(true);
    else if (background) setIsRefreshing(true);
    else setIsLoading(true);
    if (page === 1) setError('');
    try {
      const response = await fetchAttendanceSummary(organizationId, projectId, {
        startDate,
        endDate,
        search: debouncedSearch || undefined,
        exceptionsOnly: exceptionsOnly || undefined,
        page,
        pageSize: PAGE_SIZE,
      }, session.accessToken);
      if (activeRequest !== requestId.current) return;
      setSummary((current) => page === 1 ? response : {
        ...response,
        rows: [...(current?.rows ?? []), ...response.rows],
      });
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
        setError(getLocalizedErrorMessage(loadError, t('errors.load')));
      }
    } finally {
      if (activeRequest === requestId.current) {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    }
  }, [canRead, debouncedSearch, endDate, exceptionsOnly, invalidRange, organizationId, projectId, refreshSession, session?.accessToken, signOut, startDate, t]);

  useFocusEffect(useCallback(() => {
    void load(1, Boolean(summary));
  }, [contextKey, startDate, endDate, debouncedSearch, exceptionsOnly, load]));

  function openWorkerHistory(row: AttendanceSummaryRow) {
    if (!projectId) return;
    router.push({
      pathname: '/(app)/worker-attendance',
      params: {
        workerId: row.worker.id,
        projectId,
        startDate,
        endDate,
        workerName: row.worker.name,
        workerCode: row.worker.workerCode,
        workerTrade: row.worker.trade,
      },
    } as unknown as Href);
  }

  const header = (
    <View style={styles.headerContent}>
      <CompactScreenHeader
        title={t('summaryScreen.title')}
        subtitle={activeProject?.name ?? t('project.none')}
        action={canViewCalendar ? (
          <IconButton
            accessibilityLabel={t('actions.openCalendar')}
            icon="calendar-month-outline"
            variant="glass"
            onPress={() => router.push('/(app)/work-calendar' as Href)}
          />
        ) : undefined}
      />
      <ProjectContextCard compact showSwitchAction />
      {canRead && canMark ? (
        <Card variant="blueprint" style={styles.taskCard}>
          <View style={styles.taskCopy}>
            <AppText style={styles.taskTitle} weight={700}>{t('summaryScreen.markTitle')}</AppText>
            <AppText style={styles.taskDescription} weight={500}>{t('summaryScreen.markDescription')}</AppText>
          </View>
          <Button
            accessibilityHint={t('summaryScreen.markHint')}
            label={t('actions.markAttendance')}
            leadingIcon="clipboard-edit-outline"
            onPress={() => router.push('/(app)/attendance-mark' as Href)}
          />
        </Card>
      ) : null}
      <Card style={styles.periodCard}>
        <View style={styles.sectionHeading}>
          <AppText style={styles.sectionTitle} weight={700}>{t('period.title')}</AppText>
          <AppText style={styles.sectionDescription} weight={500}>{t('period.description')}</AppText>
        </View>
        <View style={styles.dateRow}>
          <FormField label={t('period.startDate')} required style={styles.dateField}>
            <DateInput
              allowClear={false}
              accessibilityLabel={t('period.selectStartDate')}
              maximumDate={new Date(`${endDate}T12:00:00`)}
              value={startDate}
              onChangeText={(value) => value && setStartDate(value)}
            />
          </FormField>
          <FormField label={t('period.endDate')} required error={invalidRange ? t('period.invalidRange') : undefined} style={styles.dateField}>
            <DateInput
              allowClear={false}
              accessibilityLabel={t('period.selectEndDate')}
              minimumDate={new Date(`${startDate}T12:00:00`)}
              value={endDate}
              onChangeText={(value) => value && setEndDate(value)}
            />
          </FormField>
        </View>
      </Card>
      <View style={styles.filters}>
        <SearchField accessibilityLabel={t('filters.searchA11y')} placeholder={t('filters.searchPlaceholder')} value={search} onChangeText={setSearch} />
        <Toggle accessibilityRole="checkbox" accessibilityState={{ checked: exceptionsOnly }} label={t('filters.exceptionsOnly')} value={exceptionsOnly} onValueChange={setExceptionsOnly} />
      </View>
      {isRefreshing ? (
        <View accessibilityLiveRegion="polite" style={styles.refreshing}>
          <ActivityIndicator color={mobileTheme.color.action.primary} />
          <AppText style={styles.cardNote}>{t('loading.refreshing')}</AppText>
        </View>
      ) : null}
      {error ? <EmptyState title={t('errors.loadTitle')} description={error} actionLabel={tCommon('actions.retry')} onAction={() => void load(1)} /> : null}
      {!canMark && canRead ? <Card><AppText style={styles.cardNote} weight={500}>{t('readOnly')}</AppText></Card> : null}
    </View>
  );

  const noContext = !session?.activeOrganization
    ? <EmptyState title={t('empty.noOrganizationTitle')} description={t('empty.noOrganizationDescription')} />
    : session.projectAccess.projects.length === 0
      ? <EmptyState title={t('empty.noAccessibleProjectsTitle')} description={t('empty.noAccessibleProjectsDescription')} />
      : !activeProject
        ? <EmptyState title={t('empty.noProjectTitle')} description={t('empty.noProjectDescription')} />
        : !canRead
          ? <EmptyState title={t('empty.permissionTitle')} description={t('empty.permissionDescription')} actionLabel={tCommon('actions.retry')} onAction={() => void refreshSession()} />
          : null;
  const rows = noContext || error || invalidRange ? [] : summary?.rows ?? [];

  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="attendance" />} scroll={false}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.workerAssignmentId}
        renderItem={({ item }) => <WorkerSummaryCard locale={locale} row={item} onView={openWorkerHistory} />}
        ListHeaderComponent={header}
        ListEmptyComponent={noContext ?? (isLoading ? (
          <View style={styles.loading}><ActivityIndicator color={mobileTheme.color.action.primary} /><AppText>{t('loading.attendance')}</AppText></View>
        ) : !error && !invalidRange ? (
          <EmptyState
            title={debouncedSearch || exceptionsOnly ? t('empty.noMatchesTitle') : t('empty.noWorkersTitle')}
            description={debouncedSearch || exceptionsOnly ? t('empty.noMatchesDescription') : t('empty.noWorkersDescription')}
          />
        ) : null)}
        ListFooterComponent={summary && summary.meta.page < summary.meta.totalPages ? (
          <Button disabled={isLoadingMore} label={isLoadingMore ? t('loading.more') : t('actions.loadMore')} variant="secondary" onPress={() => void load(summary.meta.page + 1)} />
        ) : null}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        refreshing={false}
        showsVerticalScrollIndicator={false}
        onRefresh={() => void load(1, true)}
      />
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  listContent: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[4] },
  headerContent: { gap: mobileTheme.spacing[4], marginBottom: mobileTheme.spacing[1] },
  taskCard: { gap: mobileTheme.spacing[4] },
  taskCopy: { gap: mobileTheme.spacing[1] },
  taskTitle: { ...mobileText.sectionTitle },
  taskDescription: { ...mobileText.body },
  periodCard: { gap: mobileTheme.spacing[4] },
  sectionHeading: { gap: mobileTheme.spacing[1] },
  sectionTitle: { ...mobileText.sectionTitle },
  sectionDescription: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[3] },
  dateField: { flexBasis: 150, flexGrow: 1 },
  filters: { gap: mobileTheme.spacing[2] },
  refreshing: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2] },
  cardNote: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  loading: { alignItems: 'center', gap: mobileTheme.spacing[3], justifyContent: 'center', minHeight: 180 },
});
