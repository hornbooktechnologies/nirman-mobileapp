import {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  UNIT_PRICE_BASES,
  UNIT_PRICE_INPUT_UNITS,
  type LeadPriority,
  type LeadSource,
  type UnitPriceInputUnit,
} from '@nirman-app/shared';
import { router } from 'expo-router';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppIcon,
  BottomSheet,
  Button,
  Card,
  Chip,
  CompactScreenHeader,
  EmptyState,
  FormError,
  FormField,
  IconButton,
  Input,
  LoadingState,
  NirmanScreenBackground,
  OperationalEntityCard,
  SearchField,
} from '../../components/ui';
import { formatDate, formatInr, formatNumber } from '../../i18n/formatters';
import { getLocalizedErrorMessage } from '../../i18n';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { isValidEmail, isValidNonNegativeNumber, isValidPhone, sanitizePhoneInput } from '../../lib/validation';
import { useSession } from '../../providers';
import { mobileTheme } from '../../theme';
import { ProjectContextCard } from '../projects';
import {
  cancelBooking,
  createLead,
  createUnit,
  fetchBookings,
  fetchFollowUps,
  fetchLeads,
  fetchSiteVisits,
  fetchUnits,
  releaseUnitBlock,
  updateFollowUp,
  updateSiteVisit,
  updateUnit,
} from './services';
import { SalesChoice, SalesDetailRows, SalesSectionHeading } from './sales-ui';
import type { LeadInput, SalesBooking, SalesFollowUp, SalesLead, SalesSiteVisit, SalesUnit, UnitInput } from './types';

type ViewKey = 'leads' | 'followUps' | 'visits' | 'units' | 'bookings';
type ListItem = SalesLead | SalesFollowUp | SalesSiteVisit | SalesUnit | SalesBooking;
type LeadFieldErrors = Partial<Record<'customerName' | 'primaryMobile' | 'email' | 'budgetMin' | 'budgetMax', string>>;
type UnitFieldErrors = Partial<Record<'unitNumber' | 'unitType' | 'areaSqft' | 'totalPrice' | 'ratePerSqft', string>>;

const emptyLead: LeadInput = { customerName: '', primaryMobile: '', source: 'WALK_IN', priority: 'MEDIUM' };
const emptyUnit: UnitInput = { unitNumber: '', unitType: '', priceBasis: 'TOTAL', status: 'AVAILABLE' };

const priceMultipliers: Record<UnitPriceInputUnit, number> = { RUPEE: 1, LAKH: 100_000, CRORE: 10_000_000 };

function editablePrice(value: number | null) {
  if (value == null) return { amount: '', unit: 'LAKH' as UnitPriceInputUnit };
  if (value >= 10_000_000) return { amount: String(value / 10_000_000), unit: 'CRORE' as UnitPriceInputUnit };
  if (value >= 100_000) return { amount: String(value / 100_000), unit: 'LAKH' as UnitPriceInputUnit };
  return { amount: String(value), unit: 'RUPEE' as UnitPriceInputUnit };
}

function isLead(item: ListItem): item is SalesLead { return 'currentStage' in item; }
function isFollowUp(item: ListItem): item is SalesFollowUp { return 'type' in item && 'scheduledAt' in item && 'assignedUserId' in item; }
function isVisit(item: ListItem): item is SalesSiteVisit { return 'attendeeCount' in item; }
function isUnit(item: ListItem): item is SalesUnit { return 'unitNumber' in item && 'unitType' in item && !('bookingDate' in item); }

export function SalesScreen() {
  const { t, i18n } = useTranslation('sales');
  const { t: tCommon } = useTranslation('common');
  const { t: tErrors } = useTranslation('errors');
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const language = (i18n.resolvedLanguage ?? 'en') as 'en' | 'hi' | 'gu';
  const [view, setView] = useState<ViewKey>('leads');
  const [items, setItems] = useState<ListItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNavigation, setShowNavigation] = useState(false);
  const [leadDraft, setLeadDraft] = useState<LeadInput | null>(null);
  const [leadFormError, setLeadFormError] = useState('');
  const [leadFieldErrors, setLeadFieldErrors] = useState<LeadFieldErrors>({});
  const [unitDraft, setUnitDraft] = useState<(UnitInput & { id?: string }) | null>(null);
  const [unitFormError, setUnitFormError] = useState('');
  const [unitFieldErrors, setUnitFieldErrors] = useState<UnitFieldErrors>({});
  const [unitPriceAmount, setUnitPriceAmount] = useState('');
  const [unitPriceInputUnit, setUnitPriceInputUnit] = useState<UnitPriceInputUnit>('LAKH');
  const [working, setWorking] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<SalesFollowUp | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<SalesSiteVisit | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<SalesBooking | null>(null);
  const [outcome, setOutcome] = useState('');
  const [restoredLeadStage, setRestoredLeadStage] = useState<'NEGOTIATION' | 'FOLLOW_UP_LATER' | 'NOT_INTERESTED'>('NEGOTIATION');
  const [restoredUnitStatus, setRestoredUnitStatus] = useState<'AVAILABLE' | 'UNAVAILABLE'>('AVAILABLE');
  const deferredSearch = useDeferredValue(search);
  const displayPrice = (value: number) => value >= 10_000_000
    ? t('pricing.croreValue', { value: formatNumber(value / 10_000_000, language, { maximumFractionDigits: 2 }) })
    : value >= 100_000
      ? t('pricing.lakhValue', { value: formatNumber(value / 100_000, language, { maximumFractionDigits: 2 }) })
      : formatInr(value, language, { maximumFractionDigits: 0 });

  const canReadLeads = permissions.some((permission) => permission === 'leads:read-own' || permission === 'leads:read-team' || permission === 'leads:read-all');
  const availableViews = useMemo(() => [
    ...(canReadLeads ? ['leads' as const] : []),
    ...(permissions.includes('followups:manage') ? ['followUps' as const] : []),
    ...(permissions.includes('site-visits:manage') ? ['visits' as const] : []),
    ...(permissions.includes('inventory:read') ? ['units' as const] : []),
    ...(canReadLeads ? ['bookings' as const] : []),
  ], [canReadLeads, permissions]);

  const load = useCallback(async (quiet = false) => {
    if (!session?.activeOrganization || !project) return;
    if (!availableViews.includes(view)) return;
    quiet ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const args = [session.activeOrganization.id, project.id, session.accessToken] as const;
      if (view === 'leads') setItems((await fetchLeads(...args, { search: deferredSearch })).data);
      if (view === 'followUps') setItems(await fetchFollowUps(...args));
      if (view === 'visits') setItems(await fetchSiteVisits(...args));
      if (view === 'units') setItems(await fetchUnits(...args, { search: deferredSearch }));
      if (view === 'bookings') setItems(await fetchBookings(...args));
    } catch (cause) {
      setError(getLocalizedErrorMessage(cause, t('errors.load')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [availableViews, deferredSearch, project, session, t, view]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    setItems([]);
  }, [project?.id, view]);
  useEffect(() => {
    if (!availableViews.includes(view) && availableViews[0]) setView(availableViews[0]);
  }, [availableViews, view]);

  const visibleItems = view === 'leads' || view === 'units' ? items : items.filter((item) => {
    const value = 'customerName' in item ? item.customerName : 'unitNumber' in item ? item.unitNumber : '';
    return value.toLocaleLowerCase().includes(deferredSearch.trim().toLocaleLowerCase());
  });

  async function saveLead() {
    if (!leadDraft || !session?.activeOrganization || !project) return;
    setLeadFormError('');
    const nextFieldErrors: LeadFieldErrors = {};
    if (!leadDraft.customerName.trim()) nextFieldErrors.customerName = tCommon('validation.required', { field: t('fields.customerName') });
    else if (leadDraft.customerName.trim().length < 2) nextFieldErrors.customerName = t('errors.requiredLead');
    if (!leadDraft.primaryMobile.trim()) nextFieldErrors.primaryMobile = tCommon('validation.required', { field: t('fields.primaryMobile') });
    else if (!isValidPhone(leadDraft.primaryMobile)) nextFieldErrors.primaryMobile = tCommon('validation.phone');
    if (leadDraft.email?.trim() && !isValidEmail(leadDraft.email)) nextFieldErrors.email = tCommon('validation.email');
    if (leadDraft.budgetMin !== undefined && !isValidNonNegativeNumber(String(leadDraft.budgetMin))) nextFieldErrors.budgetMin = tCommon('validation.number');
    if (leadDraft.budgetMax !== undefined && !isValidNonNegativeNumber(String(leadDraft.budgetMax))) nextFieldErrors.budgetMax = tCommon('validation.number');
    if (leadDraft.budgetMin !== undefined && leadDraft.budgetMax !== undefined && leadDraft.budgetMax < leadDraft.budgetMin) nextFieldErrors.budgetMax = tErrors('api.LEAD_BUDGET_RANGE_INVALID');
    setLeadFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;
    setWorking(true);
    try {
      await createLead(session.activeOrganization.id, project.id, session.accessToken, { ...leadDraft, primaryMobile: leadDraft.primaryMobile.trim() });
      setLeadDraft(null);
      setLeadFieldErrors({});
      await load(true);
    } catch (cause) { setLeadFormError(getLocalizedErrorMessage(cause, t('errors.save'))); }
    finally { setWorking(false); }
  }

  async function saveUnit() {
    if (!unitDraft || !session?.activeOrganization || !project) return;
    setUnitFormError('');
    const nextFieldErrors: UnitFieldErrors = {};
    if (!unitDraft.unitNumber.trim()) nextFieldErrors.unitNumber = tCommon('validation.required', { field: t('fields.unitNumber') });
    if (!unitDraft.unitType.trim()) nextFieldErrors.unitType = tCommon('validation.required', { field: t('fields.unitType') });
    const priceBasis = unitDraft.priceBasis ?? 'TOTAL';
    if (unitDraft.areaSqft !== undefined && (!isValidNonNegativeNumber(String(unitDraft.areaSqft)) || unitDraft.areaSqft <= 0)) nextFieldErrors.areaSqft = t('unitImport.errorCodes.POSITIVE_NUMBER');
    if (priceBasis === 'TOTAL' && (!Number.isFinite(Number(unitPriceAmount)) || Number(unitPriceAmount) <= 0)) nextFieldErrors.totalPrice = t('unitImport.errorCodes.POSITIVE_NUMBER');
    if (priceBasis === 'PER_SQFT' && (!unitDraft.areaSqft || unitDraft.areaSqft <= 0)) nextFieldErrors.areaSqft = t('unitImport.errorCodes.POSITIVE_NUMBER');
    if (priceBasis === 'PER_SQFT' && (!Number.isFinite(unitDraft.ratePerSqft) || !unitDraft.ratePerSqft || unitDraft.ratePerSqft <= 0)) nextFieldErrors.ratePerSqft = t('unitImport.errorCodes.POSITIVE_NUMBER');
    setUnitFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;
    setWorking(true);
    try {
      const { id, ...draft } = unitDraft;
      const input: UnitInput = priceBasis === 'TOTAL'
        ? { ...draft, priceBasis, basePrice: Number(unitPriceAmount) * priceMultipliers[unitPriceInputUnit], ratePerSqft: undefined }
        : { ...draft, priceBasis, basePrice: unitDraft.areaSqft! * unitDraft.ratePerSqft! };
      if (id) await updateUnit(session.activeOrganization.id, project.id, id, session.accessToken, input);
      else await createUnit(session.activeOrganization.id, project.id, session.accessToken, input);
      setUnitDraft(null);
      setUnitFieldErrors({});
      await load(true);
    } catch (cause) { setUnitFormError(getLocalizedErrorMessage(cause, t('errors.save'))); }
    finally { setWorking(false); }
  }

  function closeLeadForm() {
    setLeadDraft(null);
    setLeadFormError('');
    setLeadFieldErrors({});
  }

  function closeUnitForm() {
    setUnitDraft(null);
    setUnitFormError('');
    setUnitFieldErrors({});
    setUnitPriceAmount('');
    setUnitPriceInputUnit('LAKH');
  }

  async function completeFollowUp() {
    if (!selectedFollowUp || !session?.activeOrganization || !project) return;
    setWorking(true);
    try {
      await updateFollowUp(session.activeOrganization.id, project.id, selectedFollowUp.leadId, selectedFollowUp.id, session.accessToken, { status: 'COMPLETED', outcome: outcome.trim() || undefined });
      setSelectedFollowUp(null); setOutcome(''); await load(true);
    } catch (cause) { Alert.alert(t('errors.title'), getLocalizedErrorMessage(cause, t('errors.save'))); }
    finally { setWorking(false); }
  }

  async function completeVisit() {
    if (!selectedVisit || !session?.activeOrganization || !project) return;
    setWorking(true);
    try {
      await updateSiteVisit(session.activeOrganization.id, project.id, selectedVisit.leadId, selectedVisit.id, session.accessToken, { status: 'COMPLETED', customerFeedback: outcome.trim() || undefined });
      setSelectedVisit(null); setOutcome(''); await load(true);
    } catch (cause) { Alert.alert(t('errors.title'), getLocalizedErrorMessage(cause, t('errors.save'))); }
    finally { setWorking(false); }
  }

  async function releaseBlock(item: SalesUnit) {
    if (!item.activeBlockId || !session?.activeOrganization || !project) return;
    Alert.alert(t('units.releaseTitle'), t('units.releaseConfirm', { unit: item.unitNumber }), [
      { text: tCommon('actions.cancel'), style: 'cancel' },
      { text: t('units.release'), style: 'destructive', onPress: () => void (async () => {
        try { await releaseUnitBlock(session.activeOrganization!.id, project.id, item.activeBlockId!, session.accessToken); await load(true); }
        catch (cause) { Alert.alert(t('errors.title'), getLocalizedErrorMessage(cause, t('errors.save'))); }
      })() },
    ]);
  }

  async function cancelSelectedBooking() {
    if (!selectedBooking || !session?.activeOrganization || !project || !outcome.trim()) return;
    setWorking(true);
    try {
      await cancelBooking(session.activeOrganization.id, project.id, selectedBooking.id, session.accessToken, { cancellationReason: outcome.trim(), restoredLeadStage, ...(selectedBooking.unitId ? { restoredUnitStatus } : {}) });
      setSelectedBooking(null); setOutcome(''); await load(true);
    } catch (cause) { Alert.alert(t('errors.title'), getLocalizedErrorMessage(cause, t('errors.save'))); }
    finally { setWorking(false); }
  }

  function renderItem({ item }: { item: ListItem }) {
    if (isLead(item)) return <OperationalEntityCard compact accessibilityLabel={t('leads.openA11y', { name: item.customerName, stage: t(`stage.${item.currentStage}`) })} contextLeading={t(`priority.${item.priority}`)} contextTrailing={t(`stage.${item.currentStage}`)} title={item.customerName} supporting={item.primaryMobile} value={item.interestedUnitNumber ?? undefined} valueLabel={item.interestedUnitNumber ? t('leads.unit') : undefined} footerLeading={item.assignedToName ?? t('leads.unassigned')} footerTrailing={<AppIcon color={mobileTheme.color.text.muted} name="chevron-right" size={20} />} tone={item.priority === 'URGENT' ? 'danger' : item.priority === 'HIGH' ? 'warning' : 'info'} onPress={() => router.push({ pathname: '/(app)/sales-lead', params: { leadId: item.id } })} />;
    if (isFollowUp(item)) return <OperationalEntityCard compact contextLeading={t(`followUpType.${item.type}`)} contextTrailing={t(`followUpStatus.${item.status}`)} title={item.customerName} supporting={formatDate(item.scheduledAt, language, { dateStyle: 'medium', timeStyle: 'short' })} footerLeading={item.notes ?? t('followUps.noNotes')} footerTrailing={item.status === 'SCHEDULED' ? <Button fullWidth={false} label={t('followUps.complete')} size="sm" variant="success" onPress={() => { setOutcome(''); setSelectedFollowUp(item); }} /> : undefined} tone={item.status === 'COMPLETED' ? 'success' : new Date(item.scheduledAt) < new Date() && item.status === 'SCHEDULED' ? 'danger' : 'warning'} />;
    if (isVisit(item)) return <OperationalEntityCard compact contextLeading={t('visits.siteVisit')} contextTrailing={t(`visitStatus.${item.status}`)} title={item.customerName} supporting={formatDate(item.scheduledAt, language, { dateStyle: 'medium', timeStyle: 'short' })} footerLeading={item.attendeeCount ? t('visits.attendees', { count: item.attendeeCount }) : t('visits.noAttendeeCount')} footerTrailing={item.status === 'SCHEDULED' ? <Button fullWidth={false} label={t('visits.complete')} size="sm" variant="success" onPress={() => { setOutcome(''); setSelectedVisit(item); }} /> : undefined} tone={item.status === 'COMPLETED' ? 'success' : item.status === 'CANCELLED' || item.status === 'NO_SHOW' ? 'danger' : 'warning'} />;
    if (isUnit(item)) return <OperationalEntityCard compact accessibilityLabel={t('units.openInterestQueueA11y', { unit: item.unitNumber, count: Number(item.interestCount ?? 0) })} contextLeading={[item.wingTower, item.floor].filter(Boolean).join(' · ') || t('units.inventory')} contextTrailing={t(`unitStatus.${item.status}`)} title={item.unitNumber} supporting={[item.unitType, item.areaSqft ? t('units.area', { value: item.areaSqft }) : null, item.priceBasis === 'PER_SQFT' && item.ratePerSqft ? t('pricing.rateValue', { value: formatNumber(item.ratePerSqft, language) }) : null].filter(Boolean).join(' · ')} value={item.basePrice == null ? undefined : displayPrice(item.basePrice)} valueLabel={item.basePrice == null ? undefined : item.priceBasis === 'PER_SQFT' ? t('pricing.estimatedTotal') : t('pricing.totalPrice')} footerLeading={[item.blockExpiresAt ? t('units.expires', { date: formatDate(item.blockExpiresAt, language, { dateStyle: 'medium', timeStyle: 'short' }) }) : t('units.openForSale'), t('units.interestCount', { count: Number(item.interestCount ?? 0) })].join(' · ')} footerTrailing={item.status === 'BLOCKED' && item.activeBlockId && permissions.includes('inventory:block') ? <Button fullWidth={false} label={t('units.release')} size="sm" variant="danger" onPress={() => releaseBlock(item)} /> : permissions.includes('inventory:manage') ? <Button fullWidth={false} label={t('units.edit')} size="sm" variant="secondary" onPress={() => { const price = editablePrice(item.basePrice); setUnitPriceAmount(price.amount); setUnitPriceInputUnit(price.unit); setUnitFormError(''); setUnitFieldErrors({}); setUnitDraft({ id: item.id, unitNumber: item.unitNumber, unitType: item.unitType, wingTower: item.wingTower ?? undefined, floor: item.floor ?? undefined, areaSqft: item.areaSqft ?? undefined, facing: item.facing ?? undefined, basePrice: item.basePrice ?? undefined, priceBasis: item.priceBasis ?? 'TOTAL', ratePerSqft: item.ratePerSqft ?? undefined, status: item.status === 'AVAILABLE' || item.status === 'UNAVAILABLE' || item.status === 'SOLD' ? item.status : 'AVAILABLE' }); }} /> : undefined} tone={item.status === 'AVAILABLE' ? 'success' : item.status === 'BLOCKED' ? 'warning' : item.status === 'BOOKED' || item.status === 'SOLD' ? 'info' : 'neutral'} onPress={() => router.push({ pathname: '/(app)/sales-unit', params: { unitId: item.id } })} />;
    return <OperationalEntityCard compact contextLeading={t('bookings.booking')} contextTrailing={t(`bookingStatus.${item.status}`)} title={item.customerName} supporting={[item.unitNumber, item.bookingReference].filter(Boolean).join(' · ') || item.customerMobile} value={item.bookingAmount == null ? undefined : formatInr(item.bookingAmount, language, { maximumFractionDigits: 0 })} valueLabel={t('bookings.amount')} footerLeading={formatDate(item.bookingDate, language)} footerTrailing={item.status === 'CONFIRMED' && permissions.includes('leads:convert') && (!item.unitId || permissions.includes('inventory:book')) ? <Button fullWidth={false} label={t('bookings.cancel')} size="sm" variant="danger" onPress={() => { setOutcome(''); setRestoredLeadStage('NEGOTIATION'); setRestoredUnitStatus('AVAILABLE'); setSelectedBooking(item); }} /> : undefined} tone={item.status === 'CONFIRMED' ? 'success' : 'danger'} />;
  }

  if (!project || !session?.activeOrganization) return <NirmanScreenBackground><CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('title')} /><EmptyState title={t('noProject.title')} description={t('noProject.description')} actionLabel={t('noProject.action')} onAction={() => router.replace('/(app)/dashboard')} /></NirmanScreenBackground>;

  const viewTitle = t(`views.${view}.title`);
  const canCreate = view === 'leads' ? permissions.includes('leads:create') : view === 'units' ? permissions.includes('inventory:manage') : false;
  const createAction = canCreate ? view === 'units' ? <View style={styles.headingActions}>
    <IconButton icon="file-upload-outline" accessibilityLabel={t('units.import')} variant="default" onPress={() => router.push('/(app)/sales-unit-import')} />
    <IconButton icon="plus" accessibilityLabel={t('units.add')} variant="primary" onPress={() => { setUnitPriceAmount(''); setUnitPriceInputUnit('LAKH'); setUnitFormError(''); setUnitFieldErrors({}); setUnitDraft({ ...emptyUnit }); }} />
  </View> : <IconButton icon="plus" accessibilityLabel={t('leads.add')} variant="primary" onPress={() => { setLeadFormError(''); setLeadFieldErrors({}); setLeadDraft({ ...emptyLead }); }} /> : undefined;

  return <NirmanScreenBackground scroll={false}>
    <FlatList
      style={styles.flatList}
      contentContainerStyle={styles.list}
      data={loading ? [] : visibleItems}
      keyExtractor={(item) => item.id}
      keyboardShouldPersistTaps="handled"
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      renderItem={renderItem}
      ListHeaderComponent={<View style={styles.headerContent}>
        <CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('title')} subtitle={project.name} action={<IconButton icon="view-grid-outline" accessibilityLabel={t('navigation.open')} variant="glass" onPress={() => setShowNavigation(true)} />} />
        <ProjectContextCard compact showSwitchAction />
        <SalesSectionHeading title={viewTitle} description={t(`views.${view}.description`)} action={createAction} />
        <SearchField accessibilityLabel={t('search.a11y')} placeholder={t('search.placeholder')} value={search} onChangeText={setSearch} onSubmitEditing={() => void load()} />
        <FormError message={error} />
        {loading ? <LoadingState label={t('loading')} /> : null}
      </View>}
      ListEmptyComponent={!loading && !error ? <EmptyState title={t(`views.${view}.emptyTitle`)} description={t(`views.${view}.emptyDescription`)} /> : null}
    />

    <BottomSheet visible={showNavigation} title={t('navigation.title')} description={t('navigation.description')} scroll onClose={() => setShowNavigation(false)}>{availableViews.map((key) => <SalesChoice key={key} label={t(`views.${key}.title`)} description={t(`views.${key}.description`)} selected={view === key} onPress={() => { setView(key); setSearch(''); setShowNavigation(false); }} />)}</BottomSheet>

    {leadDraft ? <BottomSheet visible title={t('leads.formTitle')} description={t('leads.formDescription')} scroll showCloseButton={false} onClose={closeLeadForm} footer={<View style={styles.footer}><Button style={styles.footerButton} label={tCommon('actions.cancel')} variant="secondary" onPress={closeLeadForm} /><Button style={styles.footerButton} disabled={working} label={working ? t('saving') : t('leads.save')} onPress={() => void saveLead()} /></View>}>
      <FormError message={leadFormError} />
      <FormField label={t('fields.customerName')} required error={leadFieldErrors.customerName}><Input autoCapitalize="words" invalid={Boolean(leadFieldErrors.customerName)} value={leadDraft.customerName} onChangeText={(customerName) => { setLeadDraft({ ...leadDraft, customerName }); if (leadFieldErrors.customerName) setLeadFieldErrors((current) => ({ ...current, customerName: undefined })); }} /></FormField>
      <FormField label={t('fields.primaryMobile')} required error={leadFieldErrors.primaryMobile}><Input autoComplete="tel" invalid={Boolean(leadFieldErrors.primaryMobile)} keyboardType="phone-pad" maxLength={10} placeholder="9876543210" textContentType="telephoneNumber" value={leadDraft.primaryMobile} onBlur={() => setLeadFieldErrors((current) => ({ ...current, primaryMobile: !leadDraft.primaryMobile ? tCommon('validation.required', { field: t('fields.primaryMobile') }) : !isValidPhone(leadDraft.primaryMobile) ? tCommon('validation.phone') : undefined }))} onChangeText={(value) => { const primaryMobile = sanitizePhoneInput(value); setLeadDraft({ ...leadDraft, primaryMobile }); setLeadFieldErrors((current) => ({ ...current, primaryMobile: primaryMobile.length === 10 && !isValidPhone(primaryMobile) ? tCommon('validation.phone') : undefined })); }} /></FormField>
      <FormField label={t('fields.email')} optional error={leadFieldErrors.email}><Input autoCapitalize="none" invalid={Boolean(leadFieldErrors.email)} keyboardType="email-address" value={leadDraft.email ?? ''} onChangeText={(email) => { setLeadDraft({ ...leadDraft, email }); if (leadFieldErrors.email) setLeadFieldErrors((current) => ({ ...current, email: undefined })); }} /></FormField>
      <FormField label={t('fields.preferredUnitType')} optional><Input value={leadDraft.preferredUnitType ?? ''} onChangeText={(preferredUnitType) => setLeadDraft({ ...leadDraft, preferredUnitType })} /></FormField>
      <FormField label={t('fields.budgetMin')} optional error={leadFieldErrors.budgetMin}><Input invalid={Boolean(leadFieldErrors.budgetMin)} keyboardType="decimal-pad" value={leadDraft.budgetMin?.toString() ?? ''} onChangeText={(value) => { setLeadDraft({ ...leadDraft, budgetMin: value ? Number(value) : undefined }); if (leadFieldErrors.budgetMin || leadFieldErrors.budgetMax) setLeadFieldErrors((current) => ({ ...current, budgetMin: undefined, budgetMax: undefined })); }} /></FormField>
      <FormField label={t('fields.budgetMax')} optional error={leadFieldErrors.budgetMax}><Input invalid={Boolean(leadFieldErrors.budgetMax)} keyboardType="decimal-pad" value={leadDraft.budgetMax?.toString() ?? ''} onChangeText={(value) => { setLeadDraft({ ...leadDraft, budgetMax: value ? Number(value) : undefined }); if (leadFieldErrors.budgetMax) setLeadFieldErrors((current) => ({ ...current, budgetMax: undefined })); }} /></FormField>
      <FormField label={t('fields.source')} required>{LEAD_SOURCES.map((source: LeadSource) => <SalesChoice key={source} label={t(`source.${source}`)} selected={leadDraft.source === source} onPress={() => setLeadDraft({ ...leadDraft, source })} />)}</FormField>
      <FormField label={t('fields.priority')} required>{LEAD_PRIORITIES.map((priority: LeadPriority) => <SalesChoice key={priority} label={t(`priority.${priority}`)} selected={leadDraft.priority === priority} onPress={() => setLeadDraft({ ...leadDraft, priority })} />)}</FormField>
    </BottomSheet> : null}

    {unitDraft ? <BottomSheet visible title={unitDraft.id ? t('units.editTitle') : t('units.formTitle')} scroll showCloseButton={false} onClose={closeUnitForm} footer={<View style={styles.footer}><Button style={styles.footerButton} label={tCommon('actions.cancel')} variant="secondary" onPress={closeUnitForm} /><Button style={styles.footerButton} disabled={working} label={working ? t('saving') : t('units.save')} onPress={() => void saveUnit()} /></View>}>
      <FormError message={unitFormError} />
      <FormField label={t('fields.unitNumber')} required error={unitFieldErrors.unitNumber}><Input invalid={Boolean(unitFieldErrors.unitNumber)} value={unitDraft.unitNumber} onChangeText={(unitNumber) => { setUnitDraft({ ...unitDraft, unitNumber }); if (unitFieldErrors.unitNumber) setUnitFieldErrors((current) => ({ ...current, unitNumber: undefined })); }} /></FormField>
      <FormField label={t('fields.unitType')} required error={unitFieldErrors.unitType}><Input invalid={Boolean(unitFieldErrors.unitType)} value={unitDraft.unitType} onChangeText={(unitType) => { setUnitDraft({ ...unitDraft, unitType }); if (unitFieldErrors.unitType) setUnitFieldErrors((current) => ({ ...current, unitType: undefined })); }} /></FormField>
      <View style={styles.fieldRow}>
        <View style={styles.fieldColumn}><FormField label={t('fields.wingTower')} optional><Input value={unitDraft.wingTower ?? ''} onChangeText={(wingTower) => setUnitDraft({ ...unitDraft, wingTower })} /></FormField></View>
        <View style={styles.fieldColumn}><FormField label={t('fields.floor')} optional><Input value={unitDraft.floor ?? ''} onChangeText={(floor) => setUnitDraft({ ...unitDraft, floor })} /></FormField></View>
      </View>
      <View style={styles.fieldRow}>
        <View style={styles.fieldColumn}><FormField label={t('fields.areaSqft')} required={unitDraft.priceBasis === 'PER_SQFT'} optional={unitDraft.priceBasis !== 'PER_SQFT'} error={unitFieldErrors.areaSqft}><Input invalid={Boolean(unitFieldErrors.areaSqft)} keyboardType="decimal-pad" value={unitDraft.areaSqft?.toString() ?? ''} onChangeText={(value) => { setUnitDraft({ ...unitDraft, areaSqft: value ? Number(value) : undefined }); if (unitFieldErrors.areaSqft) setUnitFieldErrors((current) => ({ ...current, areaSqft: undefined })); }} /></FormField></View>
        <View style={styles.fieldColumn}><FormField label={t('fields.facing')} optional><Input value={unitDraft.facing ?? ''} onChangeText={(facing) => setUnitDraft({ ...unitDraft, facing })} /></FormField></View>
      </View>
      <FormField label={t('fields.priceBasis')} required><View accessibilityRole="radiogroup" style={styles.chipRow}>{UNIT_PRICE_BASES.map((priceBasis) => <Chip key={priceBasis} label={t(`pricing.${priceBasis}`)} selected={(unitDraft.priceBasis ?? 'TOTAL') === priceBasis} style={styles.choiceChip} onPress={() => { setUnitDraft({ ...unitDraft, priceBasis, ratePerSqft: priceBasis === 'TOTAL' ? undefined : unitDraft.ratePerSqft }); setUnitFieldErrors((current) => ({ ...current, totalPrice: undefined, ratePerSqft: undefined })); }} />)}</View></FormField>
      {(unitDraft.priceBasis ?? 'TOTAL') === 'TOTAL' ? <>
        <FormField label={t('fields.totalPrice')} required error={unitFieldErrors.totalPrice}><Input invalid={Boolean(unitFieldErrors.totalPrice)} keyboardType="decimal-pad" value={unitPriceAmount} onChangeText={(value) => { setUnitPriceAmount(value.replace(/[^0-9.]/g, '')); if (unitFieldErrors.totalPrice) setUnitFieldErrors((current) => ({ ...current, totalPrice: undefined })); }} /></FormField>
        <FormField label={t('fields.priceUnit')} required><View accessibilityRole="radiogroup" style={styles.chipRow}>{UNIT_PRICE_INPUT_UNITS.map((unit) => <Chip key={unit} label={t(`pricing.${unit}`)} selected={unitPriceInputUnit === unit} style={styles.choiceChip} onPress={() => setUnitPriceInputUnit(unit)} />)}</View></FormField>
      </> : <FormField label={t('fields.ratePerSqft')} required error={unitFieldErrors.ratePerSqft}><Input invalid={Boolean(unitFieldErrors.ratePerSqft)} keyboardType="decimal-pad" value={unitDraft.ratePerSqft?.toString() ?? ''} onChangeText={(value) => { setUnitDraft({ ...unitDraft, ratePerSqft: value ? Number(value) : undefined }); if (unitFieldErrors.ratePerSqft) setUnitFieldErrors((current) => ({ ...current, ratePerSqft: undefined })); }} /></FormField>}
      {((unitDraft.priceBasis ?? 'TOTAL') === 'TOTAL' ? Number(unitPriceAmount) * priceMultipliers[unitPriceInputUnit] : (unitDraft.areaSqft ?? 0) * (unitDraft.ratePerSqft ?? 0)) > 0 ? <Card variant="blueprint" padding="sm"><SalesDetailRows rows={[{ label: (unitDraft.priceBasis ?? 'TOTAL') === 'PER_SQFT' ? t('pricing.estimatedTotal') : t('pricing.totalPrice'), value: formatInr((unitDraft.priceBasis ?? 'TOTAL') === 'TOTAL' ? Number(unitPriceAmount) * priceMultipliers[unitPriceInputUnit] : (unitDraft.areaSqft ?? 0) * (unitDraft.ratePerSqft ?? 0), language, { maximumFractionDigits: 0 }) }]} /></Card> : null}
      <FormField label={t('fields.status')} required><View accessibilityRole="radiogroup" style={styles.chipRow}>{(['AVAILABLE', 'UNAVAILABLE', 'SOLD'] as const).map((status) => <Chip key={status} label={t(`unitStatus.${status}`)} selected={unitDraft.status === status} style={styles.choiceChip} onPress={() => setUnitDraft({ ...unitDraft, status })} />)}</View></FormField>
    </BottomSheet> : null}

    {selectedFollowUp ? <BottomSheet visible title={t('followUps.completeTitle')} showCloseButton={false} onClose={() => setSelectedFollowUp(null)} footer={<View style={styles.footer}><Button style={styles.footerButton} label={tCommon('actions.cancel')} variant="secondary" onPress={() => setSelectedFollowUp(null)} /><Button style={styles.footerButton} disabled={working} label={t('followUps.complete')} variant="success" onPress={() => void completeFollowUp()} /></View>}><FormField label={t('fields.outcome')} optional><Input multiline numberOfLines={3} value={outcome} onChangeText={setOutcome} style={styles.multiline} /></FormField></BottomSheet> : null}
    {selectedVisit ? <BottomSheet visible title={t('visits.completeTitle')} showCloseButton={false} onClose={() => setSelectedVisit(null)} footer={<View style={styles.footer}><Button style={styles.footerButton} label={tCommon('actions.cancel')} variant="secondary" onPress={() => setSelectedVisit(null)} /><Button style={styles.footerButton} disabled={working} label={t('visits.complete')} variant="success" onPress={() => void completeVisit()} /></View>}><FormField label={t('fields.customerFeedback')} optional><Input multiline numberOfLines={3} value={outcome} onChangeText={setOutcome} style={styles.multiline} /></FormField></BottomSheet> : null}
    {selectedBooking ? <BottomSheet visible title={t('bookings.cancelTitle')} description={t('bookings.cancelDescription')} scroll showCloseButton={false} onClose={() => setSelectedBooking(null)} footer={<View style={styles.footer}><Button style={styles.footerButton} label={tCommon('actions.cancel')} variant="secondary" onPress={() => setSelectedBooking(null)} /><Button style={styles.footerButton} disabled={working || !outcome.trim()} label={t('bookings.cancel')} variant="danger" onPress={() => void cancelSelectedBooking()} /></View>}><SalesDetailRows rows={[{ label: t('fields.customerName'), value: selectedBooking.customerName }, { label: t('fields.unitNumber'), value: selectedBooking.unitNumber }]} /><FormField label={t('fields.cancellationReason')} required><Input multiline numberOfLines={3} value={outcome} onChangeText={setOutcome} style={styles.multiline} /></FormField><FormField label={t('fields.restoredLeadStage')} required>{(['NEGOTIATION', 'FOLLOW_UP_LATER', 'NOT_INTERESTED'] as const).map((value) => <SalesChoice key={value} label={t(`stage.${value}`)} selected={restoredLeadStage === value} onPress={() => setRestoredLeadStage(value)} />)}</FormField>{selectedBooking.unitId ? <FormField label={t('fields.restoredUnitStatus')} required>{(['AVAILABLE', 'UNAVAILABLE'] as const).map((value) => <SalesChoice key={value} label={t(`unitStatus.${value}`)} selected={restoredUnitStatus === value} onPress={() => setRestoredUnitStatus(value)} />)}</FormField> : null}</BottomSheet> : null}
  </NirmanScreenBackground>;
}

const styles = StyleSheet.create({
  flatList: { flex: 1 },
  list: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[8] },
  headerContent: { gap: mobileTheme.spacing[5], marginBottom: mobileTheme.spacing[3] },
  headingActions: { flexDirection: 'row', gap: mobileTheme.spacing[2] },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[3] },
  fieldColumn: { flex: 1, minWidth: 140 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  choiceChip: { minHeight: 48 },
  footer: { flex: 1, flexDirection: 'row', gap: mobileTheme.spacing[3] },
  footerButton: { flex: 1 },
  multiline: { minHeight: 96, paddingTop: mobileTheme.spacing[3], textAlignVertical: 'top' },
});
