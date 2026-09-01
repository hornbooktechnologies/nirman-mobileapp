import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, BottomSheet, Button, Card, FormError, FormField, Input } from '../../components/ui';
import { formatInr, getLocalizedErrorMessage } from '../../i18n';
import { useLocalization } from '../../providers';
import { ApiRequestError } from '../../lib/api';
import { mobileText, mobileTheme } from '../../theme';
import { createKharchiAdjustment } from './services';
import type { KharchiAdvanceDetail } from './types';

type Props = { visible: boolean; organizationId: string; projectId: string; accessToken: string; detail: KharchiAdvanceDetail; onClose: () => void; onSaved: (detail: KharchiAdvanceDetail) => void };
type Mode = 'INCREASE' | 'DECREASE';
const key = () => `kharchi-adjust-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
const money = (value: string) => { const normalized = value.replace(/[^\d.]/g, ''); const [whole = '', ...parts] = normalized.split('.'); return parts.length ? `${whole}.${parts.join('').slice(0, 2)}` : whole; };

export function KharchiAdjustmentSheet({ visible, organizationId, projectId, accessToken, detail, onClose, onSaved }: Props) {
  const { t } = useTranslation('kharchi');
  const { language } = useLocalization();
  const [mode, setMode] = useState<Mode>('INCREASE');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [reasonError, setReasonError] = useState('');
  const [saving, setSaving] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(key);
  const [attempted, setAttempted] = useState(false);
  function changed() { if (attempted) { setIdempotencyKey(key()); setAttempted(false); } }
  function close() { setMode('INCREASE'); setAmount(''); setReason(''); setError(''); setAmountError(''); setReasonError(''); setIdempotencyKey(key()); setAttempted(false); onClose(); }
  async function submit() {
    const magnitude = Number(amount);
    const nextAmountError = !amount || !Number.isFinite(magnitude) || magnitude <= 0 ? t('validation.amountPositive') : mode === 'DECREASE' && magnitude > Number(detail.outstandingAmount) ? t('validation.adjustmentExceeds') : '';
    const nextReasonError = reason.trim().length < 2 ? t('validation.reasonRequired') : '';
    setAmountError(nextAmountError); setReasonError(nextReasonError);
    if (nextAmountError || nextReasonError) return;
    setAttempted(true); setSaving(true); setError('');
    try {
      const updated = await createKharchiAdjustment(organizationId, projectId, detail.id, accessToken, { amount: mode === 'DECREASE' ? -magnitude : magnitude, reason: reason.trim(), idempotencyKey });
      onSaved(updated); Alert.alert(t('adjustment.successTitle'), t('adjustment.success')); close();
    } catch (saveError) {
      if (saveError instanceof ApiRequestError && saveError.code === 'KHARCHI_ADJUSTMENT_EXCEEDS_BALANCE') setAmountError(getLocalizedErrorMessage(saveError));
      setError(getLocalizedErrorMessage(saveError, t('errors.adjustFailed')));
    }
    finally { setSaving(false); }
  }
  return <BottomSheet visible={visible} scroll showCloseButton={false} title={t('adjustment.title')} description={t('adjustment.warning')} onClose={close} footer={<><Button label={t('actions.cancel')} variant="secondary" style={styles.footerButton} disabled={saving} onPress={close} /><Button label={saving ? t('adjustment.saving') : t(mode === 'INCREASE' ? 'adjustment.addIncrease' : 'adjustment.addCorrection')} style={styles.footerButton} disabled={saving} onPress={() => void submit()} /></>}>
    <FormError message={error} />
    <Card variant="blueprint" style={styles.balance}><Balance label={t('summary.outstanding')} value={formatInr(Number(detail.outstandingAmount), language)} /><Balance label={t('summary.deducted')} value={formatInr(Number(detail.deductedAmount), language)} /></Card>
    <View style={styles.modeRow}>{(['INCREASE', 'DECREASE'] as const).map((value) => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: mode === value }} style={({ pressed }) => [styles.mode, mode === value && styles.modeSelected, pressed && styles.pressed]} onPress={() => { changed(); setMode(value); setAmountError(''); }}><AppText style={styles.modeText} weight={700}>{t(`adjustment.mode.${value}`)}</AppText></Pressable>)}</View>
    <FormField label={t('adjustment.amount')} required error={amountError}><Input accessibilityLabel={t('adjustment.amount')} invalid={Boolean(amountError)} inputMode="decimal" keyboardType="decimal-pad" value={amount} onChangeText={(value) => { changed(); setAmount(money(value)); setAmountError(''); }} /></FormField>
    <FormField label={t('adjustment.reason')} required error={reasonError}><Input accessibilityLabel={t('adjustment.reason')} invalid={Boolean(reasonError)} maxLength={500} value={reason} onChangeText={(value) => { changed(); setReason(value); setReasonError(''); }} /></FormField>
  </BottomSheet>;
}

function Balance({ label, value }: { label: string; value: string }) { return <View style={styles.balanceRow}><AppText style={styles.label}>{label}</AppText><AppText style={styles.value} weight={700}>{value}</AppText></View>; }
const styles = StyleSheet.create({ footerButton: { flex: 1 }, balance: { gap: mobileTheme.spacing[2] }, balanceRow: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3], justifyContent: 'space-between' }, label: { ...mobileText.body, color: mobileTheme.color.text.secondary }, value: { ...mobileText.body, fontVariant: ['tabular-nums'] }, modeRow: { flexDirection: 'row', gap: mobileTheme.spacing[3] }, mode: { alignItems: 'center', backgroundColor: mobileTheme.color.surface.raised, borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.md, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 48 }, modeSelected: { backgroundColor: mobileTheme.color.status.info.background, borderColor: mobileTheme.color.action.primary, borderWidth: 2 }, modeText: { ...mobileText.body }, pressed: { opacity: 0.78 } });
