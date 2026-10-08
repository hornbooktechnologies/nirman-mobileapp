
import { RefreshButton } from "../../components/ui/refresh-button";
import { mobileTheme } from '../../theme';
import { UNIT_PRICE_BASES, UNIT_PRICE_INPUT_UNITS, type UnitInterestStatus, type UnitPriceInputUnit } from '@nirman-app/shared';
import { useEffect, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheet, Button, DateInput, FormError, FormField, Input, LoadingState, SearchField, TimeInput } from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { ApiRequestError } from '../../lib/api';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useSession } from '../../providers';
import { blockUnit, decideUnitHoldRequest, fetchLead, fetchLeads, fetchUnitInterests, fetchUnits, releaseUnitBlock, requestUnitHold, saveUnitInterest, updateUnit } from './services';
import { canWriteLead, scheduleInstant, uncertainWrite } from './sales-rules';
import { SalesChoice } from './sales-ui';
import type { SalesLead, SalesUnit, SalesUnitInterest, UnitInput } from './types';

export type UnitWorkflow = 'edit' | 'interest' | 'request' | 'block' | 'release' | 'APPROVED' | 'REJECTED';
export function UnitWorkflowSheet({ unit, action, interest, close, saved }: { unit: SalesUnit; action: UnitWorkflow; interest?: SalesUnitInterest; close: () => void; saved: () => void }) {
  const { t } = useTranslation('sales');
  const { t: common } = useTranslation('common');
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const timezone = session?.activeOrganization?.workingTimezone || session?.activeOrganization?.timezone || 'Asia/Kolkata';
  const [draft, setDraft] = useState<UnitInput>({ unitNumber: unit.unitNumber, unitType: unit.unitType, wingTower: unit.wingTower ?? undefined, floor: unit.floor ?? undefined, facing: unit.facing ?? undefined, areaSqft: unit.areaSqft ?? undefined, priceBasis: unit.priceBasis, basePrice: unit.basePrice ?? undefined, ratePerSqft: unit.ratePerSqft ?? undefined, status: unit.status });
  const [priceUnit, setPriceUnit] = useState<UnitPriceInputUnit>('RUPEE');
  const [price, setPrice] = useState(unit.basePrice?.toString() ?? '');
  const [status, setStatus] = useState<UnitInterestStatus>(interest && ['INTERESTED', 'HIGH_INTENT', 'WITHDRAWN'].includes(interest.status) ? interest.status : 'INTERESTED');
  const [notes, setNotes] = useState(interest?.notes ?? '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [leadId, setLeadId] = useState(interest?.leadId ?? '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState<SalesLead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [review, setReview] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false), alive = useRef(true), snapshot = useRef(unit), interestSnapshot = useRef(interest);
  const customer = ['interest', 'request', 'block'].includes(action);
  const permission = action === 'edit' ? 'inventory:manage' : action === 'interest' ? 'inventory:interest' : action === 'request' ? 'inventory:request-block' : 'inventory:block';
  const o = session?.activeOrganization?.id, p = project?.id, token = session?.accessToken;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    if (!customer || interest || !o || !p || !token) return;
    setLoading(true);
    void fetchLeads(o, p, token, { search, page }).then(result => { if (active) { setLeads(result.data); setTotal(result.meta.total); } }).catch(cause => { if (active) setError(getLocalizedErrorMessage(cause, t('errors.load'))); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [customer, interest, o, p, token, search, page, t]);
  async function current() {
    if (!o || !p || !token) throw new Error(t('noProject.description'));
    const row = (await fetchUnits(o, p, token)).find(row => row.id === unit.id);
    if (!row) throw new Error(t('parity.stale'));
    return row;
  }
  async function refresh() {
    if (lock.current) return;
    lock.current = true; setWorking(true);
    try {
      const latest = await current();
      const queue = interest && o && p && token ? await fetchUnitInterests(o, p, unit.id, token) : [];
      if (alive.current) { snapshot.current = latest; if (interest) interestSnapshot.current = queue.find(row => row.id === interest.id); setReview(false); setError(''); }
    } catch (cause) { if (alive.current) setError(getLocalizedErrorMessage(cause, t('errors.load'))); }
    finally { lock.current = false; if (alive.current) setWorking(false); }
  }
  async function submit() {
    if (lock.current || review || !o || !p || !token || !session || project?.status !== 'ACTIVE' || !permissions.includes(permission)) return;
    const expiry = date ? scheduleInstant(`${date}T${time}`, timezone) : undefined;
    if (date && (!expiry || Date.parse(expiry) <= Date.now())) { setError(common('validation.date')); return; }
    const multiplier = { RUPEE: 1, LAKH: 100000, CRORE: 10000000 }[priceUnit];
    const amount = Number(price) * multiplier;
    if (action === 'edit' && (!draft.unitNumber.trim() || !draft.unitType.trim() || (draft.areaSqft !== undefined && (!Number.isFinite(draft.areaSqft) || draft.areaSqft <= 0)) || (draft.priceBasis === 'PER_SQFT' ? !draft.areaSqft || !draft.ratePerSqft || !Number.isFinite(draft.ratePerSqft) || draft.ratePerSqft <= 0 : !price || !Number.isFinite(amount) || amount <= 0))) { setError(common('validation.number')); return; }
    if (customer && !leadId) { setError(t('leadDetail.selectInterestUnitError')); return; }
    lock.current = true; setWorking(true); setError('');
    try {
      const latest = await current();
      if (!alive.current) return;
      // Ignore aggregate counts: a new competing interest alone does not alter unit availability/pricing.
      const signature = (value: SalesUnit) => JSON.stringify([value.unitNumber, value.unitType, value.wingTower, value.floor, value.facing, value.areaSqft, value.priceBasis, value.basePrice, value.ratePerSqft, value.status, value.activeBlockId, value.blockExpiresAt]);
      if (signature(latest) !== signature(snapshot.current)) { setReview(true); throw new Error(t('parity.stale')); }
      if (customer) {
        const lead = await fetchLead(o, p, leadId, token);
        if (!alive.current) return;
        if (!canWriteLead(permissions, true, 'leads:update', lead, session.user.id) || lead.currentStage === 'BOOKED') throw new Error(t('parity.accessDenied'));
      }
      if (interest && ['request', 'APPROVED', 'REJECTED'].includes(action)) {
        const latestInterest = (await fetchUnitInterests(o, p, unit.id, token)).find(row => row.id === interest.id);
        if (!alive.current) return;
        if (!latestInterest || !interestSnapshot.current || latestInterest.updatedAt !== interestSnapshot.current.updatedAt || latestInterest.holdRequestId !== interestSnapshot.current.holdRequestId || latestInterest.status !== interestSnapshot.current.status) { setReview(true); throw new Error(t('parity.stale')); }
        if (['APPROVED', 'REJECTED'].includes(action) && latestInterest.holdRequestStatus !== 'PENDING') throw new Error(t('parity.stale'));
      }
      if (action === 'edit') {
        if (['BLOCKED', 'BOOKED'].includes(latest.status)) throw new Error(t('parity.stale'));
        await updateUnit(o, p, unit.id, token, { ...draft, ...(draft.priceBasis === 'PER_SQFT' ? { basePrice: undefined } : { basePrice: amount, ratePerSqft: undefined }) });
      } else if (action === 'interest') {
        if (!['AVAILABLE', 'BLOCKED'].includes(latest.status)) throw new Error(t('parity.stale'));
        await saveUnitInterest(o, p, unit.id, token, { leadId, status, notes: notes.trim() || undefined });
      } else if (action === 'request') {
        if (!['AVAILABLE', 'BLOCKED'].includes(latest.status)) throw new Error(t('parity.stale'));
        await requestUnitHold(o, p, unit.id, token, { leadId, notes: notes.trim() || undefined });
      } else if (action === 'block') {
        if (latest.status !== 'AVAILABLE') throw new Error(t('parity.stale'));
        await blockUnit(o, p, unit.id, token, { leadId, expiresAt: expiry || undefined, notes: notes.trim() || undefined });
      } else if (action === 'release') {
        if (latest.status !== 'BLOCKED' || !latest.activeBlockId) throw new Error(t('parity.stale'));
        await releaseUnitBlock(o, p, latest.activeBlockId, token);
      } else if (interest?.holdRequestId) {
        if (action === 'APPROVED' && latest.status !== 'AVAILABLE') throw new Error(t('parity.stale'));
        await decideUnitHoldRequest(o, p, interest.holdRequestId, token, { decision: action as 'APPROVED' | 'REJECTED', expiresAt: expiry || undefined, notes: notes.trim() || undefined });
      } else throw new Error(t('parity.stale'));
      if (alive.current) saved();
    } catch (cause) {
      if (alive.current) { if (uncertainWrite(cause instanceof ApiRequestError ? cause.status : undefined)) setReview(true); setError(getLocalizedErrorMessage(cause, t('parity.uncertain'))); }
    } finally { lock.current = false; if (alive.current) setWorking(false); }
  }
  function requestClose() { if (lock.current) return; Alert.alert(t('parity.discardTitle'), review ? t('parity.uncertain') : t('parity.discardDescription'), [{ text: common('actions.cancel'), style: 'cancel' }, { text: common('actions.close'), style: 'destructive', onPress: close }]); }
  const title = action === 'edit' ? t('units.editTitle') : action === 'interest' ? t('leadDetail.interestTitle') : action === 'request' ? t('leadDetail.requestHoldTitle') : action === 'block' ? t('parity.block') : action === 'release' ? t('units.releaseTitle') : t(action === 'APPROVED' ? 'unitQueue.approveTitle' : 'unitQueue.rejectTitle');
  return <BottomSheet visible scroll title={title} showCloseButton={false} onClose={requestClose} footer={<><Button label={common('actions.cancel')} variant="secondary" disabled={working} onPress={requestClose} /><Button label={working ? t('saving') : t('save')} disabled={working || review} onPress={() => void submit()} /></>}>
    <FormError message={error} />{review ? <RefreshButton busy={loading} label={t('refresh')} variant="secondary" disabled={working} onRefresh={() => refresh()} /> : null}
    <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working ? 'none' : 'auto'}>
      {action === 'edit' ? <>
        {(['unitNumber', 'unitType', 'wingTower', 'floor', 'facing'] as const).map(key => <FormField key={key} label={t(`fields.${key}`)} required={key === 'unitNumber' || key === 'unitType'}><Input maxLength={key === 'floor' ? 40 : 80} value={draft[key] ?? ''} onChangeText={value => setDraft({ ...draft, [key]: value })} /></FormField>)}
        <FormField label={t('fields.areaSqft')}><Input keyboardType="decimal-pad" value={draft.areaSqft?.toString() ?? ''} onChangeText={text => setDraft({ ...draft, areaSqft: text ? Number(text) : undefined })} /></FormField>
        <FormField label={t('fields.priceBasis')}>{UNIT_PRICE_BASES.map(priceBasis => <SalesChoice key={priceBasis} label={t(`pricing.${priceBasis}`)} selected={draft.priceBasis === priceBasis} onPress={() => setDraft({ ...draft, priceBasis })} />)}</FormField>
        {draft.priceBasis === 'PER_SQFT' ? <FormField label={t('fields.ratePerSqft')}><Input keyboardType="decimal-pad" value={draft.ratePerSqft?.toString() ?? ''} onChangeText={text => setDraft({ ...draft, ratePerSqft: text ? Number(text) : undefined })} /></FormField> : <><FormField label={t('fields.totalPrice')}><Input keyboardType="decimal-pad" value={price} onChangeText={setPrice} /></FormField><FormField label={t('fields.priceUnit')}>{UNIT_PRICE_INPUT_UNITS.map(value => <SalesChoice key={value} label={t(`pricing.${value}`)} selected={priceUnit === value} onPress={() => setPriceUnit(value)} />)}</FormField></>}
        <FormField label={t('fields.status')}>{(['AVAILABLE', 'UNAVAILABLE', 'SOLD'] as const).map(value => <SalesChoice key={value} label={t(`unitStatus.${value}`)} selected={draft.status === value} onPress={() => setDraft({ ...draft, status: value })} />)}</FormField>
      </> : null}
      {customer && !interest ? <FormField label={t('fields.customerName')}><SearchField accessibilityLabel={t('search.a11y')} placeholder={t('search.placeholder')} value={search} onChangeText={value => { setSearch(value); setPage(1); }} />{loading ? <LoadingState label={t('loading')} /> : leads.filter(lead => lead.currentStage !== 'BOOKED' && session && canWriteLead(permissions, true, 'leads:update', lead, session.user.id)).map(lead => <SalesChoice key={lead.id} label={lead.customerName} description={lead.primaryMobile} selected={leadId === lead.id} onPress={() => setLeadId(lead.id)} />)}<Button label={t('parity.previous')} variant="secondary" disabled={page <= 1 || loading} onPress={() => setPage(page - 1)} /><Button label={t('parity.next')} variant="secondary" disabled={page * 50 >= total || loading} onPress={() => setPage(page + 1)} /></FormField> : null}
      {action === 'interest' ? <FormField label={t('fields.interestLevel')}>{(['INTERESTED', 'HIGH_INTENT', 'WITHDRAWN'] as const).map(value => <SalesChoice key={value} label={t(`unitInterestStatus.${value}`)} selected={status === value} onPress={() => setStatus(value)} />)}</FormField> : null}
      {['block', 'APPROVED'].includes(action) ? <FormField label={t('parity.expiry')}><DateInput accessibilityLabel={t('fields.date')} value={date} onChangeText={setDate} /><TimeInput accessibilityLabel={t('fields.time')} value={time} onChangeText={setTime} /></FormField> : null}
      {action !== 'edit' && action !== 'release' ? <FormField label={t('fields.notes')}><Input multiline maxLength={2000} value={notes} onChangeText={setNotes} /></FormField> : null}
    </View>
  </BottomSheet>;
}
