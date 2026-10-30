import type { AttendanceException } from '@nirman-app/shared';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from 'react-native';
import { BottomSheet, Button, FormError, AppText } from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { useLocalization, useSession } from '../../providers';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { AttendanceExceptionSheet } from './attendance-exception-sheet';
import { removeAttendanceException, updateAttendanceException } from './services';

export function AttendanceHistoryCorrection({ exception, mode, worker, onClose, onSaved }: {
  exception: AttendanceException;
  mode: 'edit' | 'restore';
  worker: { id: string; name: string; workerCode: string; trade: string };
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { t } = useTranslation('attendance');
  const { t: common } = useTranslation('common');
  const { locale } = useLocalization();
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const allowed = session?.activeOrganization?.id === exception.organizationId && project?.id === exception.projectId && permissions.includes('attendance:read') && permissions.includes('attendance:update');
  const [draft, setDraft] = useState({ duration: exception.duration, reasonCode: exception.reasonCode ?? '', notes: exception.notes ?? '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  async function save() {
    if (!allowed || !session || locked.current) return;
    locked.current = true; setSaving(true); setError('');
    try {
      if (mode === 'restore') await removeAttendanceException(exception.organizationId, exception.projectId, exception.id, session.accessToken);
      else await updateAttendanceException(exception.organizationId, exception.projectId, exception.id, { duration: draft.duration, reasonCode: draft.reasonCode.trim() || null, notes: draft.notes.trim() || null }, session.accessToken);
      if (alive.current) { onClose(); await onSaved(); }
    } catch (cause) { if (alive.current) setError(getLocalizedErrorMessage(cause, t('errors.notSaved'))); }
    finally { locked.current = false; if (alive.current) setSaving(false); }
  }
  const close = () => {
    if (locked.current) return;
    const dirty = draft.duration !== exception.duration || draft.reasonCode !== (exception.reasonCode ?? '') || draft.notes !== (exception.notes ?? '');
    if (dirty) Alert.alert(t('sheet.discardTitle'), t('sheet.discardMessage'), [
      { text: common('actions.cancel'), style: 'cancel' },
      { text: t('actions.discard'), style: 'destructive', onPress: onClose },
    ]);
    else onClose();
  };
  if (mode === 'edit') return <AttendanceExceptionSheet canSave={Boolean(allowed)} date={exception.workDate} draft={draft} error={error} locale={locale ?? 'en'} projectName={project?.name ?? ''} row={{ worker, workerAssignmentId: exception.workerAssignmentId, expectedWorkingDays: 0, presentDays: 0, absentDays: 0, selectedDate: { date: exception.workDate, state: exception.duration === 'FULL_DAY' ? 'ABSENT' : 'HALF_DAY', exception } }} saving={saving} onChange={setDraft} onClose={close} onSave={() => void save()} />;
  return <BottomSheet visible title={t('remove.title')} description={`${worker.name} · ${exception.workDate}`} onClose={close} showCloseButton={false} footer={<>
    <Button variant="secondary" label={common('actions.cancel')} disabled={saving} onPress={close} />
    <Button label={t('actions.restorePresent')} loading={saving} disabled={saving || !allowed} onPress={() => void save()} />
  </>}><FormError message={error} /><AppText>{t('remove.message')}</AppText></BottomSheet>;
}
