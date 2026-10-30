import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ActionListItem, AppText, BottomSheet, Button, FormError, FormField, Input, LoadingState } from '../../../components/ui';
import { apiRequest } from '../../../lib/api';
import { getLocalizedErrorMessage } from '../../../i18n';
import { useSession } from '../../../providers';

export function ProfileEditorAction() {
  const { t } = useTranslation('auth');
  const [open, setOpen] = useState(false);
  return <>
    <ActionListItem accessibilityLabel={t('profile.edit')} label={t('profile.edit')} icon="account-edit-outline" tone="brand" onPress={() => setOpen(true)} />
    {open ? <ProfileEditor onClose={() => setOpen(false)} /> : null}
  </>;
}

function ProfileEditor({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('auth');
  const { t: common } = useTranslation('common');
  const { session, refreshSession } = useSession();
  const token = session?.accessToken;
  const userId = session?.user.id;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [revision, setRevision] = useState(0);
  const lock = useRef(false);

  useEffect(() => {
    let active = true;
    setLoading(true); setReady(false); setError('');
    if (!token || !userId) { setLoading(false); return; }
    void apiRequest<{ data: { name: string; phone: string | null } }>('/users/me', {}, { accessToken: token })
      .then(({ data }) => {
        if (!active) return;
        setName(data.name); setPhone(data.phone ?? ''); setReady(true);
      })
      .catch((cause: unknown) => { if (active) setError(getLocalizedErrorMessage(cause, t('profile.loadFailed'))); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token, userId, revision, t]);

  async function save() {
    if (lock.current || !ready || !token || !name.trim()) return;
    lock.current = true; setSaving(true); setSaved(false); setError('');
    try {
      await apiRequest('/users/me', {
        method: 'PATCH', body: JSON.stringify({ name: name.trim(), phone: phone.trim() || null }),
      }, { accessToken: token });
      setSaved(true);
      try { await refreshSession(); }
      catch { setError(t('profile.refreshFailed')); }
    } catch (cause) {
      setError(getLocalizedErrorMessage(cause, t('profile.saveFailed')));
    } finally { lock.current = false; setSaving(false); }
  }

  return <BottomSheet visible scroll title={t('profile.edit')} description={t('profile.description')}
    onClose={() => { if (!lock.current) onClose(); }} showCloseButton={false}
    footer={<>
      <Button label={common('actions.close')} variant="secondary" disabled={saving} onPress={() => { if (!lock.current) onClose(); }} />
      <Button validateForm label={saving ? t('profile.saving') : t('profile.save')} loading={saving} disabled={!ready || saving} onPress={() => void save()} />
    </>}>
    {loading ? <LoadingState label={common('loading.default')} /> : null}
    <FormError message={error} />
    {!loading && !ready ? <Button label={common('actions.retry')} variant="secondary" onPress={() => setRevision((current) => current + 1)} /> : null}
    {ready ? <>
      <FormField label={t('profile.name')} required><Input accessibilityLabel={t('profile.name')} autoComplete="name" maxLength={100} editable={!saving} value={name} onChangeText={(value) => { setName(value); setSaved(false); }} /></FormField>
      <FormField label={t('profile.phone')}><Input accessibilityLabel={t('profile.phone')} autoComplete="tel" keyboardType="phone-pad" maxLength={20} editable={!saving} value={phone} onChangeText={(value) => { setPhone(value); setSaved(false); }} /></FormField>
    </> : null}
    {saved ? <AppText accessibilityLiveRegion="polite">{t('profile.saved')}</AppText> : null}
  </BottomSheet>;
}
