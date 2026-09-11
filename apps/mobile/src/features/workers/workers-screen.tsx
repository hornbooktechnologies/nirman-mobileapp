import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppIcon,
  AppText,
  ActionListItem,
  AppliedFilterChip,
  AppliedFilters,
  BottomSheet,
  Button,
  Card,
  CompactScreenHeader,
  DateInput,
  EmptyState,
  FilterGroup,
  FilterOption,
  FormError,
  FormField,
  ListControls,
  ListFilterBar,
  ListFilterSheet,
  NirmanScreenBackground,
  IconButton,
  Input,
  LoadingState,
  OperationalEntityCard,
  SearchField,
  SearchableSelect,
  StatusBadge,
} from '../../components/ui';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { ApiRequestError } from '../../lib/api';
import { formatInr, getLocalizedErrorMessage } from '../../i18n';
import { formatDateOnly, isValidDateOnly, isValidNonNegativeNumber, isValidPhone, parseDateOnly, sanitizePhoneInput } from '../../lib/validation';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import {
  assignWorkerToProject,
  createWorkerPrimaryProjectPeriod,
  createWorker,
  endWorkerPrimaryProjectPeriod,
  endWorkerProjectAssignment,
  fetchOrganizationWorkers,
  fetchProjectWorkers,
  fetchWorkerDetail,
  fetchWorkerDuplicateCandidates,
  fetchWorkerPrimaryProjectPeriods,
  updateWorkerPrimaryProjectPeriod,
  updateWorkerProjectAssignment,
} from './services';
import type {
  ProjectWorkerRosterItem,
  WorkerDetail,
  WorkerDuplicateCandidate,
  WorkerPrimaryProjectPeriod,
  WorkerProjectAssignmentSummary,
  WorkerSummary,
} from './types';

const TRADE_SUGGESTION_KEYS = ['mason', 'helper', 'carpenter', 'plumber', 'electrician', 'painter'] as const;
const today = () => new Date().toISOString().slice(0, 10);
type AssignmentDateErrors = Partial<Record<'startsOn' | 'endsOn', string>>;
type PrimaryProjectErrors = Partial<Record<'workerAssignmentId' | 'effectiveDate', string>>;
type WorkerFilter = 'all' | 'assigned_here' | 'not_on_project';

function coversDate(startsOn: string, endsOn: string | null, date: string) {
  return startsOn.slice(0, 10) <= date && (endsOn === null || endsOn.slice(0, 10) >= date);
}

function previousDateOnly(value: string) {
  const date = parseDateOnly(value);
  if (!date) return null;
  date.setDate(date.getDate() - 1);
  return formatDateOnly(date);
}

function earliestDate(left: string | null, right: string | null) {
  if (left === null) return right;
  if (right === null) return left;
  return left < right ? left : right;
}

export function WorkersScreen() {
  const { t } = useTranslation('workers');
  const { session } = useSession();
  const activeProject = getActiveProject(session);

  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="team" />} scroll={false}>
      <CompactScreenHeader title={t('screen.title')} subtitle={activeProject?.name ?? t('screen.chooseProject')} />
      <WorkersPanel />
    </NirmanScreenBackground>
  );
}

export function WorkersPanel({ embedded = false, projectIdOverride }: { embedded?: boolean; projectIdOverride?: string }) {
  const { t } = useTranslation('workers');
  const { t: tCommon } = useTranslation('common');
  const { language } = useLocalization();
  const { refreshSession, session, signOut } = useSession();
  const activeProject =
    session?.projectAccess.projects.find((project) => project.id === projectIdOverride) ??
    getActiveProject(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = activeProject?.id ?? null;
  const projectPermissions = activeProject?.permissions ?? getActiveProjectPermissions(session);
  const canCreate = projectPermissions.includes('workers:create');
  const canAssign = projectPermissions.includes('workers:assign-project');
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [roster, setRoster] = useState<ProjectWorkerRosterItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<WorkerFilter>('all');
  const [draftFilter, setDraftFilter] = useState<WorkerFilter>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [assigningWorker, setAssigningWorker] = useState<WorkerSummary | null>(null);
  const [assignStartsOn, setAssignStartsOn] = useState(today());
  const [assignError, setAssignError] = useState('');
  const [assignFieldError, setAssignFieldError] = useState('');
  const [detailWorker, setDetailWorker] = useState<WorkerSummary | null>(null);
  const [workerDetail, setWorkerDetail] = useState<WorkerDetail | null>(null);
  const [primaryPeriods, setPrimaryPeriods] = useState<WorkerPrimaryProjectPeriod[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [primaryWorker, setPrimaryWorker] = useState<WorkerDetail | null>(null);
  const [primaryForm, setPrimaryForm] = useState({ workerAssignmentId: '', effectiveDate: today() });
  const [primaryError, setPrimaryError] = useState('');
  const [primaryFieldErrors, setPrimaryFieldErrors] = useState<PrimaryProjectErrors>({});
  const [editingWorker, setEditingWorker] = useState<ProjectWorkerRosterItem | null>(null);
  const [editForm, setEditForm] = useState({ startsOn: today(), endsOn: '' });
  const [editError, setEditError] = useState('');
  const [editFieldErrors, setEditFieldErrors] = useState<AssignmentDateErrors>({});
  const [endingWorker, setEndingWorker] = useState<ProjectWorkerRosterItem | null>(null);
  const [endForm, setEndForm] = useState({ endsOn: today(), reason: '' });
  const [endError, setEndError] = useState('');
  const [endFieldError, setEndFieldError] = useState('');
  const hasLoaded = useRef(false);

  const loadWorkers = useCallback(async () => {
    if (!session?.accessToken || !organizationId || !projectId) return;
    setIsLoading(true);
    setError('');
    setAvailabilityMessage('');
    try {
      const [organizationWorkers, projectRoster] = await Promise.all([
        fetchOrganizationWorkers(organizationId, session.accessToken),
        fetchProjectWorkers(organizationId, projectId, session.accessToken),
      ]);
      setWorkers(organizationWorkers.data);
      setRoster(projectRoster.data);
      hasLoaded.current = true;
    } catch (loadError) {
      if (loadError instanceof ApiRequestError && loadError.status === 401) {
        await signOut();
        return;
      }
      if (loadError instanceof ApiRequestError && loadError.status === 403) {
        setError(t('network.accessChanged'));
        await refreshSession().catch(() => undefined);
        return;
      }
      const message = isNetworkFailure(loadError)
          ? hasLoaded.current
          ? t('network.refreshFailed')
          : t('network.offlineUnavailable')
        : getLocalizedErrorMessage(loadError, t('errors.generic'));
      if (hasLoaded.current) setAvailabilityMessage(message);
      else setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, projectId, refreshSession, session?.accessToken, signOut, t]);

  useEffect(() => {
    void loadWorkers();
  }, [loadWorkers]);

  const rosterByWorkerId = useMemo(
    () => new Map(roster.map((worker) => [worker.id, worker])),
    [roster],
  );
  const assignedHereCount = workers.filter((worker) => rosterByWorkerId.has(worker.id)).length;
  const notOnProjectCount = Math.max(workers.length - assignedHereCount, 0);
  const visibleWorkers = workers.filter((worker) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch = (
      !needle ||
      worker.name.toLowerCase().includes(needle) ||
      worker.workerCode.toLowerCase().includes(needle) ||
      worker.trade.toLowerCase().includes(needle)
    );
    const isAssignedHere = rosterByWorkerId.has(worker.id);
    const matchesFilter = filter === 'all' || (filter === 'assigned_here' ? isAssignedHere : !isAssignedHere);
    return matchesSearch && matchesFilter;
  });
  const detailProjectWorker = detailWorker ? rosterByWorkerId.get(detailWorker.id) : undefined;
  const activeDetailAssignments = workerDetail?.assignments.filter((assignment) => assignment.status === 'ACTIVE') ?? [];
  const endedDetailAssignments = workerDetail?.assignments.filter((assignment) => assignment.status !== 'ACTIVE') ?? [];
  const currentPrimaryPeriod = primaryPeriods.find((period) => coversDate(period.startsOn, period.endsOn, today())) ?? null;
  const nextPrimaryPeriod = primaryPeriods
    .filter((period) => period.startsOn.slice(0, 10) > today())
    .sort((left, right) => left.startsOn.localeCompare(right.startsOn))[0] ?? null;
  const canChangePrimary = canAssign && activeDetailAssignments.some(
    (assignment) => assignment.id !== currentPrimaryPeriod?.workerAssignmentId,
  );
  const primarySourcePeriod = primaryPeriods.find(
    (period) => coversDate(period.startsOn, period.endsOn, primaryForm.effectiveDate),
  ) ?? null;
  const primaryAssignmentOptions = (primaryWorker?.assignments ?? [])
    .filter((assignment) => assignment.status === 'ACTIVE' && coversDate(assignment.startsOn, assignment.endsOn, primaryForm.effectiveDate))
    .map((assignment) => ({
      value: assignment.id,
      label: assignment.projectName ?? t('details.unknownProject'),
      description: `${displayDateRange(assignment.startsOn, assignment.endsOn)} · ${displayRate(assignment.dailyRate)}`,
      disabled: assignment.id === primarySourcePeriod?.workerAssignmentId,
      searchTerms: [assignment.projectName ?? '', assignment.projectId],
    }));
  const primaryTargetAssignment = primaryWorker?.assignments.find(
    (assignment) => assignment.id === primaryForm.workerAssignmentId,
  ) ?? null;

  async function openWorkerDetails(worker: WorkerSummary) {
    if (!session?.accessToken || !organizationId) return;
    setDetailWorker(worker);
    setWorkerDetail(null);
    setPrimaryPeriods([]);
    setDetailError('');
    setDetailLoading(true);
    try {
      const [detail, periods] = await Promise.all([
        fetchWorkerDetail(organizationId, worker.id, session.accessToken),
        fetchWorkerPrimaryProjectPeriods(organizationId, worker.id, session.accessToken),
      ]);
      setWorkerDetail(detail);
      setPrimaryPeriods(periods);
    } catch (loadError) {
      if (loadError instanceof ApiRequestError && loadError.status === 401) {
        setDetailWorker(null);
        await signOut();
        return;
      }
      if (loadError instanceof ApiRequestError && loadError.status === 403) {
        setDetailError(t('network.accessChanged'));
        await refreshSession().catch(() => undefined);
        return;
      }
      setDetailError(
        isNetworkFailure(loadError)
          ? t('network.offlineUnavailable')
          : getLocalizedErrorMessage(loadError, t('errors.generic')),
      );
    } finally {
      setDetailLoading(false);
    }
  }

  function openPrimaryProjectChange() {
    if (!workerDetail) return;
    const effectiveDate = today();
    const current = primaryPeriods.find((period) => coversDate(period.startsOn, period.endsOn, effectiveDate));
    const eligibleAssignments = workerDetail.assignments.filter(
      (assignment) => assignment.status === 'ACTIVE' && coversDate(assignment.startsOn, assignment.endsOn, effectiveDate),
    );
    const target = current
      ? eligibleAssignments.find((assignment) => assignment.id !== current.workerAssignmentId)
      : eligibleAssignments[0];

    setPrimaryWorker(workerDetail);
    setPrimaryForm({ workerAssignmentId: target?.id ?? '', effectiveDate });
    setPrimaryError('');
    setPrimaryFieldErrors({});
    setDetailWorker(null);
    setWorkerDetail(null);
  }

  async function savePrimaryProject() {
    if (!session?.accessToken || !organizationId || !primaryWorker) return;
    const nextErrors: PrimaryProjectErrors = {};
    const effectiveDate = primaryForm.effectiveDate;
    const targetAssignment = primaryWorker.assignments.find(
      (assignment) => assignment.id === primaryForm.workerAssignmentId,
    );

    if (!primaryForm.workerAssignmentId) {
      nextErrors.workerAssignmentId = tCommon('validation.required', { field: t('primary.project') });
    }
    if (!effectiveDate) {
      nextErrors.effectiveDate = tCommon('validation.required', { field: t('primary.effectiveDate') });
    } else if (!isValidDateOnly(effectiveDate)) {
      nextErrors.effectiveDate = tCommon('validation.date');
    } else if (effectiveDate < today()) {
      nextErrors.effectiveDate = t('primary.pastDate');
    }
    if (
      targetAssignment
      && isValidDateOnly(effectiveDate)
      && !coversDate(targetAssignment.startsOn, targetAssignment.endsOn, effectiveDate)
    ) {
      nextErrors.workerAssignmentId = t('primary.outsideAssignment');
    }
    setPrimaryFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length || !targetAssignment) return;

    const sourcePeriod = primaryPeriods.find((period) => coversDate(period.startsOn, period.endsOn, effectiveDate)) ?? null;
    if (sourcePeriod?.workerAssignmentId === targetAssignment.id) {
      setPrimaryError(t('primary.alreadyPrimary'));
      return;
    }

    const nextScheduledPeriod = primaryPeriods
      .filter((period) => period.id !== sourcePeriod?.id && period.startsOn.slice(0, 10) > effectiveDate)
      .sort((left, right) => left.startsOn.localeCompare(right.startsOn))[0];
    const beforeNextPeriod = nextScheduledPeriod ? previousDateOnly(nextScheduledPeriod.startsOn.slice(0, 10)) : null;
    const replacementEndsOn = earliestDate(
      earliestDate(sourcePeriod?.endsOn?.slice(0, 10) ?? null, beforeNextPeriod),
      targetAssignment.endsOn?.slice(0, 10) ?? null,
    );

    if (replacementEndsOn && replacementEndsOn < effectiveDate) {
      setPrimaryFieldErrors({ workerAssignmentId: t('primary.outsideAssignment') });
      return;
    }

    setPrimaryError('');
    setIsSubmitting(true);
    try {
      if (sourcePeriod?.startsOn.slice(0, 10) === effectiveDate) {
        await updateWorkerPrimaryProjectPeriod(
          organizationId,
          primaryWorker.id,
          sourcePeriod.id,
          session.accessToken,
          { workerAssignmentId: targetAssignment.id, endsOn: replacementEndsOn },
        );
      } else {
        if (sourcePeriod) {
          const previousDate = previousDateOnly(effectiveDate);
          if (!previousDate) throw new Error('Invalid effective date');
          await endWorkerPrimaryProjectPeriod(
            organizationId,
            primaryWorker.id,
            sourcePeriod.id,
            session.accessToken,
            { endsOn: previousDate },
          );
        }
        await createWorkerPrimaryProjectPeriod(
          organizationId,
          primaryWorker.id,
          session.accessToken,
          {
            workerAssignmentId: targetAssignment.id,
            startsOn: effectiveDate,
            endsOn: replacementEndsOn,
          },
        );
      }

      const changedWorker = primaryWorker;
      setPrimaryWorker(null);
      await loadWorkers();
      await openWorkerDetails(changedWorker);
    } catch (changeError) {
      setPrimaryError(
        isNetworkFailure(changeError)
          ? t('network.onlineOnly')
          : getLocalizedErrorMessage(changeError, t('errors.generic')),
      );
      const periods = await fetchWorkerPrimaryProjectPeriods(
        organizationId,
        primaryWorker.id,
        session.accessToken,
      ).catch(() => null);
      if (periods) setPrimaryPeriods(periods);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function assign() {
    if (!session?.accessToken || !organizationId || !projectId || !assigningWorker) return;
    setAssignError('');
    if (!assignStartsOn) {
      setAssignFieldError(tCommon('validation.required', { field: t('assign.startsOn') }));
      return;
    }
    if (!isValidDateOnly(assignStartsOn)) {
      setAssignFieldError(tCommon('validation.date'));
      return;
    }
    setAssignFieldError('');
    setIsSubmitting(true);
    try {
      await assignWorkerToProject(
        organizationId,
        projectId,
        assigningWorker.id,
        session.accessToken,
        { startsOn: assignStartsOn },
      );
      setAssigningWorker(null);
      setAssignStartsOn(today());
      await loadWorkers();
    } catch (assignError) {
      setAssignError(getLocalizedErrorMessage(assignError, t('errors.generic')));
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEdit(worker: ProjectWorkerRosterItem) {
    setDetailWorker(null);
    setWorkerDetail(null);
    setEditingWorker(worker);
    setEditError('');
    setEditFieldErrors({});
    setEditForm({
      startsOn: worker.currentAssignment.startsOn.slice(0, 10),
      endsOn: worker.currentAssignment.endsOn?.slice(0, 10) ?? '',
    });
  }

  async function saveEdit() {
    if (!session?.accessToken || !organizationId || !projectId || !editingWorker) return;
    setEditError('');
    const nextFieldErrors: AssignmentDateErrors = {};
    if (!editForm.startsOn) nextFieldErrors.startsOn = tCommon('validation.required', { field: t('edit.startsOn') });
    else if (!isValidDateOnly(editForm.startsOn)) nextFieldErrors.startsOn = tCommon('validation.date');
    if (editForm.endsOn && !isValidDateOnly(editForm.endsOn)) {
      nextFieldErrors.endsOn = tCommon('validation.date');
    } else if (editForm.endsOn && isValidDateOnly(editForm.startsOn) && editForm.endsOn < editForm.startsOn) {
      nextFieldErrors.endsOn = t('errors.dateOrder');
    }
    setEditFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
      return;
    }
    setIsSubmitting(true);
    try {
      await updateWorkerProjectAssignment(
        organizationId,
        projectId,
        editingWorker.id,
        session.accessToken,
        { startsOn: editForm.startsOn, endsOn: editForm.endsOn || null },
      );
      setEditingWorker(null);
      await loadWorkers();
    } catch (saveError) {
      setEditError(getLocalizedErrorMessage(saveError, t('errors.generic')));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function endAssignment() {
    if (!session?.accessToken || !organizationId || !projectId || !endingWorker) return;
    setEndError('');
    if (!endForm.endsOn) {
      setEndFieldError(tCommon('validation.required', { field: t('end.endsOn') }));
      return;
    }
    if (!isValidDateOnly(endForm.endsOn)) {
      setEndFieldError(tCommon('validation.date'));
      return;
    }
    if (endForm.endsOn < endingWorker.currentAssignment.startsOn.slice(0, 10)) {
      setEndFieldError(t('errors.dateOrder'));
      return;
    }
    setEndFieldError('');
    setIsSubmitting(true);
    try {
      await endWorkerProjectAssignment(
        organizationId,
        projectId,
        endingWorker.id,
        session.accessToken,
        { endsOn: endForm.endsOn, reason: endForm.reason.trim() || null },
      );
      setEndingWorker(null);
      setEndForm({ endsOn: today(), reason: '' });
      await loadWorkers();
    } catch (endError) {
      setEndError(getLocalizedErrorMessage(endError, t('errors.generic')));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!activeProject || !organizationId || !projectId || !session?.accessToken) {
    return <EmptyState title={t('screen.noProjectTitle')} description={t('screen.noProjectDescription')} />;
  }

  function displayRate(rate: string | null | undefined) {
    if (!rate) return t('card.notSet');
    const amount = Number(rate);
    const formattedAmount = Number.isFinite(amount)
      ? formatInr(amount, language, { maximumFractionDigits: 2 })
      : rate;
    return t('card.perDay', { amount: formattedAmount });
  }

  function displayDateRange(startsOn: string, endsOn: string | null) {
    return t('card.dateRange', { start: startsOn.slice(0, 10), end: endsOn?.slice(0, 10) ?? t('card.ongoing') });
  }

  function renderWorkerCard(worker: WorkerSummary) {
    const assignedWorker = rosterByWorkerId.get(worker.id);
    const effectiveRate = assignedWorker?.currentAssignment.dailyRate ?? worker.baseDailyRate;
    const assignmentState = assignedWorker
      ? 'assigned_here'
      : worker.activeAssignmentCount > 0
        ? 'assigned_elsewhere'
        : 'not_assigned';
    const assignmentLabel = assignmentState === 'assigned_here'
      ? t('card.assignedHere')
      : assignmentState === 'assigned_elsewhere'
        ? t('card.assignedElsewhere')
        : t('card.notAssigned');
    const otherAssignmentCount = Math.max(worker.activeAssignmentCount - (assignedWorker ? 1 : 0), 0);
    const supporting = assignedWorker
      ? otherAssignmentCount > 0
        ? t('card.assignedHereOther', { count: otherAssignmentCount })
        : t('card.projectAllocation')
      : worker.activeAssignmentCount > 0
        ? t('card.otherProjectCount', { count: worker.activeAssignmentCount })
        : t('card.available');

    return (
      <OperationalEntityCard
        accessibilityLabel={t('card.summaryA11y', { code: worker.workerCode, name: worker.name, trade: worker.trade, rate: displayRate(effectiveRate), assignment: assignmentLabel })}
        contextLeading={worker.workerCode}
        contextTrailing={worker.trade}
        footerLeading={assignedWorker ? displayDateRange(assignedWorker.currentAssignment.startsOn, assignedWorker.currentAssignment.endsOn) : worker.activeAssignmentCount > 0 ? t('card.viewAssignments') : t('card.noCurrentProject')}
        footerTrailing={<StatusBadge label={assignmentLabel} numberOfLines={1} tone={assignmentState === 'assigned_here' ? 'success' : assignmentState === 'assigned_elsewhere' ? 'info' : 'warning'} />}
        onPress={() => void openWorkerDetails(worker)}
        supporting={supporting}
        title={worker.name}
        value={displayRate(effectiveRate)}
        valueLabel={t('card.rate')}
        tone={assignmentState === 'assigned_here' ? 'success' : assignmentState === 'assigned_elsewhere' ? 'info' : 'warning'}
      />
    );
  }

  function renderAssignmentRow(assignment: WorkerProjectAssignmentSummary) {
    const isCurrentProjectAssignment = assignment.projectId === projectId && assignment.status === 'ACTIVE';
    const isPrimaryNow = currentPrimaryPeriod?.workerAssignmentId === assignment.id;
    return (
      <View key={assignment.id} style={styles.assignmentRow}>
        <View style={styles.assignmentCopy}>
          <AppText style={styles.assignmentProject} weight={700} numberOfLines={2}>
            {assignment.projectName ?? t('details.unknownProject')}
          </AppText>
          <AppText style={styles.subtle} weight={500}>
            {displayDateRange(assignment.startsOn, assignment.endsOn)}
          </AppText>
          <AppText style={styles.subtle} weight={500}>
            {t('details.projectRate', { rate: displayRate(assignment.dailyRate) })}
          </AppText>
        </View>
        <StatusBadge
          label={isPrimaryNow ? t('primary.badge') : isCurrentProjectAssignment ? t('details.selectedProject') : assignment.status === 'ACTIVE' ? t('details.active') : t('details.ended')}
          numberOfLines={1}
          tone={isPrimaryNow || isCurrentProjectAssignment ? 'current' : assignment.status === 'ACTIVE' ? 'success' : 'neutral'}
        />
      </View>
    );
  }

  return (
    <View style={[styles.panel, embedded && styles.embeddedPanel]}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarCopy}>
          <AppText style={styles.sectionTitle} weight={700}>{embedded ? t('panel.projectWorkers') : t('panel.organizationWorkers')}</AppText>
          <AppText style={styles.subtle} weight={500}>{t('panel.assignedCount', { count: roster.length })}</AppText>
        </View>
        {canCreate && canAssign ? (
          <IconButton icon="account-hard-hat-outline" accessibilityLabel={t('panel.addA11y')} variant="primary" onPress={() => setShowCreate(true)} />
        ) : null}
      </View>

      {availabilityMessage ? <Card style={styles.notice}><AppText style={styles.noticeText}>{availabilityMessage}</AppText></Card> : null}
      <ListControls>
        <ListFilterBar
          search={<SearchField accessibilityLabel={t('panel.searchA11y')} placeholder={t('panel.searchPlaceholder')} value={search} onChangeText={setSearch} />}
          filterLabel={tCommon('listFilters.action')}
          filterAccessibilityLabel={tCommon('listFilters.actionA11y', { count: filter === 'all' ? 0 : 1 })}
          activeFilterCount={filter === 'all' ? 0 : 1}
          expanded={filtersOpen}
          onOpenFilters={() => { setDraftFilter(filter); setFiltersOpen(true); }}
        />
        {filter !== 'all' ? <AppliedFilters>
          <AppliedFilterChip
            label={filter === 'assigned_here' ? t('panel.assignedFilter', { count: assignedHereCount }) : t('panel.unassignedFilter', { count: notOnProjectCount })}
            removeAccessibilityLabel={tCommon('listFilters.removeA11y', { filter: filter === 'assigned_here' ? t('card.assignedHere') : t('panel.notOnProject') })}
            onRemove={() => setFilter('all')}
          />
        </AppliedFilters> : null}
      </ListControls>

      {isLoading ? <LoadingState label={t('panel.loading')} /> : null}
      {error ? <EmptyState title={t('panel.loadFailed')} description={error} actionLabel={t('panel.retry')} onAction={() => void loadWorkers()} /> : null}
      {!isLoading && !error ? embedded ? (
        visibleWorkers.length ? <View style={styles.list}>{visibleWorkers.map((worker) => <View key={worker.id}>{renderWorkerCard(worker)}</View>)}</View> : <EmptyState title={search ? t('panel.noMatchTitle') : t('panel.noWorkersTitle')} description={search ? t('panel.tryAnother') : t('panel.addOnline')} />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, !visibleWorkers.length && styles.emptyList]}
          data={visibleWorkers}
          initialNumToRender={10}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(worker) => worker.id}
          ListEmptyComponent={<EmptyState title={search ? t('panel.noMatchTitle') : t('panel.noWorkersTitle')} description={search ? t('panel.tryAnother') : t('panel.addOnline')} />}
          maxToRenderPerBatch={12}
          renderItem={({ item }) => renderWorkerCard(item)}
          showsVerticalScrollIndicator={false}
          windowSize={7}
        />
      ) : null}

      <ListFilterSheet
        visible={filtersOpen}
        title={tCommon('listFilters.title')}
        description={t('panel.filterDescription')}
        clearLabel={tCommon('listFilters.clearAll')}
        applyLabel={tCommon('listFilters.apply')}
        onClear={() => {
          setDraftFilter('all');
          setFilter('all');
          setFiltersOpen(false);
        }}
        onApply={() => { setFilter(draftFilter); setFiltersOpen(false); }}
        onClose={() => setFiltersOpen(false)}
      >
        <FilterGroup label={t('panel.filterGroup')}>
          <FilterOption label={t('panel.allCount', { count: workers.length })} selected={draftFilter === 'all'} onPress={() => setDraftFilter('all')} />
          <FilterOption label={t('panel.assignedFilter', { count: assignedHereCount })} selected={draftFilter === 'assigned_here'} onPress={() => setDraftFilter('assigned_here')} />
          <FilterOption label={t('panel.unassignedFilter', { count: notOnProjectCount })} selected={draftFilter === 'not_on_project'} onPress={() => setDraftFilter('not_on_project')} />
        </FilterGroup>
      </ListFilterSheet>

      {showCreate ? <CreateWorkerSheet organizationId={organizationId} projectId={projectId} accessToken={session.accessToken} saving={isSubmitting} onClose={() => setShowCreate(false)} onSaving={setIsSubmitting} onSaved={async () => { setShowCreate(false); await loadWorkers(); }} /> : null}

      {assigningWorker ? (
        <BottomSheet visible showCloseButton={false} title={t('assign.title', { name: assigningWorker.name })} description={t('assign.description')} onClose={() => setAssigningWorker(null)} footer={<><Button label={t('assign.cancel')} variant="secondary" style={styles.footerButton} onPress={() => setAssigningWorker(null)} /><Button label={isSubmitting ? t('assign.assigning') : t('assign.action')} disabled={isSubmitting} style={styles.footerButton} onPress={() => void assign()} /></>}>
          <FormError message={assignError} />
          <Card variant="blueprint" style={styles.assignmentSummary}><AppText style={styles.body}>{assigningWorker.trade}</AppText><AppText style={styles.assignmentRate} weight={700}>{displayRate(assigningWorker.baseDailyRate)}</AppText></Card>
          <FormField label={t('assign.startsOn')} required error={assignFieldError}><DateInput accessibilityLabel={t('assign.startDateA11y')} invalid={Boolean(assignFieldError)} value={assignStartsOn} onChangeText={(startsOn) => { setAssignStartsOn(startsOn); setAssignFieldError(''); }} /></FormField>
        </BottomSheet>
      ) : null}

      {detailWorker ? (
        <BottomSheet visible scroll title={detailWorker.name} description={t('details.description', { code: detailWorker.workerCode, trade: detailWorker.trade })} onClose={() => { setDetailWorker(null); setWorkerDetail(null); setPrimaryPeriods([]); setDetailError(''); }}>
          {detailLoading ? <LoadingState label={t('details.loading')} /> : null}
          {detailError ? <EmptyState title={t('details.loadFailed')} description={detailError} actionLabel={t('details.retry')} onAction={() => void openWorkerDetails(detailWorker)} /> : null}
          {!detailLoading && !detailError && workerDetail ? (
            <>
              <View style={styles.detailFacts}>
                <View style={styles.detailFact}><AppText style={styles.subtle} weight={600}>{t('details.mobile')}</AppText><AppText style={styles.body} weight={700}>{workerDetail.mobileNumber ?? t('details.noMobile')}</AppText></View>
                <View style={styles.detailFact}><AppText style={styles.subtle} weight={600}>{t('details.baseRate')}</AppText><AppText style={styles.body} weight={700}>{displayRate(workerDetail.baseDailyRate)}</AppText></View>
              </View>
              <Card variant="blueprint" style={styles.primarySummary}>
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.primaryIcon}>
                  <AppIcon color={mobileTheme.color.action.primary} name="map-marker-check-outline" size={mobileTheme.icon.lg} />
                </View>
                <View style={styles.primaryCopy}>
                  <AppText style={styles.subtle} weight={600}>{t('primary.sectionTitle')}</AppText>
                  <AppText style={styles.body} weight={700} numberOfLines={2}>
                    {currentPrimaryPeriod?.projectName ?? t('primary.notSet')}
                  </AppText>
                  {currentPrimaryPeriod ? <AppText style={styles.subtle} weight={500}>{displayDateRange(currentPrimaryPeriod.startsOn, currentPrimaryPeriod.endsOn)}</AppText> : null}
                  {nextPrimaryPeriod ? <AppText style={styles.primaryScheduled} weight={600}>{t('primary.scheduled', { date: nextPrimaryPeriod.startsOn.slice(0, 10), project: nextPrimaryPeriod.projectName ?? t('details.unknownProject') })}</AppText> : null}
                </View>
              </Card>
              <View style={styles.assignmentSection}>
                <AppText style={styles.detailSectionTitle} weight={700}>{t('details.activeAssignments', { count: activeDetailAssignments.length })}</AppText>
                {activeDetailAssignments.length ? activeDetailAssignments.map(renderAssignmentRow) : <AppText style={styles.subtle}>{t('details.noActiveAssignments')}</AppText>}
              </View>
              {endedDetailAssignments.length ? <View style={styles.assignmentSection}><AppText style={styles.detailSectionTitle} weight={700}>{t('details.assignmentHistory', { count: endedDetailAssignments.length })}</AppText>{endedDetailAssignments.map(renderAssignmentRow)}</View> : null}
              {canAssign ? <View style={styles.assignmentActions}>
                {canChangePrimary ? <ActionListItem icon="swap-horizontal" label={currentPrimaryPeriod ? t('primary.changeAction') : t('primary.setAction')} tone="info" onPress={openPrimaryProjectChange} /> : null}
                {detailProjectWorker ? (
                  <>
                    <ActionListItem icon="calendar-edit" label={t('actions.edit')} tone="brand" onPress={() => openEdit(detailProjectWorker)} />
                    <ActionListItem icon="account-minus-outline" label={t('actions.end')} tone="danger" onPress={() => { setDetailWorker(null); setWorkerDetail(null); setEndingWorker(detailProjectWorker); setEndForm({ endsOn: today(), reason: '' }); setEndError(''); setEndFieldError(''); }} />
                  </>
                ) : <ActionListItem icon="account-plus-outline" label={t('details.assignHere')} tone="brand" onPress={() => { setDetailWorker(null); setWorkerDetail(null); setAssigningWorker(detailWorker); setAssignStartsOn(today()); setAssignError(''); setAssignFieldError(''); }} />}
              </View> : null}
            </>
          ) : null}
        </BottomSheet>
      ) : null}

      {primaryWorker ? (
        <BottomSheet
          visible
          scroll
          showCloseButton={false}
          title={primarySourcePeriod ? t('primary.changeTitle') : t('primary.setTitle')}
          description={primaryWorker.name}
          onClose={() => setPrimaryWorker(null)}
          footer={<><Button label={t('primary.cancel')} variant="secondary" disabled={isSubmitting} style={styles.footerButton} onPress={() => setPrimaryWorker(null)} /><Button label={isSubmitting ? t('primary.saving') : t('primary.confirm')} disabled={isSubmitting} style={styles.footerButton} onPress={() => void savePrimaryProject()} /></>}
        >
          <FormError message={primaryError} />
          <FormField label={t('primary.effectiveDate')} required error={primaryFieldErrors.effectiveDate} helperText={t('primary.effectiveDateHelp')}>
            <DateInput
              allowClear={false}
              showPickerIndicator
              accessibilityLabel={t('primary.effectiveDateA11y')}
              invalid={Boolean(primaryFieldErrors.effectiveDate)}
              minimumDate={parseDateOnly(today()) ?? undefined}
              value={primaryForm.effectiveDate}
              onChangeText={(effectiveDate) => {
                const selectedAssignment = primaryWorker.assignments.find((assignment) => assignment.id === primaryForm.workerAssignmentId);
                setPrimaryForm({
                  workerAssignmentId: selectedAssignment && coversDate(selectedAssignment.startsOn, selectedAssignment.endsOn, effectiveDate)
                    ? primaryForm.workerAssignmentId
                    : '',
                  effectiveDate,
                });
                setPrimaryError('');
                setPrimaryFieldErrors({});
              }}
            />
          </FormField>
          <FormField label={t('primary.project')} required error={primaryFieldErrors.workerAssignmentId}>
            <SearchableSelect
              accessibilityLabel={t('primary.projectA11y')}
              accessibilityHint={t('primary.projectHint')}
              emptyDescription={t('primary.noEligibleDescription')}
              emptyTitle={t('primary.noEligibleTitle')}
              invalid={Boolean(primaryFieldErrors.workerAssignmentId)}
              options={primaryAssignmentOptions}
              placeholder={t('primary.projectPlaceholder')}
              searchAccessibilityLabel={t('primary.searchA11y')}
              searchPlaceholder={t('primary.searchPlaceholder')}
              title={t('primary.projectPickerTitle')}
              value={primaryForm.workerAssignmentId || null}
              onChange={(workerAssignmentId) => {
                setPrimaryForm((current) => ({ ...current, workerAssignmentId }));
                setPrimaryError('');
                setPrimaryFieldErrors((current) => ({ ...current, workerAssignmentId: undefined }));
              }}
            />
          </FormField>
          <Card variant="blueprint" style={styles.primaryImpact}>
            <AppText style={styles.subtle} weight={600}>{t('primary.currentLabel')}</AppText>
            <AppText style={styles.body} weight={700}>{primarySourcePeriod?.projectName ?? t('primary.notSet')}</AppText>
            {primaryTargetAssignment ? (
              <AppText style={styles.primaryImpactText} weight={600}>
                {t('primary.impact', {
                  date: primaryForm.effectiveDate,
                  project: primaryTargetAssignment.projectName ?? t('details.unknownProject'),
                })}
              </AppText>
            ) : null}
          </Card>
        </BottomSheet>
      ) : null}

      {editingWorker ? (
        <BottomSheet visible showCloseButton={false} title={editingWorker.name} description={t('edit.description')} onClose={() => setEditingWorker(null)} footer={<><Button label={t('edit.cancel')} variant="secondary" style={styles.footerButton} onPress={() => setEditingWorker(null)} /><Button label={isSubmitting ? t('edit.saving') : t('edit.save')} variant="brand" disabled={isSubmitting} style={styles.footerButton} onPress={() => void saveEdit()} /></>}>
          <FormError message={editError} />
          <View style={styles.dateRow}><FormField label={t('edit.startsOn')} required error={editFieldErrors.startsOn} style={styles.dateField}><DateInput accessibilityLabel={t('edit.startDateA11y')} invalid={Boolean(editFieldErrors.startsOn)} value={editForm.startsOn} onChangeText={(startsOn) => { setEditForm({ ...editForm, startsOn }); setEditFieldErrors((current) => ({ ...current, startsOn: undefined, endsOn: undefined })); }} /></FormField><FormField label={t('edit.endsOn')} error={editFieldErrors.endsOn} style={styles.dateField}><DateInput accessibilityLabel={t('edit.endDateA11y')} invalid={Boolean(editFieldErrors.endsOn)} minimumDate={parseDateOnly(editForm.startsOn) ?? undefined} value={editForm.endsOn} onChangeText={(endsOn) => { setEditForm({ ...editForm, endsOn }); setEditFieldErrors((current) => ({ ...current, endsOn: undefined })); }} /></FormField></View>
        </BottomSheet>
      ) : null}

      {endingWorker ? (
        <BottomSheet visible showCloseButton={false} title={t('end.title')} description={t('end.description', { name: endingWorker.name })} onClose={() => setEndingWorker(null)} footer={<><Button label={t('end.cancel')} variant="secondary" style={styles.footerButton} onPress={() => setEndingWorker(null)} /><Button label={isSubmitting ? t('end.ending') : t('end.action')} variant="danger" disabled={isSubmitting} style={styles.footerButton} onPress={() => void endAssignment()} /></>}>
          <FormError message={endError} />
          <FormField label={t('end.endsOn')} required error={endFieldError}><DateInput accessibilityLabel={t('end.endDateA11y')} invalid={Boolean(endFieldError)} minimumDate={parseDateOnly(endingWorker.currentAssignment.startsOn.slice(0, 10)) ?? undefined} value={endForm.endsOn} onChangeText={(endsOn) => { setEndForm({ ...endForm, endsOn }); setEndFieldError(''); }} /></FormField>
          <FormField label={t('end.reason')}><Input accessibilityLabel={t('end.reason')} maxLength={500} value={endForm.reason} onChangeText={(reason) => setEndForm({ ...endForm, reason })} /></FormField>
        </BottomSheet>
      ) : null}
    </View>
  );
}

function CreateWorkerSheet({ organizationId, projectId, accessToken, saving, onClose, onSaving, onSaved }: { organizationId: string; projectId: string; accessToken: string; saving: boolean; onClose: () => void; onSaving: (saving: boolean) => void; onSaved: () => Promise<void> }) {
  const { t } = useTranslation('workers');
  const { t: tCommon } = useTranslation('common');
  const [form, setForm] = useState({ name: '', trade: '', mobileNumber: '', dailyRate: '' });
  const [duplicates, setDuplicates] = useState<WorkerDuplicateCandidate[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'name' | 'trade' | 'mobileNumber' | 'dailyRate', string>>>({});

  async function submit() {
    setError('');
    const nextFieldErrors: Partial<Record<'name' | 'trade' | 'mobileNumber' | 'dailyRate', string>> = {};
    if (!form.name.trim()) nextFieldErrors.name = t('create.nameRequired');
    if (!form.trade.trim()) nextFieldErrors.trade = t('create.tradeRequired');
    if (form.mobileNumber.trim() && !isValidPhone(form.mobileNumber)) nextFieldErrors.mobileNumber = tCommon('validation.phone');
    if (form.dailyRate.trim() && !isValidNonNegativeNumber(form.dailyRate)) nextFieldErrors.dailyRate = tCommon('validation.number');
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) {
      return;
    }
    onSaving(true);
    try {
      const candidates = await fetchWorkerDuplicateCandidates(organizationId, accessToken, form);
      setDuplicates(candidates);
      if (candidates.length && !acknowledged) {
        setError(t('create.duplicatesError'));
        return;
      }
      await createWorker(organizationId, accessToken, { name: form.name.trim(), trade: form.trade.trim(), mobileNumber: form.mobileNumber.trim() || null, dailyRate: form.dailyRate.trim() || null, projectId, startsOn: today(), acknowledgeDuplicateWarning: acknowledged });
      await onSaved();
    } catch (createError) {
      setError(isNetworkFailure(createError) ? t('network.onlineOnly') : getLocalizedErrorMessage(createError, t('errors.generic')));
    } finally {
      onSaving(false);
    }
  }

  return (
    <BottomSheet visible scroll showCloseButton={false} title={t('create.title')} description={t('create.description')} onClose={onClose} footer={<><Button label={t('create.cancel')} variant="secondary" style={styles.footerButton} onPress={onClose} /><Button label={saving ? t('create.creating') : t('create.action')} disabled={saving} style={styles.footerButton} onPress={() => void submit()} /></>}>
      <FormError message={error} />
      <FormField label={t('create.name')} required error={fieldErrors.name}><Input accessibilityLabel={t('create.nameA11y')} invalid={Boolean(fieldErrors.name)} maxLength={160} value={form.name} onChangeText={(name) => { setForm({ ...form, name }); setAcknowledged(false); if (fieldErrors.name) setFieldErrors((current) => ({ ...current, name: undefined })); }} /></FormField>
      <FormField label={t('create.trade')} required error={fieldErrors.trade}><Input accessibilityLabel={t('create.tradeA11y')} invalid={Boolean(fieldErrors.trade)} maxLength={80} value={form.trade} onChangeText={(trade) => { setForm({ ...form, trade }); if (fieldErrors.trade) setFieldErrors((current) => ({ ...current, trade: undefined })); }} /><View style={styles.suggestions}>{TRADE_SUGGESTION_KEYS.map((tradeKey) => { const trade = t(`trade.${tradeKey}`); const selected = form.trade === trade; return <Pressable key={tradeKey} accessibilityLabel={trade} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={({ pressed }) => [styles.suggestion, selected && styles.suggestionSelected, pressed && styles.controlPressed]} onPress={() => { setForm({ ...form, trade }); setFieldErrors((current) => ({ ...current, trade: undefined })); }}><AppText style={[styles.suggestionText, selected && styles.suggestionTextSelected]} weight={600}>{trade}</AppText></Pressable>; })}</View></FormField>
      <FormField label={t('create.mobile')} error={fieldErrors.mobileNumber}><Input accessibilityLabel={t('create.mobileA11y')} invalid={Boolean(fieldErrors.mobileNumber)} keyboardType="phone-pad" maxLength={10} value={form.mobileNumber} onBlur={() => setFieldErrors((current) => ({ ...current, mobileNumber: form.mobileNumber && !isValidPhone(form.mobileNumber) ? tCommon('validation.phone') : undefined }))} onChangeText={(value) => { const mobileNumber = sanitizePhoneInput(value); setForm({ ...form, mobileNumber }); setAcknowledged(false); setFieldErrors((current) => ({ ...current, mobileNumber: mobileNumber.length === 10 && !isValidPhone(mobileNumber) ? tCommon('validation.phone') : undefined })); }} /></FormField>
      <FormField label={t('create.rate')} helperText={t('create.rateHelp')} error={fieldErrors.dailyRate}><Input accessibilityLabel={t('create.rateA11y')} invalid={Boolean(fieldErrors.dailyRate)} keyboardType="decimal-pad" value={form.dailyRate} onChangeText={(dailyRate) => { setForm({ ...form, dailyRate }); if (fieldErrors.dailyRate) setFieldErrors((current) => ({ ...current, dailyRate: undefined })); }} /></FormField>
      {duplicates.length ? <Card variant="blueprint" style={styles.duplicates}><AppText style={styles.name} weight={700}>{t('create.duplicatesTitle')}</AppText>{duplicates.map((candidate) => <AppText key={candidate.id} style={styles.body}>{candidate.workerCode} · {candidate.name} · {candidate.trade}</AppText>)}<Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acknowledged }} style={[styles.acknowledge, acknowledged && styles.acknowledgeSelected]} onPress={() => setAcknowledged((current) => !current)}><AppIcon name={acknowledged ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={22} color={acknowledged ? mobileTheme.color.text.inverse : mobileTheme.color.text.primary} /><AppText style={[styles.body, acknowledged && styles.acknowledgeText]} weight={500}>{t('create.continue')}</AppText></Pressable></Card> : null}
    </BottomSheet>
  );
}

function isNetworkFailure(error: unknown) {
  return error instanceof TypeError || (error instanceof Error && /network request failed|failed to fetch|network error/i.test(error.message));
}

const styles = StyleSheet.create({
  panel: { flex: 1, gap: mobileTheme.spacing[4], minHeight: 0 },
  embeddedPanel: { flex: 0, paddingTop: mobileTheme.spacing[1] },
  toolbar: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3] },
  toolbarCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  sectionTitle: { ...mobileText.sectionTitle, fontSize: 20 },
  notice: { backgroundColor: mobileTheme.color.status.warning.background },
  noticeText: { ...mobileText.body, color: mobileTheme.color.status.warning.foreground },
  list: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[4] },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  workerCard: { gap: mobileTheme.spacing[3] },
  workerHeader: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3] },
  workerCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  code: { ...mobileText.caption, color: mobileTheme.color.action.primary, fontFamily: 'Manrope_700Bold' },
  name: { ...mobileText.sectionTitle, fontSize: 18 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  body: { ...mobileText.body },
  subtle: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  detailFacts: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[3] },
  detailFact: { flex: 1, flexBasis: 140, gap: mobileTheme.spacing[1], minWidth: 140 },
  assignmentSection: { gap: mobileTheme.spacing[2] },
  detailSectionTitle: { ...mobileText.sectionTitle, fontSize: 17 },
  primarySummary: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3] },
  primaryIcon: { alignItems: 'center', backgroundColor: mobileTheme.color.status.info.background, borderRadius: mobileTheme.component.iconContainer.radius, height: 44, justifyContent: 'center', width: 44 },
  primaryCopy: { flex: 1, gap: mobileTheme.spacing[1], minWidth: 0 },
  primaryImpact: { gap: mobileTheme.spacing[1] },
  primaryImpactText: { ...mobileText.body, color: mobileTheme.color.status.info.foreground, paddingTop: mobileTheme.spacing[1] },
  primaryScheduled: { ...mobileText.caption, color: mobileTheme.color.status.info.foreground },
  assignmentRow: { alignItems: 'flex-start', borderBottomColor: mobileTheme.color.border.subtle, borderBottomWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[3], paddingVertical: mobileTheme.spacing[3] },
  assignmentCopy: { flex: 1, gap: mobileTheme.spacing[1], minWidth: 0 },
  assignmentProject: { ...mobileText.body, color: mobileTheme.color.text.primary },
  assignmentActions: { gap: mobileTheme.spacing[2], paddingTop: mobileTheme.spacing[2] },
  assignmentSummary: { gap: mobileTheme.spacing[2] },
  assignmentRate: { ...mobileText.sectionTitle, color: mobileTheme.color.action.primary, fontVariant: ['tabular-nums'] },
  footerButton: { flex: 1 },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[3] },
  dateField: { flex: 1, flexBasis: 140, minWidth: 140 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  suggestion: { backgroundColor: mobileTheme.color.surface.raised, borderRadius: mobileTheme.component.chip.radius, minHeight: 44, justifyContent: 'center', paddingHorizontal: mobileTheme.spacing[3] },
  suggestionSelected: { backgroundColor: mobileTheme.color.navigation.floating },
  suggestionText: { ...mobileText.caption, color: mobileTheme.color.text.primary },
  suggestionTextSelected: { color: mobileTheme.color.text.inverse },
  controlPressed: { opacity: 0.78 },
  duplicates: { gap: mobileTheme.spacing[2] },
  acknowledge: { alignItems: 'center', borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.lg, borderWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[2], minHeight: 52, padding: mobileTheme.spacing[3] },
  acknowledgeSelected: { backgroundColor: mobileTheme.color.navigation.floating },
  acknowledgeText: { color: mobileTheme.color.text.inverse },
});
