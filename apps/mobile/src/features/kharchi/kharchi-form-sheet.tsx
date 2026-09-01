import { KHARCHI_PAYMENT_METHODS, type ProjectWorkerRosterItem } from '@nirman-app/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  BottomSheet,
  Button,
  CollectionPickerModal,
  DateInput,
  FormError,
  FormField,
  Input,
  LoadingState,
  OperationalEntityCard,
} from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { ApiRequestError } from '../../lib/api';
import { mobileText, mobileTheme } from '../../theme';
import { createKharchi, fetchEligibleKharchiWorkers } from './services';
import type { KharchiAdvanceDetail, KharchiPaymentMethod } from './types';

type Props = {
  visible: boolean;
  organizationId: string;
  projectId: string;
  accessToken: string;
  onClose: () => void;
  onSaved: (detail: KharchiAdvanceDetail) => Promise<void> | void;
};

type Field = 'worker' | 'amount' | 'requestDate' | 'paymentReference' | 'notes';

function mutationKey() {
  return `kharchi-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function indiaTodayDateOnly() {
  const parts = new Intl.DateTimeFormat('en', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Kolkata' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function cleanMoney(value: string) {
  const normalized = value.replace(/[^\d.]/g, '');
  const [whole = '', ...fractionParts] = normalized.split('.');
  return fractionParts.length ? `${whole}.${fractionParts.join('').slice(0, 2)}` : whole;
}

export function KharchiFormSheet({ visible, organizationId, projectId, accessToken, onClose, onSaved }: Props) {
  const { t } = useTranslation('kharchi');
  const [requestDate, setRequestDate] = useState(indiaTodayDateOnly());
  const [workers, setWorkers] = useState<ProjectWorkerRosterItem[]>([]);
  const [worker, setWorker] = useState<ProjectWorkerRosterItem | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<KharchiPaymentMethod>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [notes, setNotes] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [workerSearch, setWorkerSearch] = useState('');
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [idempotencyKey, setIdempotencyKey] = useState(mutationKey);
  const [attempted, setAttempted] = useState(false);

  const loadWorkers = useCallback(async () => {
    if (!visible) return;
    setIsLoadingWorkers(true);
    try {
      const response = await fetchEligibleKharchiWorkers(organizationId, projectId, requestDate, accessToken);
      setWorkers(response.data);
      setWorker((selected) => selected && response.data.some((item) => item.currentAssignment.id === selected.currentAssignment.id) ? selected : null);
      setError('');
    } catch (loadError) {
      setWorkers([]);
      setWorker(null);
      setError(getLocalizedErrorMessage(loadError, t('errors.workersUnavailable')));
    } finally {
      setIsLoadingWorkers(false);
    }
  }, [accessToken, organizationId, projectId, requestDate, t, visible]);

  useEffect(() => { void loadWorkers(); }, [loadWorkers]);

  const visibleWorkers = useMemo(() => {
    const needle = workerSearch.trim().toLocaleLowerCase();
    if (!needle) return workers;
    return workers.filter((item) => `${item.workerCode} ${item.name} ${item.trade}`.toLocaleLowerCase().includes(needle));
  }, [workerSearch, workers]);

  function changed() {
    if (attempted) {
      setIdempotencyKey(mutationKey());
      setAttempted(false);
    }
  }

  function resetAndClose() {
    setRequestDate(indiaTodayDateOnly());
    setWorkers([]);
    setWorker(null);
    setAmount('');
    setPaymentMethod('CASH');
    setPaymentReference('');
    setNotes('');
    setError('');
    setFieldErrors({});
    setIdempotencyKey(mutationKey());
    setAttempted(false);
    onClose();
  }

  async function submit() {
    const next: Partial<Record<Field, string>> = {};
    const numericAmount = Number(amount);
    if (!requestDate) next.requestDate = t('validation.dateRequired');
    if (!worker) next.worker = t('validation.workerRequired');
    if (!amount || !Number.isFinite(numericAmount) || numericAmount <= 0) next.amount = t('validation.amountPositive');
    if (paymentReference.trim().length > 120) next.paymentReference = t('validation.referenceLength');
    if (notes.trim().length > 2000) next.notes = t('validation.notesLength');
    setFieldErrors(next);
    if (Object.keys(next).length || !worker) return;

    setAttempted(true);
    setIsSaving(true);
    setError('');
    try {
      const detail = await createKharchi(organizationId, projectId, accessToken, {
        workerAssignmentId: worker.currentAssignment.id,
        amount: numericAmount,
        requestDate,
        paymentMethod,
        paymentReference: paymentReference.trim() || null,
        notes: notes.trim() || null,
        idempotencyKey,
      });
      await onSaved(detail);
      Alert.alert(t('create.successTitle'), t('create.success'));
      resetAndClose();
    } catch (saveError) {
      if (saveError instanceof ApiRequestError) {
        if (saveError.code === 'KHARCHI_WORKER_INACTIVE' || saveError.code === 'KHARCHI_WORKER_ASSIGNMENT_INVALID') {
          setWorker(null);
          setFieldErrors((current) => ({ ...current, worker: getLocalizedErrorMessage(saveError) }));
          void loadWorkers();
        }
        if (saveError.code === 'KHARCHI_REQUEST_DATE_OUTSIDE_ASSIGNMENT') {
          setWorker(null);
          setFieldErrors((current) => ({ ...current, requestDate: getLocalizedErrorMessage(saveError), worker: getLocalizedErrorMessage(saveError) }));
          void loadWorkers();
        }
      }
      setError(getLocalizedErrorMessage(saveError, t('errors.createFailed')));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <BottomSheet
        visible={visible}
        scroll
        showCloseButton={false}
        title={t('create.title')}
        description={t('create.warning')}
        onClose={resetAndClose}
        footer={<><Button label={t('actions.cancel')} variant="secondary" style={styles.footerButton} disabled={isSaving} onPress={resetAndClose} /><Button label={isSaving ? t('create.saving') : t('create.action')} style={styles.footerButton} disabled={isSaving || isLoadingWorkers} onPress={() => void submit()} /></>}
      >
        <FormError message={error} />
        <FormField label={t('create.requestDate')} required error={fieldErrors.requestDate}>
          <DateInput allowClear={false} accessibilityLabel={t('create.requestDateA11y')} invalid={Boolean(fieldErrors.requestDate)} value={requestDate} onChangeText={(value) => { changed(); setRequestDate(value); setWorker(null); setFieldErrors((current) => ({ ...current, requestDate: undefined, worker: undefined })); }} />
        </FormField>
        <FormField label={t('create.worker')} required error={fieldErrors.worker} helperText={t('create.workerHelp')}>
          {isLoadingWorkers ? <LoadingState label={t('create.loadingWorkers')} /> : <Button label={worker ? `${worker.workerCode} · ${worker.name}` : t('create.chooseWorker')} variant="outline" onPress={() => setPickerVisible(true)} />}
        </FormField>
        <FormField label={t('create.amount')} required error={fieldErrors.amount}>
          <Input accessibilityLabel={t('create.amountA11y')} invalid={Boolean(fieldErrors.amount)} inputMode="decimal" keyboardType="decimal-pad" value={amount} onChangeText={(value) => { changed(); setAmount(cleanMoney(value)); setFieldErrors((current) => ({ ...current, amount: undefined })); }} />
        </FormField>
        <FormField label={t('create.paymentMethod')} required>
          <View style={styles.choiceRow}>{KHARCHI_PAYMENT_METHODS.map((method) => <Pressable key={method} accessibilityRole="radio" accessibilityState={{ checked: paymentMethod === method }} style={({ pressed }) => [styles.choice, paymentMethod === method && styles.choiceSelected, pressed && styles.pressed]} onPress={() => { changed(); setPaymentMethod(method); }}><AppText style={styles.choiceText} weight={700}>{t(`paymentMethod.${method}`)}</AppText></Pressable>)}</View>
        </FormField>
        <FormField label={t('create.reference')} optional error={fieldErrors.paymentReference}>
          <Input maxLength={120} value={paymentReference} onChangeText={(value) => { changed(); setPaymentReference(value); setFieldErrors((current) => ({ ...current, paymentReference: undefined })); }} />
        </FormField>
        <FormField label={t('create.notes')} optional error={fieldErrors.notes}>
          <Input multiline maxLength={2000} value={notes} onChangeText={(value) => { changed(); setNotes(value); setFieldErrors((current) => ({ ...current, notes: undefined })); }} />
        </FormField>
      </BottomSheet>

      <CollectionPickerModal visible={pickerVisible} title={t('workerPicker.title')} subtitle={requestDate} searchValue={workerSearch} searchPlaceholder={t('workerPicker.search')} accessibilityLabel={t('workerPicker.searchA11y')} data={visibleWorkers} keyExtractor={(item) => item.currentAssignment.id} onSearchChange={setWorkerSearch} onClose={() => setPickerVisible(false)} emptyTitle={t('workerPicker.emptyTitle')} emptyDescription={t('workerPicker.emptyDescription')} renderItem={({ item }) => <OperationalEntityCard compact contextLeading={item.workerCode} contextTrailing={item.trade} title={item.name} supporting={item.currentAssignment.startsOn} footerLeading={t('workerPicker.select')} onPress={() => { changed(); setWorker(item); setFieldErrors((current) => ({ ...current, worker: undefined })); setPickerVisible(false); }} />} />
    </>
  );
}

const styles = StyleSheet.create({
  footerButton: { flex: 1 },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  choice: { alignItems: 'center', backgroundColor: mobileTheme.color.surface.raised, borderColor: mobileTheme.color.border.default, borderRadius: mobileTheme.radius.full, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: mobileTheme.spacing[4] },
  choiceSelected: { backgroundColor: mobileTheme.color.status.info.background, borderColor: mobileTheme.color.action.primary, borderWidth: 2 },
  choiceText: { ...mobileText.caption, color: mobileTheme.color.text.primary },
  pressed: { opacity: 0.78 },
});
