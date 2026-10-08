
import { RefreshButton } from "../../components/ui/refresh-button";
import { mobileTheme } from '../../theme';
import { FOLLOW_UP_STATUSES, type FollowUpStatus } from '@nirman-app/shared';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheet, Button, DateInput, FormError, FormField, Input, TimeInput } from '../../components/ui';
import { ApiRequestError } from '../../lib/api';
import { getLocalizedErrorMessage } from '../../i18n';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useSession } from '../../providers';
import { canWriteLead, localTime, scheduleInstant, uncertainWrite } from './sales-rules';
import { fetchFollowUps, fetchLead, updateFollowUp } from './services';
import { SalesChoice } from './sales-ui';
import type { SalesFollowUp } from './types';

export function FollowUpUpdateSheet({ item, complete, close, saved }: { item: SalesFollowUp; complete: boolean; close: () => void; saved: () => void }) {
  const { t } = useTranslation('sales');
  const { t: common } = useTranslation('common');
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const timezone = session?.activeOrganization?.workingTimezone || session?.activeOrganization?.timezone || 'Asia/Kolkata';
  const initialTime = item.nextFollowUpAt ? localTime(item.nextFollowUpAt, timezone) : '';
  const [status, setStatus] = useState<FollowUpStatus>(complete ? 'COMPLETED' : item.status);
  const [outcome, setOutcome] = useState(item.outcome ?? '');
  const [notes, setNotes] = useState(item.notes ?? '');
  const [date, setDate] = useState(initialTime.slice(0, 10));
  const [time, setTime] = useState(initialTime.slice(11) || '10:00');
  const [working, setWorking] = useState(false);
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false), alive = useRef(true), snapshot = useRef(item);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function currentRecord() {
    if (!session?.activeOrganization || !project) throw new Error(t('noProject.description'));
    const current = (await fetchFollowUps(session.activeOrganization.id, project.id, session.accessToken)).find(row => row.id === item.id);
    if (!current) throw new Error(t('parity.stale'));
    return current;
  }
  async function refresh() {
    if (lock.current) return;
    lock.current = true; setWorking(true);
    try { const current = await currentRecord(); if (alive.current) { snapshot.current = current; setReview(false); setError(''); } }
    catch (cause) { if (alive.current) setError(getLocalizedErrorMessage(cause, t('errors.load'))); }
    finally { lock.current = false; if (alive.current) setWorking(false); }
  }
  async function submit() {
    if (lock.current || review || !session?.activeOrganization || !project || project.status !== 'ACTIVE') return;
    const next = date ? scheduleInstant(`${date}T${time}`, timezone) : undefined;
    if (date && !next) { setError(common('validation.date')); return; }
    lock.current = true; setWorking(true); setError('');
    try {
      const lead = await fetchLead(session.activeOrganization.id, project.id, item.leadId, session.accessToken);
      const current = await currentRecord();
      if (!alive.current) return;
      if (!canWriteLead(permissions, true, 'followups:manage', lead, session.user.id)) throw new Error(t('parity.accessDenied'));
      if (JSON.stringify(current) !== JSON.stringify(snapshot.current)) { setReview(true); throw new Error(t('parity.stale')); }
      await updateFollowUp(session.activeOrganization.id, project.id, item.leadId, item.id, session.accessToken, { status, outcome: outcome.trim() || undefined, notes: notes.trim() || undefined, nextFollowUpAt: next || undefined });
      if (alive.current) saved();
    } catch (cause) {
      if (alive.current) { if (uncertainWrite(cause instanceof ApiRequestError ? cause.status : undefined)) setReview(true); setError(getLocalizedErrorMessage(cause, t('parity.uncertain'))); }
    } finally { lock.current = false; if (alive.current) setWorking(false); }
  }
  function requestClose() {
    if (lock.current) return;
    Alert.alert(t('parity.discardTitle'), review ? t('parity.uncertain') : t('parity.discardDescription'), [{ text: common('actions.cancel'), style: 'cancel' }, { text: common('actions.close'), style: 'destructive', onPress: close }]);
  }
  return <BottomSheet visible scroll title={complete ? t('followUps.completeTitle') : t('parity.update')} showCloseButton={false} onClose={requestClose} footer={<><Button label={common('actions.cancel')} variant="secondary" disabled={working} onPress={requestClose} /><Button label={working ? t('saving') : t('save')} disabled={working || review || project?.status !== 'ACTIVE'} onPress={() => void submit()} /></>}>
    <FormError message={error} />
    {review ? <RefreshButton label={t('refresh')} variant="secondary" disabled={working} onRefresh={() => refresh()} /> : null}
    <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working ? 'none' : 'auto'}>
      <FormField label={t('parity.status')}>{FOLLOW_UP_STATUSES.map(value => <SalesChoice key={value} label={t(`followUpStatus.${value}`)} selected={status === value} onPress={() => setStatus(value)} />)}</FormField>
      <FormField label={t('fields.outcome')}><Input multiline maxLength={4000} value={outcome} onChangeText={setOutcome} /></FormField>
      <FormField label={t('fields.notes')}><Input multiline maxLength={4000} value={notes} onChangeText={setNotes} /></FormField>
      <FormField label={t('parity.nextTime')} helperText={t('parity.nextTimeHelp')}><DateInput accessibilityLabel={t('fields.date')} value={date} onChangeText={setDate} /><TimeInput accessibilityLabel={t('fields.time')} value={time} onChangeText={setTime} /></FormField>
    </View>
  </BottomSheet>;
}
