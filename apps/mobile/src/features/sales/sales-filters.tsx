import { BOOKING_STATUSES, FOLLOW_UP_STATUSES, LEAD_STAGES, SITE_VISIT_STATUSES, UNIT_STATUSES } from '@nirman-app/shared';
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AppliedFilterChip, AppliedFilters, DateInput, FilterGroup, FilterOption, FormError, FormField, Input, ListFilterBar, ListFilterSheet } from '../../components/ui';
import { useSalesAssignees } from './sales-assignees';
import { scheduleInstant } from './sales-rules';

export type SalesView = 'leads' | 'followUps' | 'visits' | 'units' | 'bookings';
export type SalesFiltersValue = { status?: string; assignedTo?: string; from?: string; to?: string };
const groups = { leads: LEAD_STAGES, followUps: FOLLOW_UP_STATUSES, visits: SITE_VISIT_STATUSES, units: UNIT_STATUSES, bookings: BOOKING_STATUSES };
const namespaces = { leads: 'stage', followUps: 'followUpStatus', visits: 'visitStatus', units: 'unitStatus', bookings: 'bookingStatus' } as const;

export function SalesListFilters({ view, value, team, timezone, search, onApply }: { view: SalesView; value: SalesFiltersValue; team: boolean; timezone: string; search: ReactNode; onApply: (value: SalesFiltersValue) => void }) {
  const { t } = useTranslation('sales');
  const translate = t as unknown as (key: string) => string;
  const { t: common } = useTranslation('common');
  const { options } = useSalesAssignees();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<SalesFiltersValue>({});
  const [error, setError] = useState('');
  const dated = view === 'followUps' || view === 'visits' || view === 'bookings';
  const assigned = team && (view === 'leads' || view === 'followUps' || view === 'visits');
  const entries = Object.entries(value).filter(([, v]) => v);
  const display = (key: string, v: string) => key === 'status' ? translate(`${namespaces[view]}.${v}`) : key === 'assignedTo' ? options.find(o => o.value === v)?.label ?? v : `${t(key === 'from' ? 'parity.from' : 'parity.to')}: ${v}`;
  function apply() {
    if (dated && ((draft.from && !scheduleInstant(`${draft.from}T00:00`, timezone)) || (draft.to && !scheduleInstant(`${draft.to}T00:00`, timezone)) || (draft.from && draft.to && draft.from > draft.to))) { setError(t('parity.dateRangeError')); return; }
    if (draft.assignedTo && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draft.assignedTo)) { setError(t('parity.assigneeInvalid')); return; }
    onApply(draft); setOpen(false);
  }
  return <>
    <ListFilterBar search={search} filterLabel={common('listFilters.title')} filterAccessibilityLabel={common('listFilters.title')} activeFilterCount={entries.length} expanded={open} onOpenFilters={() => { setDraft(value); setError(''); setOpen(true); }} />
    <AppliedFilters>{entries.map(([key, v]) => <AppliedFilterChip key={key} label={display(key, v!)} removeAccessibilityLabel={common('listFilters.clearAll')} onRemove={() => onApply({ ...value, [key]: undefined })} />)}</AppliedFilters>
    <ListFilterSheet visible={open} title={common('listFilters.title')} clearLabel={common('listFilters.clearAll')} applyLabel={common('listFilters.apply')} onClose={() => setOpen(false)} onClear={() => { setDraft({}); onApply({}); setError(''); setOpen(false); }} onApply={apply}>
      <FormError message={error} />
      <FilterGroup label={t(view === 'leads' ? 'fields.currentLeadStage' : 'parity.status')}><FilterOption label={t('parity.all')} selected={!draft.status} onPress={() => setDraft({ ...draft, status: undefined })} />{groups[view].map(status => <FilterOption key={status} label={translate(`${namespaces[view]}.${status}`)} selected={draft.status === status} onPress={() => setDraft({ ...draft, status })} />)}</FilterGroup>
      {dated ? <><FormField label={t('parity.from')}><DateInput accessibilityLabel={t('parity.from')} value={draft.from ?? ''} onChangeText={from => setDraft({ ...draft, from })} /></FormField><FormField label={t('parity.to')}><DateInput accessibilityLabel={t('parity.to')} value={draft.to ?? ''} onChangeText={to => setDraft({ ...draft, to })} /></FormField></> : null}
      {assigned ? <FilterGroup label={t('fields.salesperson')}><FilterOption label={t('parity.all')} selected={!draft.assignedTo} onPress={() => setDraft({ ...draft, assignedTo: undefined })} />{options.map(o => <FilterOption key={o.value} label={o.label} selected={draft.assignedTo === o.value} onPress={() => setDraft({ ...draft, assignedTo: o.value })} />)}<Input accessibilityLabel={t('fields.salesperson')} placeholder={t('parity.userId')} value={draft.assignedTo ?? ''} onChangeText={assignedTo => setDraft({ ...draft, assignedTo: assignedTo || undefined })} /></FilterGroup> : null}
    </ListFilterSheet>
  </>;
}
