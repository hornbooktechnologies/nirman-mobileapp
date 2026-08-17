import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppIcon,
  Badge,
  BottomSheet,
  Button,
  Card,
  EmptyState,
  FormField,
  GradientScreen,
  Header,
  IconButton,
  Input,
  LoadingState,
} from '../../components/ui';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { ApiRequestError } from '../../lib/api';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
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
    <GradientScreen>
      <Header
        eyebrow={activeProject?.name ?? 'Workers'}
        title="Project Workers"
        subtitle="Assign organization workers to the selected project and maintain allocation dates."
      />
      <WorkersPanel />
    </GradientScreen>
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
    return (
      !needle ||
      worker.name.toLowerCase().includes(needle) ||
      worker.workerCode.toLowerCase().includes(needle) ||
      worker.trade.toLowerCase().includes(needle)
    );
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
      <Input accessibilityLabel="Search organization workers" placeholder="Search code, name or trade" value={search} onChangeText={setSearch} />

      {isLoading ? <LoadingState label="Loading organization workers" /> : null}
      {error ? <EmptyState title="Unable to load workers" description={error} actionLabel="Retry" onAction={() => void loadWorkers()} /> : null}
      {!isLoading && !error ? (
        visibleWorkers.length ? (
          <View style={styles.list}>
            {visibleWorkers.map((worker) => {
              const assignedWorker = rosterByWorkerId.get(worker.id);
              return (
                <Card key={worker.id} style={styles.workerCard}>
                  <View style={styles.workerHeader}>
                    <View style={styles.workerCopy}>
                      <Text style={styles.code}>{worker.workerCode}</Text>
                      <Text style={styles.name}>{worker.name}</Text>
                    </View>
                    {assignedWorker && canAssign ? (
                      <IconButton icon="dots-horizontal" accessibilityLabel={`Actions for ${worker.name}`} variant="ghost" onPress={() => setActionWorker(assignedWorker)} />
                    ) : null}
                  </View>
                  <View style={styles.badges}>
                    <Badge label={worker.trade} tone="neutral" />
                    <Badge label={assignedWorker ? 'ASSIGNED' : 'UNASSIGNED'} tone={assignedWorker ? 'active' : 'warning'} />
                  </View>
                  <Text style={styles.body}>Daily rate {worker.baseDailyRate ?? 'not set'}</Text>
                  {assignedWorker ? (
                    <Text style={styles.subtle}>Allocation {formatDateRange(assignedWorker.currentAssignment.startsOn, assignedWorker.currentAssignment.endsOn)}</Text>
                  ) : canAssign ? (
                    <Button label="Assign" variant="outline" onPress={() => { setAssigningWorker(worker); setAssignStartsOn(today()); }} />
                  ) : null}
                </Card>
              );
            })}
          </View>
        ) : <EmptyState title={search ? 'No matching workers' : 'No active workers'} description={search ? 'Try another search.' : 'Add a worker to this organization when you are online.'} />
      ) : null}

      {showCreate ? <CreateWorkerSheet organizationId={organizationId} projectId={projectId} accessToken={session.accessToken} saving={isSubmitting} onClose={() => setShowCreate(false)} onSaving={setIsSubmitting} onSaved={async () => { setShowCreate(false); await loadWorkers(); }} /> : null}

      {assigningWorker ? (
        <BottomSheet visible showCloseButton={false} title={`Assign ${assigningWorker.name}`} description="Trade and daily rate come from the Worker record. Choose only when this project allocation starts." onClose={() => setAssigningWorker(null)} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={() => setAssigningWorker(null)} /><Button label={isSubmitting ? 'Assigning' : 'Assign worker'} disabled={isSubmitting} style={styles.footerButton} onPress={() => void assign()} /></>}>
          <Card variant="blueprint" style={styles.assignmentSummary}><Text style={styles.body}>Trade: {assigningWorker.trade}</Text><Text style={styles.body}>Daily rate: {assigningWorker.baseDailyRate ?? 'Not set'}</Text></Card>
          <FormField label="Assignment start date" helperText="YYYY-MM-DD"><Input accessibilityLabel="Assignment start date" placeholder="YYYY-MM-DD" value={assignStartsOn} onChangeText={setAssignStartsOn} /></FormField>
        </BottomSheet>
      ) : null}

      {actionWorker ? (
        <BottomSheet visible title={actionWorker.name} description={`${actionWorker.trade} · Assigned`} onClose={() => setActionWorker(null)}>
          <ActionRow icon="calendar-edit" label="Edit assignment dates" onPress={() => openEdit(actionWorker)} />
          <ActionRow icon="account-minus-outline" label="End project assignment" destructive onPress={() => { setActionWorker(null); setEndingWorker(actionWorker); setEndForm({ endsOn: today(), reason: '' }); }} />
        </BottomSheet>
      ) : null}

      {editingWorker ? (
        <BottomSheet visible showCloseButton={false} title={`Update ${editingWorker.name}`} description="Update allocation dates only. Trade and daily rate stay on the Worker record." onClose={() => setEditingWorker(null)} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={() => setEditingWorker(null)} /><Button label={isSubmitting ? 'Saving' : 'Save dates'} disabled={isSubmitting} style={styles.footerButton} onPress={() => void saveEdit()} /></>}>
          <View style={styles.dateRow}><FormField label="Start date" helperText="YYYY-MM-DD" style={styles.dateField}><Input accessibilityLabel="Start date" value={editForm.startsOn} onChangeText={(startsOn) => setEditForm({ ...editForm, startsOn })} /></FormField><FormField label="End date" helperText="Optional" style={styles.dateField}><Input accessibilityLabel="End date" value={editForm.endsOn} onChangeText={(endsOn) => setEditForm({ ...editForm, endsOn })} /></FormField></View>
        </BottomSheet>
      ) : null}

      {endingWorker ? (
        <BottomSheet visible showCloseButton={false} title={`End ${endingWorker.name} assignment?`} description="Assignment history remains available and the Worker stays active in the organization." onClose={() => setEndingWorker(null)} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={() => setEndingWorker(null)} /><Button label={isSubmitting ? 'Ending' : 'End assignment'} variant="danger" disabled={isSubmitting} style={styles.footerButton} onPress={() => void endAssignment()} /></>}>
          <FormField label="Assignment end date" helperText="YYYY-MM-DD"><Input accessibilityLabel="Assignment end date" value={endForm.endsOn} onChangeText={(endsOn) => setEndForm({ ...endForm, endsOn })} /></FormField>
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
      setError('Worker name and trade are required.');
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
    <BottomSheet visible scroll showCloseButton={false} title="Add new worker" description="Create the organization Worker record and assign it to this project." onClose={onClose} footer={<><Button label="Cancel" variant="secondary" style={styles.footerButton} onPress={onClose} /><Button label={saving ? 'Saving' : 'Save worker'} disabled={saving} style={styles.footerButton} onPress={() => void submit()} /></>}>
      <FormField label="Worker name"><Input accessibilityLabel="Worker name" value={form.name} onChangeText={(name) => { setForm({ ...form, name }); setAcknowledged(false); }} /></FormField>
      <FormField label="Trade"><Input accessibilityLabel="Trade" value={form.trade} onChangeText={(trade) => setForm({ ...form, trade })} /><View style={styles.suggestions}>{TRADE_SUGGESTIONS.map((trade) => <Pressable key={trade} accessibilityRole="button" style={styles.suggestion} onPress={() => setForm({ ...form, trade })}><Text style={styles.suggestionText}>{trade}</Text></Pressable>)}</View></FormField>
      <FormField label="Mobile number" helperText="Optional"><Input accessibilityLabel="Mobile number" keyboardType="phone-pad" value={form.mobileNumber} onChangeText={(mobileNumber) => { setForm({ ...form, mobileNumber }); setAcknowledged(false); }} /></FormField>
      <FormField label="Base daily rate" helperText="Stored on the Worker record and copied into new project assignments."><Input accessibilityLabel="Base daily rate" keyboardType="numeric" value={form.dailyRate} onChangeText={(dailyRate) => setForm({ ...form, dailyRate })} /></FormField>
      {duplicates.length ? <Card variant="blueprint" style={styles.duplicates}><Text style={styles.name}>Possible duplicates</Text>{duplicates.map((candidate) => <Text key={candidate.id} style={styles.body}>{candidate.workerCode} · {candidate.name} · {candidate.trade}</Text>)}<Pressable accessibilityRole="checkbox" accessibilityState={{ checked: acknowledged }} style={[styles.acknowledge, acknowledged && styles.acknowledgeSelected]} onPress={() => setAcknowledged((current) => !current)}><AppIcon name={acknowledged ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'} size={22} color={acknowledged ? mobileTheme.color.text.inverse : mobileTheme.color.text.primary} /><Text style={[styles.body, acknowledged && styles.acknowledgeText]}>Continue with this Worker record</Text></Pressable></Card> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </BottomSheet>
  );
}

function ActionRow({ icon, label, destructive = false, onPress }: { icon: Parameters<typeof AppIcon>[0]['name']; label: string; destructive?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" style={styles.actionRow} onPress={onPress}><AppIcon name={icon} size={24} color={destructive ? mobileTheme.color.status.danger.foreground : mobileTheme.color.text.primary} /><Text style={[styles.actionLabel, destructive && styles.destructive]}>{label}</Text><AppIcon name="chevron-right" size={22} color={mobileTheme.color.text.muted} /></Pressable>;
}

function formatDateRange(startsOn: string, endsOn: string | null) {
  return `${startsOn.slice(0, 10)} to ${endsOn?.slice(0, 10) ?? 'ongoing'}`;
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
  panel: { gap: mobileTheme.spacing[4] },
  embeddedPanel: { paddingTop: mobileTheme.spacing[1] },
  toolbar: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3] },
  toolbarCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  sectionTitle: { ...mobileText.sectionTitle, fontSize: 20 },
  notice: { backgroundColor: mobileTheme.color.status.warning.background },
  noticeText: { ...mobileText.body, color: mobileTheme.color.status.warning.foreground },
  list: { gap: mobileTheme.spacing[3] },
  workerCard: { gap: mobileTheme.spacing[3] },
  workerHeader: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3] },
  workerCopy: { flex: 1, gap: mobileTheme.spacing[1] },
  code: { ...mobileText.caption, color: mobileTheme.color.action.primary, fontFamily: 'Manrope_700Bold' },
  name: { ...mobileText.sectionTitle, fontSize: 18 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  body: { ...mobileText.body },
  subtle: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  assignmentSummary: { gap: mobileTheme.spacing[2] },
  footerButton: { flex: 1 },
  dateRow: { flexDirection: 'row', gap: mobileTheme.spacing[3] },
  dateField: { flex: 1 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  suggestion: { backgroundColor: mobileTheme.color.surface.raised, borderRadius: mobileTheme.radius.full, minHeight: 44, justifyContent: 'center', paddingHorizontal: mobileTheme.spacing[3] },
  suggestionText: { ...mobileText.caption, color: mobileTheme.color.text.primary },
  duplicates: { gap: mobileTheme.spacing[2] },
  acknowledge: { alignItems: 'center', borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.lg, borderWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[2], minHeight: 52, padding: mobileTheme.spacing[3] },
  acknowledgeSelected: { backgroundColor: mobileTheme.color.navigation.floating },
  acknowledgeText: { color: mobileTheme.color.text.inverse },
  errorText: { ...mobileText.caption, color: mobileTheme.color.status.danger.foreground },
  actionRow: { alignItems: 'center', borderBottomColor: mobileTheme.color.border.subtle, borderBottomWidth: 1, flexDirection: 'row', gap: mobileTheme.spacing[3], minHeight: 60, paddingVertical: mobileTheme.spacing[2] },
  actionLabel: { ...mobileText.label, color: mobileTheme.color.text.primary, flex: 1, fontSize: 16 },
  destructive: { color: mobileTheme.color.status.danger.foreground },
});
