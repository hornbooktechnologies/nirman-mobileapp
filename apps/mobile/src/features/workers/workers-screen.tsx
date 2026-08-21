import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppIcon,
  AppText,
  ActionListItem,
  BottomSheet,
  Button,
  Card,
  Chip,
  CompactScreenHeader,
  DateInput,
  EmptyState,
  FormError,
  FormField,
  NirmanScreenBackground,
  IconButton,
  Input,
  LoadingState,
  OperationalEntityCard,
  SearchField,
  StatusBadge,
} from '../../components/ui';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { ApiRequestError } from '../../lib/api';
import { formatInr, getLocalizedErrorMessage } from '../../i18n';
import { isValidDateOnly, isValidNonNegativeNumber, isValidPhone, parseDateOnly } from '../../lib/validation';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import {
  assignWorkerToProject,
  createWorker,
  endWorkerProjectAssignment,
  fetchOrganizationWorkers,
  fetchProjectWorkers,
  fetchWorkerDuplicateCandidates,
  updateWorkerProjectAssignment,
} from './services';
import type {
  ProjectWorkerRosterItem,
  WorkerDuplicateCandidate,
  WorkerSummary,
} from './types';

const TRADE_SUGGESTION_KEYS = ['mason', 'helper', 'carpenter', 'plumber', 'electrician', 'painter'] as const;
const today = () => new Date().toISOString().slice(0, 10);
type AssignmentDateErrors = Partial<Record<'startsOn' | 'endsOn', string>>;

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
  const projectPermissions = getActiveProjectPermissions(session);
  const canCreate = projectPermissions.includes('workers:create');
  const canAssign = projectPermissions.includes('workers:assign-project');
  const [workers, setWorkers] = useState<WorkerSummary[]>([]);
  const [roster, setRoster] = useState<ProjectWorkerRosterItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [assigningWorker, setAssigningWorker] = useState<WorkerSummary | null>(null);
  const [assignStartsOn, setAssignStartsOn] = useState(today());
  const [assignError, setAssignError] = useState('');
  const [assignFieldError, setAssignFieldError] = useState('');
  const [actionWorker, setActionWorker] = useState<ProjectWorkerRosterItem | null>(null);
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
  const visibleWorkers = workers.filter((worker) => {
    const needle = search.trim().toLowerCase();
    const matchesSearch = (
      !needle ||
      worker.name.toLowerCase().includes(needle) ||
      worker.workerCode.toLowerCase().includes(needle) ||
      worker.trade.toLowerCase().includes(needle)
    );
    const isAssigned = rosterByWorkerId.has(worker.id);
    const matchesFilter = filter === 'all' || (filter === 'assigned' ? isAssigned : !isAssigned);
    return matchesSearch && matchesFilter;
  });

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
    setActionWorker(null);
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
    const canOpen = assignedWorker ? canAssign : canAssign;
    const openWorker = canOpen
      ? () => {
        if (assignedWorker) setActionWorker(assignedWorker);
        else {
          setAssigningWorker(worker);
          setAssignStartsOn(today());
          setAssignError('');
          setAssignFieldError('');
        }
      }
      : undefined;

    return (
      <OperationalEntityCard
        accessibilityLabel={t('card.summaryA11y', { code: worker.workerCode, name: worker.name, trade: worker.trade, rate: displayRate(effectiveRate), assignment: assignedWorker ? t('card.assigned') : t('card.unassigned') })}
        contextLeading={worker.workerCode}
        contextTrailing={worker.trade}
        footerLeading={assignedWorker ? displayDateRange(assignedWorker.currentAssignment.startsOn, assignedWorker.currentAssignment.endsOn) : t('card.noCurrentProject')}
        footerTrailing={<StatusBadge label={assignedWorker ? t('card.assigned') : t('card.unassigned')} />}
        onPress={openWorker}
        supporting={assignedWorker ? t('card.projectAllocation') : t('card.available')}
        title={worker.name}
        value={displayRate(effectiveRate)}
        valueLabel={t('card.rate')}
        tone={assignedWorker ? 'success' : 'warning'}
      />
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
      <SearchField accessibilityLabel={t('panel.searchA11y')} placeholder={t('panel.searchPlaceholder')} value={search} onChangeText={setSearch} />
      <View style={styles.filters}>
        <Chip label={t('panel.allCount', { count: workers.length })} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={t('panel.assignedFilter', { count: roster.length })} selected={filter === 'assigned'} onPress={() => setFilter('assigned')} />
        <Chip label={t('panel.unassignedFilter', { count: Math.max(workers.length - roster.length, 0) })} selected={filter === 'unassigned'} onPress={() => setFilter('unassigned')} />
      </View>

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

      {showCreate ? <CreateWorkerSheet organizationId={organizationId} projectId={projectId} accessToken={session.accessToken} saving={isSubmitting} onClose={() => setShowCreate(false)} onSaving={setIsSubmitting} onSaved={async () => { setShowCreate(false); await loadWorkers(); }} /> : null}

      {assigningWorker ? (
        <BottomSheet visible showCloseButton={false} title={t('assign.title', { name: assigningWorker.name })} description={t('assign.description')} onClose={() => setAssigningWorker(null)} footer={<><Button label={t('assign.cancel')} variant="secondary" style={styles.footerButton} onPress={() => setAssigningWorker(null)} /><Button label={isSubmitting ? t('assign.assigning') : t('assign.action')} disabled={isSubmitting} style={styles.footerButton} onPress={() => void assign()} /></>}>
          <FormError message={assignError} />
          <Card variant="blueprint" style={styles.assignmentSummary}><AppText style={styles.body}>{assigningWorker.trade}</AppText><AppText style={styles.assignmentRate} weight={700}>{displayRate(assigningWorker.baseDailyRate)}</AppText></Card>
          <FormField label={t('assign.startsOn')} required error={assignFieldError}><DateInput accessibilityLabel={t('assign.startDateA11y')} invalid={Boolean(assignFieldError)} value={assignStartsOn} onChangeText={(startsOn) => { setAssignStartsOn(startsOn); setAssignFieldError(''); }} /></FormField>
        </BottomSheet>
      ) : null}

      {actionWorker ? (
        <BottomSheet visible title={actionWorker.name} description={t('actions.description', { trade: actionWorker.trade })} onClose={() => setActionWorker(null)}>
          <ActionListItem icon="calendar-edit" label={t('actions.edit')} tone="brand" onPress={() => openEdit(actionWorker)} />
          <ActionListItem icon="account-minus-outline" label={t('actions.end')} tone="danger" onPress={() => { setActionWorker(null); setEndingWorker(actionWorker); setEndForm({ endsOn: today(), reason: '' }); setEndError(''); setEndFieldError(''); }} />
        </BottomSheet>
      ) : null}

      {editingWorker ? (
        <BottomSheet visible showCloseButton={false} title={editingWorker.name} description={t('edit.description')} onClose={() => setEditingWorker(null)} footer={<><Button label={t('edit.cancel')} variant="secondary" style={styles.footerButton} onPress={() => setEditingWorker(null)} /><Button label={isSubmitting ? t('edit.saving') : t('edit.save')} variant="brand" disabled={isSubmitting} style={styles.footerButton} onPress={() => void saveEdit()} /></>}>
          <FormError message={editError} />
          <View style={styles.dateRow}><FormField label={t('edit.startsOn')} required error={editFieldErrors.startsOn} style={styles.dateField}><DateInput accessibilityLabel={t('edit.startDateA11y')} invalid={Boolean(editFieldErrors.startsOn)} value={editForm.startsOn} onChangeText={(startsOn) => { setEditForm({ ...editForm, startsOn }); setEditFieldErrors((current) => ({ ...current, startsOn: undefined, endsOn: undefined })); }} /></FormField><FormField label={t('edit.endsOn')} optional error={editFieldErrors.endsOn} style={styles.dateField}><DateInput accessibilityLabel={t('edit.endDateA11y')} invalid={Boolean(editFieldErrors.endsOn)} minimumDate={parseDateOnly(editForm.startsOn) ?? undefined} value={editForm.endsOn} onChangeText={(endsOn) => { setEditForm({ ...editForm, endsOn }); setEditFieldErrors((current) => ({ ...current, endsOn: undefined })); }} /></FormField></View>
        </BottomSheet>
      ) : null}

      {endingWorker ? (
        <BottomSheet visible showCloseButton={false} title={t('end.title')} description={t('end.description', { name: endingWorker.name })} onClose={() => setEndingWorker(null)} footer={<><Button label={t('end.cancel')} variant="secondary" style={styles.footerButton} onPress={() => setEndingWorker(null)} /><Button label={isSubmitting ? t('end.ending') : t('end.action')} variant="danger" disabled={isSubmitting} style={styles.footerButton} onPress={() => void endAssignment()} /></>}>
          <FormError message={endError} />
          <FormField label={t('end.endsOn')} required error={endFieldError}><DateInput accessibilityLabel={t('end.endDateA11y')} invalid={Boolean(endFieldError)} minimumDate={parseDateOnly(endingWorker.currentAssignment.startsOn.slice(0, 10)) ?? undefined} value={endForm.endsOn} onChangeText={(endsOn) => { setEndForm({ ...endForm, endsOn }); setEndFieldError(''); }} /></FormField>
          <FormField label={t('end.reason')} optional><Input accessibilityLabel={t('end.reason')} maxLength={500} value={endForm.reason} onChangeText={(reason) => setEndForm({ ...endForm, reason })} /></FormField>
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
      <FormField label={t('create.mobile')} optional error={fieldErrors.mobileNumber}><Input accessibilityLabel={t('create.mobileA11y')} invalid={Boolean(fieldErrors.mobileNumber)} keyboardType="phone-pad" maxLength={20} value={form.mobileNumber} onChangeText={(mobileNumber) => { setForm({ ...form, mobileNumber }); setAcknowledged(false); if (fieldErrors.mobileNumber) setFieldErrors((current) => ({ ...current, mobileNumber: undefined })); }} /></FormField>
      <FormField label={t('create.rate')} optional helperText={t('create.rateHelp')} error={fieldErrors.dailyRate}><Input accessibilityLabel={t('create.rateA11y')} invalid={Boolean(fieldErrors.dailyRate)} keyboardType="decimal-pad" value={form.dailyRate} onChangeText={(dailyRate) => { setForm({ ...form, dailyRate }); if (fieldErrors.dailyRate) setFieldErrors((current) => ({ ...current, dailyRate: undefined })); }} /></FormField>
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
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
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
