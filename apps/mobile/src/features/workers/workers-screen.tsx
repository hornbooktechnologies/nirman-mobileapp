import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  ActionListItem,
  BottomSheet,
  Button,
  Card,
  Chip,
  CompactScreenHeader,
  EmptyState,
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
import { useSession } from '../../providers';
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

const TRADE_SUGGESTIONS = ['Mason', 'Helper', 'Carpenter', 'Plumber', 'Electrician', 'Painter'];
const today = () => new Date().toISOString().slice(0, 10);

export function WorkersScreen() {
  const { session } = useSession();
  const activeProject = getActiveProject(session);

  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="team" />} scroll={false}>
      <CompactScreenHeader title="Workers" subtitle={activeProject?.name ?? 'Choose a project to manage its crew'} />
      <WorkersPanel />
    </NirmanScreenBackground>
  );
}

export function WorkersPanel({ embedded = false, projectIdOverride }: { embedded?: boolean; projectIdOverride?: string }) {
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
  const [actionWorker, setActionWorker] = useState<ProjectWorkerRosterItem | null>(null);
  const [editingWorker, setEditingWorker] = useState<ProjectWorkerRosterItem | null>(null);
  const [editForm, setEditForm] = useState({ startsOn: today(), endsOn: '' });
  const [endingWorker, setEndingWorker] = useState<ProjectWorkerRosterItem | null>(null);
  const [endForm, setEndForm] = useState({ endsOn: today(), reason: '' });
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
        setError('Project or Workers access is no longer available. Refreshing access.');
        await refreshSession().catch(() => undefined);
        return;
      }
      const message = isNetworkFailure(loadError)
        ? hasLoaded.current
          ? 'Unable to refresh. Showing the roster already loaded on this screen; changes still require a connection.'
          : 'Workers are unavailable without a connection. A persisted offline roster cache is not available yet.'
        : errorMessage(loadError);
      if (hasLoaded.current) setAvailabilityMessage(message);
      else setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, projectId, refreshSession, session?.accessToken, signOut]);

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
    if (!isDate(assignStartsOn)) {
      Alert.alert('Check start date', 'Use the date format YYYY-MM-DD.');
      return;
    }
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
      Alert.alert('Worker not assigned', errorMessage(assignError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEdit(worker: ProjectWorkerRosterItem) {
    setActionWorker(null);
    setEditingWorker(worker);
    setEditForm({
      startsOn: worker.currentAssignment.startsOn.slice(0, 10),
      endsOn: worker.currentAssignment.endsOn?.slice(0, 10) ?? '',
    });
  }

  async function saveEdit() {
    if (!session?.accessToken || !organizationId || !projectId || !editingWorker) return;
    if (!isDate(editForm.startsOn) || (editForm.endsOn && !isDate(editForm.endsOn))) {
      Alert.alert('Check assignment dates', 'Use the date format YYYY-MM-DD.');
      return;
    }
    if (editForm.endsOn && editForm.endsOn < editForm.startsOn) {
      Alert.alert('Check assignment dates', 'End date cannot be before start date.');
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
      Alert.alert('Assignment not updated', errorMessage(saveError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function endAssignment() {
    if (!session?.accessToken || !organizationId || !projectId || !endingWorker) return;
    if (!isDate(endForm.endsOn)) {
      Alert.alert('Check end date', 'Use the date format YYYY-MM-DD.');
      return;
    }
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
      Alert.alert('Assignment not ended', errorMessage(endError));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!activeProject || !organizationId || !projectId || !session?.accessToken) {
    return <EmptyState title="No selected project" description="Choose a Project from Home before opening Workers." />;
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
        }
      }
      : undefined;

    return (
      <OperationalEntityCard
        accessibilityLabel={`${worker.workerCode}, ${worker.name}, ${worker.trade}, ${formatRate(effectiveRate)}, ${assignedWorker ? 'assigned' : 'unassigned'}`}
        contextLeading={worker.workerCode}
        contextTrailing={worker.trade}
        footerLeading={assignedWorker ? formatDateRange(assignedWorker.currentAssignment.startsOn, assignedWorker.currentAssignment.endsOn) : 'No current project'}
        footerTrailing={<StatusBadge label={assignedWorker ? 'ASSIGNED' : 'UNASSIGNED'} />}
        onPress={openWorker}
        supporting={assignedWorker ? 'Project allocation' : 'Available for assignment'}
        title={worker.name}
        value={formatRate(effectiveRate)}
        valueLabel="Rate"
        tone={assignedWorker ? 'success' : 'warning'}
      />
    );
  }

  return (
    <View style={[styles.panel, embedded && styles.embeddedPanel]}>
      <View style={styles.toolbar}>
        <View style={styles.toolbarCopy}>
          <Text style={styles.sectionTitle}>{embedded ? 'Project workers' : 'Organization workers'}</Text>
          <Text style={styles.subtle}>{roster.length} assigned to this project</Text>
        </View>
        {canCreate && canAssign ? (
          <IconButton icon="account-hard-hat-outline" accessibilityLabel="Add new worker" variant="primary" onPress={() => setShowCreate(true)} />
        ) : null}
      </View>

      {availabilityMessage ? <Card style={styles.notice}><Text style={styles.noticeText}>{availabilityMessage}</Text></Card> : null}
      <SearchField accessibilityLabel="Search organization workers" placeholder="Search code, name or trade" value={search} onChangeText={setSearch} />
      <View style={styles.filters}>
        <Chip label={`All ${workers.length}`} selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={`Assigned ${roster.length}`} selected={filter === 'assigned'} onPress={() => setFilter('assigned')} />
        <Chip label={`Unassigned ${Math.max(workers.length - roster.length, 0)}`} selected={filter === 'unassigned'} onPress={() => setFilter('unassigned')} />
      </View>

      {isLoading ? <LoadingState label="Loading organization workers" /> : null}
      {error ? <EmptyState title="Unable to load workers" description={error} actionLabel="Retry" onAction={() => void loadWorkers()} /> : null}
      {!isLoading && !error ? embedded ? (
        visibleWorkers.length ? <View style={styles.list}>{visibleWorkers.map((worker) => <View key={worker.id}>{renderWorkerCard(worker)}</View>)}</View> : <EmptyState title={search ? 'No matching workers' : 'No active workers'} description={search ? 'Try another search or filter.' : 'Add a worker when you are online.'} />
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, !visibleWorkers.length && styles.emptyList]}
          data={visibleWorkers}
          initialNumToRender={10}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(worker) => worker.id}
          ListEmptyComponent={<EmptyState title={search ? 'No matching workers' : 'No active workers'} description={search ? 'Try another search or filter.' : 'Add a worker when you are online.'} />}
          maxToRenderPerBatch={12}
          renderItem={({ item }) => renderWorkerCard(item)}
          showsVerticalScrollIndicator={false}
          windowSize={7}
        />
      ) : null}

      {showCreate ? <CreateWorkerSheet organizationId={organizationId} projectId={projectId} accessToken={session.accessToken} saving={isSubmitting} onClose={() => setShowCreate(false)} onSaving={setIsSubmitting} onSaved={async () => { setShowCreate(false); await loadWorkers(); }} /> : null}

      {assigningWorker ? (
        <BottomSheet visible showCloseButton={false} title={`Assign ${assigningWorker.name}`} description="Confirm the project allocation start date." onClose={() => setAssigningWorker(null)} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={() => setAssigningWorker(null)} /><Button label={isSubmitting ? 'Assigning…' : 'Assign'} disabled={isSubmitting} style={styles.footerButton} onPress={() => void assign()} /></>}>
          <Card variant="blueprint" style={styles.assignmentSummary}><Text style={styles.body}>{assigningWorker.trade}</Text><Text style={styles.assignmentRate}>{formatRate(assigningWorker.baseDailyRate)}</Text></Card>
          <FormField label="Starts on" helperText="YYYY-MM-DD"><Input accessibilityLabel="Assignment start date" placeholder="YYYY-MM-DD" value={assignStartsOn} onChangeText={setAssignStartsOn} /></FormField>
        </BottomSheet>
      ) : null}

      {actionWorker ? (
        <BottomSheet visible title={actionWorker.name} description={`${actionWorker.trade} · Assigned`} onClose={() => setActionWorker(null)}>
          <ActionListItem icon="calendar-edit" label="Edit assignment dates" tone="brand" onPress={() => openEdit(actionWorker)} />
          <ActionListItem icon="account-minus-outline" label="End project assignment" tone="danger" onPress={() => { setActionWorker(null); setEndingWorker(actionWorker); setEndForm({ endsOn: today(), reason: '' }); }} />
        </BottomSheet>
      ) : null}

      {editingWorker ? (
        <BottomSheet visible showCloseButton={false} title={editingWorker.name} description="Edit project allocation. Trade and base rate stay unchanged." onClose={() => setEditingWorker(null)} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={() => setEditingWorker(null)} /><Button label={isSubmitting ? 'Saving…' : 'Save changes'} variant="brand" disabled={isSubmitting} style={styles.footerButton} onPress={() => void saveEdit()} /></>}>
          <View style={styles.dateRow}><FormField label="Starts on" helperText="YYYY-MM-DD" style={styles.dateField}><Input accessibilityLabel="Assignment start date" value={editForm.startsOn} onChangeText={(startsOn) => setEditForm({ ...editForm, startsOn })} /></FormField><FormField label="Ends on" helperText="Optional" style={styles.dateField}><Input accessibilityLabel="Assignment end date" value={editForm.endsOn} onChangeText={(endsOn) => setEditForm({ ...editForm, endsOn })} /></FormField></View>
        </BottomSheet>
      ) : null}

      {endingWorker ? (
        <BottomSheet visible showCloseButton={false} title="End assignment?" description={`${endingWorker.name} remains an active Worker and the allocation history is preserved.`} onClose={() => setEndingWorker(null)} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={() => setEndingWorker(null)} /><Button label={isSubmitting ? 'Ending…' : 'End assignment'} variant="danger" disabled={isSubmitting} style={styles.footerButton} onPress={() => void endAssignment()} /></>}>
          <FormField label="Ends on" helperText="YYYY-MM-DD"><Input accessibilityLabel="Assignment end date" value={endForm.endsOn} onChangeText={(endsOn) => setEndForm({ ...endForm, endsOn })} /></FormField>
          <FormField label="Reason" helperText="Optional"><Input accessibilityLabel="Reason" value={endForm.reason} onChangeText={(reason) => setEndForm({ ...endForm, reason })} /></FormField>
        </BottomSheet>
      ) : null}
    </View>
  );
}

function CreateWorkerSheet({ organizationId, projectId, accessToken, saving, onClose, onSaving, onSaved }: { organizationId: string; projectId: string; accessToken: string; saving: boolean; onClose: () => void; onSaving: (saving: boolean) => void; onSaved: () => Promise<void> }) {
  const [form, setForm] = useState({ name: '', trade: '', mobileNumber: '', dailyRate: '' });
  const [duplicates, setDuplicates] = useState<WorkerDuplicateCandidate[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setError('');
    if (!form.name.trim() || !form.trade.trim()) {
      setError('Enter a name and trade to continue.');
      return;
    }
    onSaving(true);
    try {
      const candidates = await fetchWorkerDuplicateCandidates(organizationId, accessToken, form);
      setDuplicates(candidates);
      if (candidates.length && !acknowledged) {
        setError('Possible duplicates found. Review and confirm before saving.');
        return;
      }
      await createWorker(organizationId, accessToken, { name: form.name.trim(), trade: form.trade.trim(), mobileNumber: form.mobileNumber.trim() || null, dailyRate: form.dailyRate.trim() || null, projectId, startsOn: today(), acknowledgeDuplicateWarning: acknowledged });
      await onSaved();
    } catch (createError) {
      setError(isNetworkFailure(createError) ? 'Worker changes are online-only. Reconnect and try again.' : errorMessage(createError));
    } finally {
      onSaving(false);
    }
  }

  return (
    <BottomSheet visible scroll showCloseButton={false} title="New worker" description="Create the record and add it to this project." onClose={onClose} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={onClose} /><Button label={saving ? 'Creating…' : 'Create & assign'} disabled={saving} style={styles.footerButton} onPress={() => void submit()} /></>}>
      <FormField label="Name"><Input accessibilityLabel="Worker name" value={form.name} onChangeText={(name) => { setForm({ ...form, name }); setAcknowledged(false); }} /></FormField>
      <FormField label="Trade"><Input accessibilityLabel="Worker trade" value={form.trade} onChangeText={(trade) => setForm({ ...form, trade })} /><View style={styles.suggestions}>{TRADE_SUGGESTIONS.map((trade) => { const selected = form.trade === trade; return <Pressable key={trade} accessibilityRole="radio" accessibilityState={{ checked: selected }} style={({ pressed }) => [styles.suggestion, selected && styles.suggestionSelected, pressed && styles.controlPressed]} onPress={() => setForm({ ...form, trade })}><Text style={[styles.suggestionText, selected && styles.suggestionTextSelected]}>{trade}</Text></Pressable>; })}</View></FormField>
      <FormField label="Mobile" helperText="Optional"><Input accessibilityLabel="Worker mobile number" keyboardType="phone-pad" value={form.mobileNumber} onChangeText={(mobileNumber) => { setForm({ ...form, mobileNumber }); setAcknowledged(false); }} /></FormField>
      <FormField label="Rate" helperText="Base daily rate used for new allocations."><Input accessibilityLabel="Base daily rate" keyboardType="numeric" value={form.dailyRate} onChangeText={(dailyRate) => setForm({ ...form, dailyRate })} /></FormField>
      {duplicates.length ? <Card variant="blueprint" style={styles.duplicates}><Text style={styles.name}>Possible duplicates</Text>{duplicates.map((candidate) => <Text key={candidate.id} style={styles.body}>{candidate.workerCode} · {candidate.name} · {candidate.trade}</Text>)}<Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acknowledged }} style={[styles.acknowledge, acknowledged && styles.acknowledgeSelected]} onPress={() => setAcknowledged((current) => !current)}><AppIcon name={acknowledged ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={22} color={acknowledged ? mobileTheme.color.text.inverse : mobileTheme.color.text.primary} /><Text style={[styles.body, acknowledged && styles.acknowledgeText]}>Continue with this Worker record</Text></Pressable></Card> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </BottomSheet>
  );
}

function formatDateRange(startsOn: string, endsOn: string | null) {
  return `${startsOn.slice(0, 10)} → ${endsOn?.slice(0, 10) ?? 'ongoing'}`;
}

function formatRate(rate: string | null | undefined) {
  if (!rate) return 'Not set';
  const amount = Number(rate);
  if (!Number.isFinite(amount)) return `${rate}/day`;
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}/day`;
}

function isDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
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
  dateRow: { flexDirection: 'row', gap: mobileTheme.spacing[3] },
  dateField: { flex: 1 },
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
  errorText: { ...mobileText.caption, color: mobileTheme.color.status.danger.foreground },
});
