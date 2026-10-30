import type { WorkerDetail } from '@nirman-app/shared';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, BottomSheet, Button, FormError, FormField, Input, Toggle } from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { isValidPhone, sanitizePhoneInput } from '../../lib/validation';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { deactivateWorker, deleteWorker, fetchWorkerDuplicateCandidates, updateWorker } from './services';

export function WorkerProfileActions({ worker, permissions, onSaved, onDeleted }: { worker: WorkerDetail; permissions: readonly string[]; onSaved: (worker: WorkerDetail) => void; onDeleted: () => void }) {
  const { t } = useTranslation('workers');
  const { t: common } = useTranslation('common');
  const { session } = useSession();
  const [mode, setMode] = useState<'edit' | 'delete' | 'deactivate' | null>(null);
  const [form, setForm] = useState({ name: worker.name, trade: worker.trade, mobile: worker.mobileNumber ?? '', rate: worker.baseDailyRate ?? '', notes: worker.notes ?? '' });
  const [acknowledged, setAcknowledged] = useState(false);
  const [duplicates, setDuplicates] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const canEdit = permissions.includes('workers:update');
  const canDeactivate = worker.status === 'ACTIVE' && permissions.includes('workers:deactivate');
  // Permanent deletion is an organization capability, never a project custom grant.
  const canDelete = session?.permissions.includes('workers:delete');
  const open = (next: 'edit' | 'delete' | 'deactivate') => {
    setError(''); setReason(''); setDuplicates([]); setAcknowledged(false);
    setForm({ name: worker.name, trade: worker.trade, mobile: worker.mobileNumber ?? '', rate: worker.baseDailyRate ?? '', notes: worker.notes ?? '' });
    setMode(next);
  };
  async function save() {
    if (lock.current || !session?.activeOrganization || !canEdit) return;
    if (!form.name.trim() || !form.trade.trim() || (form.mobile && !isValidPhone(form.mobile)) || (form.rate !== '' && (!/^\d+(\.\d{1,2})?$/.test(form.rate) || !Number.isFinite(Number(form.rate))))) { setError(t('profile.invalid')); return; }
    lock.current = true; setSaving(true); setError('');
    try {
      const candidates = (await fetchWorkerDuplicateCandidates(session.activeOrganization.id, session.accessToken, { name: form.name.trim(), mobileNumber: form.mobile || null })).filter(item => item.id !== worker.id);
      setDuplicates(candidates.map(item => item.name));
      if (candidates.length && !acknowledged) { setError(t('profile.duplicate')); return; }
      const result = await updateWorker(session.activeOrganization.id, worker.id, session.accessToken, { name: form.name.trim(), trade: form.trade.trim(), mobileNumber: form.mobile.trim() || null, dailyRate: form.rate === '' ? null : Number(form.rate), notes: form.notes.trim() || null, acknowledgeDuplicateWarning: acknowledged });
      setMode(null); onSaved(result);
    } catch (reason) { setError(getLocalizedErrorMessage(reason, t('profile.failed'))); }
    finally { lock.current = false; setSaving(false); }
  }
  async function deactivate() {
    if (lock.current || !canDeactivate || !session?.activeOrganization) return;
    lock.current = true; setSaving(true); setError('');
    try { const result = await deactivateWorker(session.activeOrganization.id, worker.id, session.accessToken, reason.trim() || null); setMode(null); onSaved(result); }
    catch (failure) { setError(getLocalizedErrorMessage(failure, t('profile.failed'))); }
    finally { lock.current = false; setSaving(false); }
  }
  async function remove() {
    if (lock.current || !canDelete || !session?.activeOrganization) return;
    lock.current = true; setSaving(true); setError('');
    try { await deleteWorker(session.activeOrganization.id, worker.id, session.accessToken); setMode(null); onDeleted(); }
    catch (reason) { setError(getLocalizedErrorMessage(reason, t('profile.failed'))); }
    finally { lock.current = false; setSaving(false); }
  }
  return <View style={{ gap: mobileTheme.spacing[3] }}>
    <AppText style={mobileText.body}>{t('profile.status')}: {t(worker.status === 'ACTIVE' ? 'profile.active' : 'profile.inactive')}</AppText>
    {worker.notes ? <AppText style={mobileText.body}>{worker.notes}</AppText> : null}
    {canEdit ? <Button label={t('profile.edit')} variant="outline" onPress={() => open('edit')} /> : null}
    {canDeactivate ? <Button label={t('profile.deactivate')} variant="outline" onPress={() => open('deactivate')} /> : null}
    {canDelete ? <Button label={t('profile.delete')} variant="danger" onPress={() => open('delete')} /> : null}
    <BottomSheet visible={mode !== null} scroll title={mode === 'delete' ? t('profile.deleteTitle', { name: worker.name }) : mode === 'deactivate' ? t('profile.deactivate') : t('profile.edit')} onClose={() => { if (!lock.current) setMode(null); }} footer={<><Button label={common('actions.cancel')} disabled={saving} variant="secondary" onPress={() => setMode(null)} /><Button label={mode === 'delete' ? t('profile.delete') : mode === 'deactivate' ? t('profile.deactivate') : t('edit.save')} variant={mode === 'delete' ? 'danger' : 'brand'} disabled={saving} onPress={() => void (mode === 'delete' ? remove() : mode === 'deactivate' ? deactivate() : save())} /></>}>
      <FormError message={error} />
      {mode === 'delete' ? <AppText style={mobileText.body}>{t('profile.deleteWarning')}</AppText> : mode === 'deactivate' ? <><AppText style={mobileText.body}>{t('profile.deactivateWarning')}</AppText><FormField label={t('profile.reason')}><Input value={reason} maxLength={500} editable={!saving} onChangeText={setReason} /></FormField></> : <>
        <FormField label={t('create.name')} required><Input value={form.name} maxLength={160} editable={!saving} onChangeText={name => { setForm({ ...form, name }); setAcknowledged(false); }} /></FormField>
        <FormField label={t('create.trade')} required><Input value={form.trade} maxLength={80} editable={!saving} onChangeText={trade => setForm({ ...form, trade })} /></FormField>
        <FormField label={t('create.mobile')}><Input value={form.mobile} maxLength={20} editable={!saving} keyboardType="phone-pad" onChangeText={mobile => { setForm({ ...form, mobile: sanitizePhoneInput(mobile) }); setAcknowledged(false); }} /></FormField>
        <FormField label={t('details.baseRate')}><Input value={form.rate} editable={!saving} keyboardType="decimal-pad" onChangeText={rate => setForm({ ...form, rate })} /></FormField>
        <AppText style={mobileText.caption}>{t('profile.rateHelp')}</AppText>
        <FormField label={t('profile.notes')}><Input value={form.notes} maxLength={2000} multiline editable={!saving} onChangeText={notes => setForm({ ...form, notes })} /></FormField>
        {duplicates.length ? <><AppText style={mobileText.body}>{duplicates.join(', ')}</AppText><Toggle label={t('profile.duplicate')} value={acknowledged} onValueChange={setAcknowledged} /></> : null}
      </>}
    </BottomSheet>
  </View>;
}
