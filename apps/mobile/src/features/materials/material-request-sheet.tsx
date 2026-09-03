import { MATERIAL_UNITS, type MaterialRequestDetail, type MaterialUnit } from '@nirman-app/shared';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BottomSheet, Button, DateInput, FilterOption, FormError, FormField, Input } from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { ApiRequestError } from '../../lib/api';
import { mobileTheme } from '../../theme';
import { fetchProjectMembers } from '../members/services';
import type { ProjectMember } from '../members/types';
import { createMaterialRequest, updateMaterialRequest } from './services';
import { mutationKey, today } from './materials-ui';

type Props = {
  visible: boolean;
  organizationId: string;
  projectId: string;
  accessToken: string;
  canReadProjectMembers: boolean;
  detail?: MaterialRequestDetail | null;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
  onConflict?: () => void | Promise<void>;
};

type FieldErrors = Partial<Record<'materialName' | 'quantity' | 'customUnit' | 'requestedOn' | 'requiredByDate' | 'estimatedCost', string>>;

export function MaterialRequestSheet({ visible, organizationId, projectId, accessToken, canReadProjectMembers, detail, onClose, onSaved, onConflict }: Props) {
  const { t } = useTranslation('materials');
  const { t: tCommon } = useTranslation('common');
  const [materialName, setMaterialName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<MaterialUnit>('BAG');
  const [customUnit, setCustomUnit] = useState('');
  const [requestedOn, setRequestedOn] = useState(today());
  const [requiredByDate, setRequiredByDate] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [notes, setNotes] = useState('');
  const [responsibleMemberId, setResponsibleMemberId] = useState<string | null>(null);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [key, setKey] = useState(mutationKey(detail?.id ?? 'material-create'));
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (!visible) return;
    setMaterialName(detail?.materialName ?? ''); setCategory(detail?.category ?? ''); setQuantity(detail?.requestedQuantity ?? '');
    setUnit(detail?.unitOfMeasure ?? 'BAG'); setCustomUnit(detail?.customUnitLabel ?? ''); setRequestedOn(detail?.requestedOn ?? today());
    setRequiredByDate(detail?.requiredByDate ?? ''); setEstimatedCost(detail?.estimatedCost ?? ''); setNotes(detail?.notes ?? '');
    setResponsibleMemberId(detail?.responsibleContractorMemberId ?? null); setKey(mutationKey(detail?.id ?? 'material-create')); setError(''); setFieldErrors({});
  }, [detail?.id, visible]);

  useEffect(() => {
    if (!visible || !canReadProjectMembers) return;
    void fetchProjectMembers(organizationId, projectId, accessToken)
      .then((rows) => setMembers(rows.filter((member) => member.status === 'ACTIVE')))
      .catch(() => setMembers([]));
  }, [accessToken, canReadProjectMembers, organizationId, projectId, visible]);

  const responsibleName = useMemo(() => members.find((member) => member.memberId === responsibleMemberId)?.user.name, [members, responsibleMemberId]);

  async function save() {
    const nextErrors: FieldErrors = {};
    const parsedQuantity = Number(quantity);
    const parsedCost = estimatedCost ? Number(estimatedCost) : null;
    if (materialName.trim().length < 2) nextErrors.materialName = t('validation.materialName');
    if (!Number.isFinite(parsedQuantity) || parsedQuantity <= 0) nextErrors.quantity = t('validation.quantity');
    if (unit === 'OTHER' && !customUnit.trim()) nextErrors.customUnit = t('validation.customUnit');
    if (!requestedOn) nextErrors.requestedOn = tCommon('validation.required', { field: t('fields.requestedOn') });
    if (requiredByDate && requiredByDate < requestedOn) nextErrors.requiredByDate = t('validation.requiredDate');
    if (parsedCost !== null && (!Number.isFinite(parsedCost) || parsedCost < 0)) nextErrors.estimatedCost = t('validation.cost');
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length) { setError(t('validation.form')); return; }
    setWorking(true); setError('');
    const input = {
      materialName: materialName.trim(), category: category.trim() || null, requestedQuantity: parsedQuantity, unitOfMeasure: unit,
      customUnitLabel: unit === 'OTHER' ? customUnit.trim() : null, requestedOn, requiredByDate: requiredByDate || null,
      estimatedCost: parsedCost, responsibleContractorMemberId: responsibleMemberId, notes: notes.trim() || null, idempotencyKey: key,
    };
    try {
      if (detail) await updateMaterialRequest(organizationId, projectId, detail.id, accessToken, { ...input, expectedVersion: detail.version });
      else await createMaterialRequest(organizationId, projectId, accessToken, input);
      await onSaved(); onClose();
    } catch (saveError) {
      setError(getLocalizedErrorMessage(saveError, t('errors.saveFailed')));
      if (saveError instanceof ApiRequestError && saveError.code === 'MATERIAL_VERSION_CONFLICT') await onConflict?.();
    } finally { setWorking(false); }
  }

  return <BottomSheet visible={visible} title={detail ? t('form.editTitle') : t('form.createTitle')} description={t('form.description')} scroll showCloseButton={false} onClose={onClose} footer={<View style={styles.footer}><Button style={styles.footerButton} label={tCommon('actions.cancel')} variant="secondary" disabled={working} onPress={onClose} /><Button style={styles.footerButton} label={working ? t('loading.saving') : t('form.save')} disabled={working} onPress={() => void save()} /></View>}>
    <FormError message={error} />
    <FormField label={t('fields.materialName')} required error={fieldErrors.materialName}><Input autoCapitalize="words" invalid={Boolean(fieldErrors.materialName)} maxLength={160} value={materialName} onChangeText={setMaterialName} /></FormField>
    <FormField label={t('fields.category')} optional><Input maxLength={120} value={category} onChangeText={setCategory} /></FormField>
    <FormField label={t('fields.quantity')} required error={fieldErrors.quantity}><Input invalid={Boolean(fieldErrors.quantity)} keyboardType="decimal-pad" value={quantity} onChangeText={(value) => setQuantity(value.replace(/[^0-9.]/g, ''))} /></FormField>
    <FormField label={t('fields.unit')} required><View style={styles.choices}>{MATERIAL_UNITS.map((value) => <FilterOption key={value} label={t(`unit.${value}`)} selected={unit === value} onPress={() => setUnit(value)} />)}</View></FormField>
    {unit === 'OTHER' ? <FormField label={t('fields.customUnit')} required error={fieldErrors.customUnit}><Input invalid={Boolean(fieldErrors.customUnit)} maxLength={80} value={customUnit} onChangeText={setCustomUnit} /></FormField> : null}
    <FormField label={t('fields.requestedOn')} required error={fieldErrors.requestedOn}><DateInput allowClear={false} accessibilityLabel={t('fields.requestedOn')} invalid={Boolean(fieldErrors.requestedOn)} value={requestedOn} onChangeText={setRequestedOn} /></FormField>
    <FormField label={t('fields.requiredByDate')} optional error={fieldErrors.requiredByDate}><DateInput accessibilityLabel={t('fields.requiredByDate')} invalid={Boolean(fieldErrors.requiredByDate)} minimumDate={requestedOn ? new Date(`${requestedOn}T12:00:00`) : undefined} value={requiredByDate} onChangeText={setRequiredByDate} /></FormField>
    <FormField label={t('fields.estimatedCost')} optional error={fieldErrors.estimatedCost}><Input invalid={Boolean(fieldErrors.estimatedCost)} keyboardType="decimal-pad" value={estimatedCost} onChangeText={(value) => setEstimatedCost(value.replace(/[^0-9.]/g, ''))} /></FormField>
    {canReadProjectMembers ? <FormField label={t('fields.responsibleMember')} optional helperText={responsibleName ?? t('form.noResponsible')}><View style={styles.choices}><FilterOption label={t('form.noResponsible')} selected={!responsibleMemberId} onPress={() => setResponsibleMemberId(null)} />{members.map((member) => <FilterOption key={member.memberId} label={`${member.user.name} · ${member.roleLabel ?? member.role.name}`} selected={responsibleMemberId === member.memberId} onPress={() => setResponsibleMemberId(member.memberId)} />)}</View></FormField> : null}
    <FormField label={t('fields.notes')} optional><Input maxLength={2000} multiline numberOfLines={4} style={styles.multiline} value={notes} onChangeText={setNotes} /></FormField>
  </BottomSheet>;
}

const styles = StyleSheet.create({
  choices: { gap: mobileTheme.spacing[2] },
  footer: { flex: 1, flexDirection: 'row', gap: mobileTheme.spacing[3] },
  footerButton: { flex: 1 },
  multiline: { minHeight: 104, paddingTop: mobileTheme.spacing[3], textAlignVertical: 'top' },
});
