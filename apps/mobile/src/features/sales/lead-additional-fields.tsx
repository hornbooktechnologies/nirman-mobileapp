import { LEAD_PRIORITIES, LEAD_SOURCES } from '@nirman-app/shared';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FormField, Input } from '../../components/ui';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useSession } from '../../providers';
import { useSalesAssignees } from './sales-assignees';
import { fetchUnits } from './services';
import { SalesChoice } from './sales-ui';
import type { LeadInput, SalesUnit } from './types';

export function LeadAdditionalFields({ value, onChange, editing = false }: { value: Partial<LeadInput>; onChange: (value: Partial<LeadInput>) => void; editing?: boolean }) {
  const { t } = useTranslation('sales');
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const { options } = useSalesAssignees();
  const [units, setUnits] = useState<SalesUnit[]>([]);
  const o = session?.activeOrganization?.id, p = project?.id, token = session?.accessToken;
  const canInventory = permissions.includes('inventory:read');
  useEffect(() => {
    let active = true; setUnits([]);
    if (o && p && token && canInventory) void fetchUnits(o, p, token).then(result => { if (active) setUnits(result); }).catch(() => undefined);
    return () => { active = false; };
  }, [o, p, token, canInventory]);
  const fields = [
    { key: 'alternateMobile', label: t('parity.alternateMobile'), max: 24 },
    { key: 'sourceDetail', label: t('parity.sourceDetail'), max: 255 },
    { key: 'purchasePurpose', label: t('parity.purchasePurpose'), max: 120 },
    { key: 'purchaseTimeline', label: t('parity.purchaseTimeline'), max: 120 },
    ...(editing ? [{ key: 'preferredUnitType', label: t('fields.preferredUnitType'), max: 80 }] : []),
  ] as const;
  return <>
    {fields.map(f => <FormField key={f.key} label={f.label}><Input maxLength={f.max} value={String(value[f.key as keyof LeadInput] ?? '')} onChangeText={text => onChange({ ...value, [f.key]: text || undefined })} /></FormField>)}
    {editing ? <>
      <FormField label={t('fields.budgetMin')}><Input keyboardType="decimal-pad" value={value.budgetMin?.toString() ?? ''} onChangeText={text => onChange({ ...value, budgetMin: text ? Number(text) : undefined })} /></FormField>
      <FormField label={t('fields.budgetMax')}><Input keyboardType="decimal-pad" value={value.budgetMax?.toString() ?? ''} onChangeText={text => onChange({ ...value, budgetMax: text ? Number(text) : undefined })} /></FormField>
      <FormField label={t('fields.source')}>{LEAD_SOURCES.map(source => <SalesChoice key={source} label={t(`source.${source}`)} selected={value.source === source} onPress={() => onChange({ ...value, source })} />)}</FormField>
      <FormField label={t('fields.priority')}>{LEAD_PRIORITIES.map(priority => <SalesChoice key={priority} label={t(`priority.${priority}`)} selected={value.priority === priority} onPress={() => onChange({ ...value, priority })} />)}</FormField>
    </> : null}
    {canInventory ? <FormField label={t('fields.unit')}><SalesChoice label={t('parity.notProvided')} selected={!value.interestedUnitId} onPress={() => onChange({ ...value, interestedUnitId: undefined })} />{units.map(unit => <SalesChoice key={unit.id} label={unit.unitNumber} description={t(`unitStatus.${unit.status}`)} selected={value.interestedUnitId === unit.id} onPress={() => onChange({ ...value, interestedUnitId: unit.id })} />)}</FormField> : null}
    {!editing && permissions.includes('leads:assign') ? <FormField label={t('fields.salesperson')}><SalesChoice label={t('leads.unassigned')} selected={!value.assignedTo} onPress={() => onChange({ ...value, assignedTo: undefined })} />{options.map(option => <SalesChoice key={option.value} label={option.label} selected={value.assignedTo === option.value} onPress={() => onChange({ ...value, assignedTo: option.value })} />)}<Input placeholder={t('parity.userId')} value={value.assignedTo ?? ''} onChangeText={assignedTo => onChange({ ...value, assignedTo: assignedTo || undefined })} /></FormField> : null}
  </>;
}
