import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  GradientScreen,
  Header,
  Input,
  LoadingState,
} from '../../components/ui';
import { getActiveProject } from '../../lib/auth';
import { ApiRequestError } from '../../lib/api';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import {
  createWorker,
  fetchProjectWorkers,
  fetchWorkerDuplicateCandidates,
} from './services';
import type { ProjectWorkerRosterItem, WorkerDuplicateCandidate } from './types';

const TRADE_SUGGESTIONS = [
  'Mason',
  'Helper',
  'Carpenter',
  'Plumber',
  'Electrician',
  'Painter',
];

export function WorkersScreen() {
  const { refreshSession, session, signOut } = useSession();
  const activeProject = getActiveProject(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = activeProject?.id ?? null;
  const canCreate = session?.permissions.includes('workers:create') ?? false;
  const canAssign = session?.permissions.includes('workers:assign-project') ?? false;
  const [workers, setWorkers] = useState<ProjectWorkerRosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [availabilityMessage, setAvailabilityMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [duplicates, setDuplicates] = useState<WorkerDuplicateCandidate[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [form, setForm] = useState({
    name: '',
    trade: '',
    mobileNumber: '',
    dailyRate: '',
  });
  const hasLoadedRoster = useRef(false);

  const loadWorkers = useCallback(async () => {
    if (!session?.accessToken || !organizationId || !projectId) return;
    setIsLoading(true);
    setError('');
    setAvailabilityMessage('');
    try {
      const response = await fetchProjectWorkers(
        organizationId,
        projectId,
        session.accessToken,
      );
      setWorkers(response.data);
      hasLoadedRoster.current = true;
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
        ? hasLoadedRoster.current
          ? 'Unable to refresh. Showing the roster already loaded on this screen; changes still require a connection.'
          : 'Workers are unavailable without a connection. A persisted offline roster cache is not available yet.'
        : loadError instanceof Error
          ? loadError.message
          : 'Unable to load workers';
      if (hasLoadedRoster.current) setAvailabilityMessage(message);
      else setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, projectId, refreshSession, session?.accessToken, signOut]);

  useEffect(() => {
    void loadWorkers();
  }, [loadWorkers]);

  async function checkDuplicates() {
    if (!session?.accessToken || !organizationId) return [];
    const candidates = await fetchWorkerDuplicateCandidates(
      organizationId,
      session.accessToken,
      form,
    );
    setDuplicates(candidates);
    return candidates;
  }

  async function reviewDuplicates() {
    setIsSubmitting(true);
    try {
      await checkDuplicates();
    } catch (duplicateError) {
      if (duplicateError instanceof ApiRequestError && duplicateError.status === 401) {
        await signOut();
        return;
      }
      const message = isNetworkFailure(duplicateError)
        ? 'Duplicate checking requires a connection. No worker has been saved.'
        : duplicateError instanceof Error
          ? duplicateError.message
          : 'Unable to check duplicates';
      setAvailabilityMessage(message);
      Alert.alert('Duplicate check unavailable', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submit() {
    if (!session?.accessToken || !organizationId || !projectId) return;
    if (!form.name.trim() || !form.trade.trim()) {
      Alert.alert('Required fields', 'Worker name and trade are required.');
      return;
    }
    setIsSubmitting(true);
    setAvailabilityMessage('');
    try {
      const candidates = await checkDuplicates();
      if (candidates.length > 0 && !acknowledged) {
        Alert.alert('Possible duplicate', 'Review and acknowledge duplicate warnings first.');
        return;
      }
      await createWorker(organizationId, session.accessToken, {
        name: form.name.trim(),
        trade: form.trade.trim(),
        mobileNumber: form.mobileNumber || null,
        projectId,
        dailyRate: form.dailyRate || null,
        startsOn: new Date().toISOString().slice(0, 10),
        acknowledgeDuplicateWarning: acknowledged,
      });
      setForm({ name: '', trade: '', mobileNumber: '', dailyRate: '' });
      setDuplicates([]);
      setAcknowledged(false);
      setShowForm(false);
      await loadWorkers();
    } catch (submitError) {
      if (submitError instanceof ApiRequestError && submitError.status === 401) {
        await signOut();
        return;
      }
      const message = isNetworkFailure(submitError)
        ? 'Worker changes are online-only. Reconnect and try again; no change was queued.'
        : submitError instanceof Error
          ? submitError.message
          : 'Unable to save worker';
      setAvailabilityMessage(message);
      Alert.alert('Worker not saved', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!activeProject || !organizationId) {
    return (
      <GradientScreen>
        <Header
          eyebrow="Workers"
          title="Select a Project"
          subtitle="Workers are managed inside the active project context."
        />
        <EmptyState title="No active project" description="Choose an active project before opening Workers." />
      </GradientScreen>
    );
  }

  return (
    <GradientScreen>
      <Header
        eyebrow={activeProject.name}
        title="Workers"
        subtitle="Project roster for Attendance, Wages, and Kharchi later."
      />

      {availabilityMessage ? (
        <Card style={styles.notice}>
          <Text style={styles.noticeText}>{availabilityMessage}</Text>
        </Card>
      ) : null}

      {canCreate && canAssign ? (
        <Button
          label={showForm ? 'Close Add Worker' : 'Add Worker'}
          variant={showForm ? 'outline' : 'primary'}
          onPress={() => setShowForm((current) => !current)}
        />
      ) : null}

      {showForm ? (
        <Card style={styles.form}>
          <Input
            placeholder="Worker name"
            value={form.name}
            onChangeText={(name) => {
              setForm({ ...form, name });
              setAcknowledged(false);
            }}
          />
          <Input
            placeholder="Trade or worker type"
            value={form.trade}
            onChangeText={(trade) => setForm({ ...form, trade })}
          />
          <View style={styles.suggestions}>
            {TRADE_SUGGESTIONS.map((trade) => (
              <Pressable
                key={trade}
                style={styles.suggestion}
                onPress={() => setForm({ ...form, trade })}
              >
                <Text style={styles.suggestionText}>{trade}</Text>
              </Pressable>
            ))}
          </View>
          <Input
            placeholder="Mobile number"
            keyboardType="phone-pad"
            value={form.mobileNumber}
            onChangeText={(mobileNumber) => {
              setForm({ ...form, mobileNumber });
              setAcknowledged(false);
            }}
          />
          <Input
            placeholder="Daily rate"
            keyboardType="numeric"
            value={form.dailyRate}
            onChangeText={(dailyRate) => setForm({ ...form, dailyRate })}
          />

          {duplicates.length > 0 ? (
            <Card variant="blueprint" style={styles.duplicates}>
              <Text style={styles.cardTitle}>Possible duplicates</Text>
              {duplicates.map((candidate) => (
                <Text key={candidate.id} style={styles.body}>
                  {candidate.workerCode} / {candidate.name} / {candidate.trade}
                </Text>
              ))}
              <Pressable
                style={[styles.ack, acknowledged && styles.ackSelected]}
                onPress={() => setAcknowledged((current) => !current)}
              >
                <Text style={styles.ackText}>Continue with this record</Text>
              </Pressable>
            </Card>
          ) : null}

          <View style={styles.formActions}>
            <Button
              label="Check Duplicates"
              variant="outline"
              disabled={isSubmitting}
              onPress={() => void reviewDuplicates()}
            />
            <Button
              label={isSubmitting ? 'Saving' : 'Save Worker'}
              disabled={isSubmitting}
              onPress={() => void submit()}
            />
          </View>
        </Card>
      ) : null}

      {isLoading ? (
        <LoadingState label="Loading workers" />
      ) : error ? (
        <EmptyState title="Unable to load workers" description={error} actionLabel="Retry" onAction={loadWorkers} />
      ) : workers.length === 0 ? (
        <EmptyState title="No workers yet" description="Add workers when you are online and assigned to this project." />
      ) : (
        <View style={styles.list}>
          {workers.map((worker) => (
            <Card key={worker.currentAssignment.id} style={styles.workerCard}>
              <View style={styles.workerHeader}>
                <View>
                  <Text style={styles.code}>{worker.workerCode}</Text>
                  <Text style={styles.name}>{worker.name}</Text>
                </View>
                <Text style={styles.status}>{worker.currentAssignment.status}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.body}>{worker.trade}</Text>
                <Text style={styles.body}>
                  Rate {worker.currentAssignment.dailyRate ?? 'not set'}
                </Text>
              </View>
              <Text style={styles.subtle}>{worker.mobileNumber ?? 'No mobile number'}</Text>
            </Card>
          ))}
        </View>
      )}
    </GradientScreen>
  );
}

const styles = StyleSheet.create({
  notice: {
    backgroundColor: mobileTheme.color.status.warning.background,
  },
  noticeText: {
    ...mobileText.body,
    color: mobileTheme.color.status.warning.foreground,
  },
  form: {
    gap: mobileTheme.spacing[3],
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[2],
  },
  suggestion: {
    backgroundColor: mobileTheme.color.surface.raised,
    borderRadius: mobileTheme.radius.full,
    paddingHorizontal: mobileTheme.spacing[3],
    paddingVertical: mobileTheme.spacing[2],
  },
  suggestionText: {
    ...mobileText.caption,
    color: mobileTheme.color.text.primary,
  },
  duplicates: {
    gap: mobileTheme.spacing[2],
  },
  cardTitle: {
    ...mobileText.sectionTitle,
    fontSize: 18,
  },
  body: {
    ...mobileText.body,
  },
  ack: {
    borderColor: mobileTheme.color.border.default,
    borderRadius: mobileTheme.radius.full,
    borderWidth: 1,
    padding: mobileTheme.spacing[3],
  },
  ackSelected: {
    backgroundColor: mobileTheme.color.action.primary,
  },
  ackText: {
    ...mobileText.label,
    color: mobileTheme.color.text.primary,
    textAlign: 'center',
  },
  formActions: {
    gap: mobileTheme.spacing[3],
  },
  list: {
    gap: mobileTheme.spacing[3],
  },
  workerCard: {
    gap: mobileTheme.spacing[3],
  },
  workerHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  code: {
    ...mobileText.caption,
    color: mobileTheme.color.action.primary,
    fontFamily: 'Manrope_700Bold',
  },
  name: {
    ...mobileText.sectionTitle,
  },
  status: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  subtle: {
    ...mobileText.caption,
    color: mobileTheme.color.text.secondary,
  },
});

function isNetworkFailure(error: unknown) {
  return (
    error instanceof TypeError ||
    (error instanceof Error &&
      /network request failed|failed to fetch|network error/i.test(error.message))
  );
}
