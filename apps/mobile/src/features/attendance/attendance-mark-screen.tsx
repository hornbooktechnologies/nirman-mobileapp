import type { AttendanceSummaryResponse, AttendanceSummaryRow, DerivedAttendanceState } from '@nirman-app/shared';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Alert, FlatList, findNodeHandle, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Badge,
  Button,
  Card,
  CompactScreenHeader,
  DateInput,
  EmptyState,
  FormField,
  IconButton,
  ListControls,
  NirmanScreenBackground,
  SearchField,
} from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { ApiRequestError } from '../../lib/api';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import { ProjectContextCard } from '../projects';
import { AttendanceExceptionSheet, emptyAttendanceExceptionDraft, type AttendanceExceptionDraft } from './attendance-exception-sheet';
import { AttendanceTotals } from './attendance-ui';
import { todayDateOnly } from './date-utils';
import { createAttendanceException, fetchAttendanceSummary, removeAttendanceException, updateAttendanceException } from './services';

const PAGE_SIZE = 30;

const stateTones: Record<DerivedAttendanceState, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PRESENT: 'success',
  HALF_DAY: 'warning',
  ABSENT: 'danger',
  NON_WORKING: 'neutral',
};

const DailyWorkerCard = memo(function DailyWorkerCard({ canCreate, canUpdate, row, onEdit, onRestore }: {
  canCreate: boolean;
  canUpdate: boolean;
  row: AttendanceSummaryRow;
  onEdit: (row: AttendanceSummaryRow) => void;
  onRestore: (row: AttendanceSummaryRow) => void;
}) {
  const { t } = useTranslation('attendance');
  const state = row.selectedDate?.state ?? 'NON_WORKING';
  const hasException = Boolean(row.selectedDate?.exception);

  return (
    <Card style={styles.workerCard}>
      <View style={styles.workerTopRow}>
        <View
          accessible
          accessibilityLabel={t('workerCard.a11y', {
            name: row.worker.name,
            code: row.worker.workerCode,
            trade: row.worker.trade,
            state: t(`states.${state}`),
          })}
          style={styles.workerIdentity}
        >
          <AppText style={styles.workerName} weight={700}>{row.worker.name}</AppText>
          <AppText style={styles.workerMeta} weight={500}>{row.worker.workerCode} · {row.worker.trade}</AppText>
        </View>
        <Badge accessibilityLabel={t('workerCard.stateA11y', { state: t(`states.${state}`) })} label={t(`states.${state}`)} tone={stateTones[state]} />
      </View>
      {state === 'PRESENT' && canCreate ? (
        <Button accessibilityHint={t('workerCard.markHint')} label={t('actions.markAbsent')} onPress={() => onEdit(row)} />
      ) : hasException && canUpdate ? (
        <View style={styles.rowActions}>
          <Button fullWidth={false} label={t('actions.editAttendance')} style={styles.rowAction} variant="secondary" onPress={() => onEdit(row)} />
          <Button fullWidth={false} label={t('actions.restorePresent')} style={styles.rowAction} variant="danger" onPress={() => onRestore(row)} />
        </View>
      ) : state === 'NON_WORKING' ? (
        <AppText style={styles.cardNote} weight={500}>{t('workerCard.nonWorking')}</AppText>
      ) : (
        <AppText style={styles.cardNote} weight={500}>{t('workerCard.readOnly')}</AppText>
      )}
    </Card>
  );
});

export function AttendanceMarkScreen() {
  const { t } = useTranslation('attendance');
  const { t: tCommon } = useTranslation('common');
  const { locale } = useLocalization();
  const { refreshSession, session, signOut } = useSession();
  const activeProject = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = activeProject?.id ?? null;
  const canRead = permissions.includes('attendance:read');
  const canCreate = permissions.includes('attendance:mark');
  const canUpdate = permissions.includes('attendance:update');
  const [date, setDate] = useState(todayDateOnly());
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [summary, setSummary] = useState<AttendanceSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingRow, setEditingRow] = useState<AttendanceSummaryRow | null>(null);
  const [draft, setDraft] = useState<AttendanceExceptionDraft>(emptyAttendanceExceptionDraft);
  const [formError, setFormError] = useState('');
  const [isMutating, setIsMutating] = useState(false);
  const requestId = useRef(0);
  const headingRef = useRef<View>(null);
  const contextKey = `${organizationId ?? ''}:${projectId ?? ''}`;
  const sheetContextKey = useRef(contextKey);
  const originalDraft = editingRow ? {
    duration: editingRow.selectedDate?.exception?.duration ?? 'FULL_DAY',
    reasonCode: editingRow.selectedDate?.exception?.reasonCode ?? '',
    notes: editingRow.selectedDate?.exception?.notes ?? '',
  } : null;
  const dirty = Boolean(originalDraft) && (
    draft.duration !== originalDraft!.duration
    || draft.reasonCode !== originalDraft!.reasonCode
    || draft.notes !== originalDraft!.notes
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async (page = 1, background = false) => {
    if (!session?.accessToken || !organizationId || !projectId || !canRead) return;
    const activeRequest = ++requestId.current;
    if (page > 1) setIsLoadingMore(true);
    else if (background && summary) setIsRefreshing(true);
    else setIsLoading(true);
    if (page === 1) setError('');
    try {
      const response = await fetchAttendanceSummary(organizationId, projectId, {
        startDate: date,
        endDate: date,
        selectedDate: date,
        search: debouncedSearch || undefined,
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
        setError(getLocalizedErrorMessage(loadError, t('errors.loadDaily')));
      }
    } finally {
      if (activeRequest === requestId.current) {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    }
  }, [canRead, date, debouncedSearch, organizationId, projectId, refreshSession, session?.accessToken, signOut, summary, t]);

  useEffect(() => {
    setSummary(null);
    setSuccess('');
    void load(1);
  }, [contextKey, date, debouncedSearch]);

  useEffect(() => {
    if (!editingRow || sheetContextKey.current === contextKey) return;
    setFormError(t('errors.contextChanged'));
  }, [contextKey, editingRow, t]);

  useEffect(() => {
    if (!editingRow) return;
    const stillAllowed = canRead && (editingRow.selectedDate?.exception ? canUpdate : canCreate);
    if (!stillAllowed) {
      setFormError(t('errors.accessChangedRetained'));
      AccessibilityInfo.announceForAccessibility(t('errors.accessChangedRetained'));
    }
  }, [canCreate, canRead, canUpdate, editingRow, t]);

  function restoreHeadingFocus() {
    setTimeout(() => {
      const handle = findNodeHandle(headingRef.current);
      if (handle) AccessibilityInfo.setAccessibilityFocus(handle);
    }, 300);
  }

  function openSheet(row: AttendanceSummaryRow) {
    const exception = row.selectedDate?.exception;
    sheetContextKey.current = contextKey;
    setDraft({
      duration: exception?.duration ?? 'FULL_DAY',
      reasonCode: exception?.reasonCode ?? '',
      notes: exception?.notes ?? '',
    });
    setFormError('');
    setEditingRow(row);
  }

  function closeSheet(force = false) {
    if (isMutating) return;
    if (!force && dirty) {
      Alert.alert(t('sheet.discardTitle'), t('sheet.discardMessage'), [
        { text: tCommon('actions.cancel'), style: 'cancel' },
        { text: t('actions.discard'), style: 'destructive', onPress: () => closeSheet(true) },
      ]);
      return;
    }
    setEditingRow(null);
    setFormError('');
    restoreHeadingFocus();
  }

  async function saveException() {
    if (!editingRow || !organizationId || !projectId || !session?.accessToken || isMutating) return;
    const exception = editingRow.selectedDate?.exception;
    const stillAllowed = canRead && (exception ? canUpdate : canCreate);
    if (sheetContextKey.current !== contextKey) {
      setFormError(t('errors.contextChanged'));
      return;
    }
    if (!stillAllowed) {
      setFormError(t('errors.accessChangedRetained'));
      return;
    }
    setIsMutating(true);
    setFormError('');
    const input = {
      duration: draft.duration,
      reasonCode: draft.reasonCode.trim() || null,
      notes: draft.notes.trim() || null,
    };
    try {
      if (exception) {
        await updateAttendanceException(organizationId, projectId, exception.id, input, session.accessToken);
      } else {
        await createAttendanceException(organizationId, projectId, {
          workerAssignmentId: editingRow.workerAssignmentId,
          workDate: date,
          exceptionType: 'ABSENCE',
          ...input,
        }, session.accessToken);
      }
      const message = t(exception ? 'success.updated' : 'success.created');
      setSuccess(message);
      setEditingRow(null);
      restoreHeadingFocus();
      AccessibilityInfo.announceForAccessibility(message);
      await load(1, true);
    } catch (saveError) {
      if (saveError instanceof ApiRequestError && saveError.status === 401) await signOut();
      else {
        if (saveError instanceof ApiRequestError && saveError.status === 403) await refreshSession().catch(() => undefined);
        setFormError(getLocalizedErrorMessage(saveError, t('errors.notSaved')));
      }
    } finally {
      setIsMutating(false);
    }
  }

  function confirmRestore(row: AttendanceSummaryRow) {
    Alert.alert(t('remove.title'), t('remove.message'), [
      { text: t('remove.keep'), style: 'cancel' },
      { text: t('actions.restorePresent'), style: 'destructive', onPress: () => void restorePresent(row) },
    ]);
  }

  async function restorePresent(row: AttendanceSummaryRow) {
    const exception = row.selectedDate?.exception;
    if (!exception || !organizationId || !projectId || !session?.accessToken || isMutating || !canUpdate) return;
    setIsMutating(true);
    setError('');
    try {
      await removeAttendanceException(organizationId, projectId, exception.id, session.accessToken);
      const message = t('success.removed');
      setSuccess(message);
      AccessibilityInfo.announceForAccessibility(message);
      await load(1, true);
    } catch (removeError) {
      if (removeError instanceof ApiRequestError && removeError.status === 401) await signOut();
      else {
        if (removeError instanceof ApiRequestError && removeError.status === 403) await refreshSession().catch(() => undefined);
        setError(getLocalizedErrorMessage(removeError, t('errors.notSaved')));
      }
    } finally {
      setIsMutating(false);
    }
  }

  const header = (
    <View style={styles.headerContent}>
      <CompactScreenHeader
        copyRef={headingRef}
        leading={<IconButton accessibilityLabel={tCommon('actions.back')} icon="arrow-left" variant="glass" onPress={() => router.back()} />}
        title={t('markScreen.title')}
        subtitle={activeProject?.name ?? t('project.none')}
      />
      <ProjectContextCard compact showSwitchAction />
      <Card style={styles.dateCard}>
        <View style={styles.sectionHeading}>
          <AppText style={styles.sectionTitle} weight={700}>{t('markScreen.dateTitle')}</AppText>
          <AppText style={styles.sectionDescription} weight={500}>{t('markScreen.description')}</AppText>
        </View>
        <FormField label={t('period.attendanceDate')} required>
          <DateInput allowClear={false} accessibilityLabel={t('period.selectDate')} maximumDate={new Date(`${todayDateOnly()}T12:00:00`)} value={date} onChangeText={(value) => value && setDate(value)} />
        </FormField>
      </Card>
      {canRead && summary ? <AttendanceTotals locale={locale} totals={summary.totals} /> : null}
      {success ? (
        <Card accessibilityLiveRegion="polite" style={styles.successCard}>
          <AppText style={styles.successText} weight={600}>{success}</AppText>
          <Button fullWidth={false} label={tCommon('actions.close')} size="sm" variant="ghost" onPress={() => setSuccess('')} />
        </Card>
      ) : null}
      <ListControls>
        <SearchField accessibilityLabel={t('filters.searchA11y')} placeholder={t('filters.searchPlaceholder')} value={search} onChangeText={setSearch} />
      </ListControls>
      {!canCreate && !canUpdate && canRead ? <Card><AppText style={styles.cardNote} weight={500}>{t('markScreen.readOnly')}</AppText></Card> : null}
      {isRefreshing ? (
        <View accessibilityLiveRegion="polite" style={styles.refreshing}>
          <ActivityIndicator color={mobileTheme.color.action.primary} />
          <AppText style={styles.cardNote}>{t('loading.refreshing')}</AppText>
        </View>
      ) : null}
      {error ? <EmptyState title={t('errors.dailyTitle')} description={error} actionLabel={tCommon('actions.retry')} onAction={() => void load(1)} /> : null}
    </View>
  );

  const noContext = !session?.activeOrganization || !activeProject
    ? <EmptyState title={t('empty.noProjectTitle')} description={t('empty.noProjectDescription')} />
    : !canRead
      ? <EmptyState title={t('empty.permissionTitle')} description={t('empty.permissionDescription')} actionLabel={tCommon('actions.retry')} onAction={() => void refreshSession()} />
      : null;
  const rows = noContext || error ? [] : summary?.rows ?? [];

  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="attendance" />} scroll={false}>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.workerAssignmentId}
        renderItem={({ item }) => <DailyWorkerCard canCreate={canCreate} canUpdate={canUpdate} row={item} onEdit={openSheet} onRestore={confirmRestore} />}
        ListHeaderComponent={header}
        ListEmptyComponent={noContext ?? (isLoading ? (
          <View style={styles.loading}><ActivityIndicator color={mobileTheme.color.action.primary} /><AppText>{t('loading.daily')}</AppText></View>
        ) : !error ? (
          <EmptyState title={debouncedSearch ? t('empty.noMatchesTitle') : t('empty.noDailyWorkersTitle')} description={debouncedSearch ? t('empty.noMatchesDescription') : t('empty.noDailyWorkersDescription')} />
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

      {editingRow ? (
        <AttendanceExceptionSheet
          canSave={canRead && sheetContextKey.current === contextKey && (editingRow.selectedDate?.exception ? canUpdate : canCreate)}
          date={date}
          draft={draft}
          error={formError}
          locale={locale}
          projectName={activeProject?.name ?? ''}
          row={editingRow}
          saving={isMutating}
          onChange={setDraft}
          onClose={() => closeSheet()}
          onSave={() => void saveException()}
        />
      ) : null}
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  listContent: { gap: mobileTheme.spacing[4], paddingBottom: mobileTheme.spacing[4] },
  headerContent: { gap: mobileTheme.spacing[4], marginBottom: mobileTheme.spacing[1] },
  dateCard: { gap: mobileTheme.spacing[4] },
  sectionHeading: { gap: mobileTheme.spacing[1] },
  sectionTitle: { ...mobileText.sectionTitle },
  sectionDescription: { ...mobileText.body },
  workerCard: { gap: mobileTheme.spacing[4] },
  workerTopRow: { alignItems: 'flex-start', flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[3], justifyContent: 'space-between' },
  workerIdentity: { flex: 1, gap: mobileTheme.spacing[1], minWidth: 180 },
  workerName: { ...mobileText.sectionTitle, fontSize: 18, lineHeight: 24 },
  workerMeta: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  rowAction: { flexBasis: 140, flexGrow: 1 },
  cardNote: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  refreshing: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2] },
  successCard: { alignItems: 'center', borderColor: mobileTheme.color.status.success.border, flexDirection: 'row', gap: mobileTheme.spacing[2], justifyContent: 'space-between' },
  successText: { ...mobileText.body, color: mobileTheme.color.status.success.foreground, flex: 1 },
  loading: { alignItems: 'center', gap: mobileTheme.spacing[3], justifyContent: 'center', minHeight: 180 },
});
