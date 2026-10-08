import { RefreshFlatList } from "../../components/ui/refresh-control";

import { RefreshButton } from "../../components/ui/refresh-button";
import { LEAD_PRIORITIES, LEAD_SOURCES, SITE_VISIT_STATUSES, UNIT_PRICE_BASES, UNIT_PRICE_INPUT_UNITS, type BookingStatus, type LeadStage, type FollowUpStatus, type UnitStatus, type LeadPriority, type LeadSource, type SiteVisitStatus, type UnitPriceInputUnit } from '@nirman-app/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon, BottomSheet, Button, Card, Chip, CompactScreenHeader, DateInput, EmptyState, FormError, FormField, IconButton, Input, ListControls, LoadingState, NirmanScreenBackground, OperationalEntityCard, SearchField } from '../../components/ui';
import { formatDate, formatInr, formatNumber } from '../../i18n/formatters';
import { getLocalizedErrorMessage } from '../../i18n';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { isValidEmail, isValidNonNegativeNumber, isValidPhone } from '../../lib/validation';
import { useSession } from '../../providers';
import { mobileTheme } from '../../theme';
import { ProjectContextCard } from '../projects';
import { createLead, createUnit, fetchBookings, fetchLead, fetchFollowUps, fetchLeads, fetchSiteVisits, fetchUnits, releaseUnitBlock, updateSiteVisit, updateUnit } from './services';
import { FollowUpUpdateSheet } from './follow-up-update-sheet';
import { LeadAdditionalFields } from './lead-additional-fields';
import { SalesListFilters, type SalesFiltersValue } from './sales-filters';
import { ApiRequestError } from '../../lib/api';
import { callableNumber, canWriteLead, uncertainWrite, dateRange, localTime, scheduleInstant } from './sales-rules';
import { SalesChoice, SalesDetailRows, SalesSectionHeading } from './sales-ui';
import type { LeadInput, SalesBooking, SalesFollowUp, SalesLead, SalesSiteVisit, SalesUnit, UnitInput } from './types';

type ViewKey = 'leads' | 'followUps' | 'visits' | 'units' | 'bookings';
type ListItem = SalesLead | SalesFollowUp | SalesSiteVisit | SalesUnit | SalesBooking;
type LeadFieldErrors = Partial<Record<'customerName' | 'primaryMobile' | 'email' | 'budgetMin' | 'budgetMax', string>>;
type UnitFieldErrors = Partial<Record<'unitNumber' | 'unitType' | 'areaSqft' | 'totalPrice' | 'ratePerSqft', string>>;

const emptyLead: LeadInput = {
  customerName: '',
  primaryMobile: '',
  source: 'WALK_IN',
  priority: 'MEDIUM',
};
const emptyUnit: UnitInput = {
  unitNumber: '',
  unitType: '',
  priceBasis: 'TOTAL',
  status: 'AVAILABLE',
};

const priceMultipliers: Record<UnitPriceInputUnit, number> = {
  RUPEE: 1,
  LAKH: 100_000,
  CRORE: 10_000_000,
};

function editablePrice(value: number | null) {
  if (value == null) return { amount: '', unit: 'LAKH' as UnitPriceInputUnit };
  if (value >= 10_000_000)
    return {
      amount: String(value / 10_000_000),
      unit: 'CRORE' as UnitPriceInputUnit,
    };
  if (value >= 100_000)
    return {
      amount: String(value / 100_000),
      unit: 'LAKH' as UnitPriceInputUnit,
    };
  return { amount: String(value), unit: 'RUPEE' as UnitPriceInputUnit };
}

function isLead(item: ListItem): item is SalesLead {
  return 'currentStage' in item;
}
function isFollowUp(item: ListItem): item is SalesFollowUp {
  return 'type' in item && 'scheduledAt' in item && 'assignedUserId' in item;
}
function isVisit(item: ListItem): item is SalesSiteVisit {
  return 'attendeeCount' in item;
}
function isUnit(item: ListItem): item is SalesUnit {
  return 'unitNumber' in item && 'unitType' in item && !('bookingDate' in item);
}

export function SalesScreen() {
  const { t, i18n } = useTranslation('sales');
  const { t: tCommon } = useTranslation('common');
  const { t: tErrors } = useTranslation('errors');
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id;
  const projectId = project?.id;
  const accessToken = session?.accessToken;
  const language = (i18n.resolvedLanguage ?? 'en') as 'en' | 'hi' | 'gu';
  const timezone = session?.activeOrganization?.workingTimezone || session?.activeOrganization?.timezone || 'Asia/Kolkata';
  const active = project?.status === 'ACTIVE';
  const team = permissions.includes('leads:read-all') || permissions.includes('leads:read-team');
  const [filters, setFilters] = useState<SalesFiltersValue>({});
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const requestSequence = useRef(0);
  const lastRead = useRef('');
  const writeLock = useRef(false);
  const alive = useRef(true);
  const [visitError, setVisitError] = useState('');
  const [visitReview, setVisitReview] = useState(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const localScheduleParts = (value: string) => { const wall = localTime(value, timezone); return { date: wall.slice(0, 10), time: wall.slice(11) }; };
  const toScheduleIso = (date: string, time: string) => scheduleInstant(`${date}T${time}`, timezone);
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
  const [commandReview, setCommandReview] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState<SalesFollowUp | null>(null);
  const [selectedVisit, setSelectedVisit] = useState<SalesSiteVisit | null>(null);

  const [visitStatus, setVisitStatus] = useState<Exclude<SiteVisitStatus, 'SCHEDULED'>>('COMPLETED');
  const [visitFeedback, setVisitFeedback] = useState('');
  const [visitObjections, setVisitObjections] = useState('');
  const [visitNextAction, setVisitNextAction] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [visitAttendeeCount, setVisitAttendeeCount] = useState('');

  const [completeMode, setCompleteMode] = useState(false);
  const deferredSearch = search;
  const displayPrice = (value: number) =>
    value >= 10_000_000
      ? t('pricing.croreValue', {
          value: formatNumber(value / 10_000_000, language, {
            maximumFractionDigits: 2,
          }),
        })
      : value >= 100_000
        ? t('pricing.lakhValue', {
            value: formatNumber(value / 100_000, language, {
              maximumFractionDigits: 2,
            }),
          })
        : formatInr(value, language, { maximumFractionDigits: 0 });

  const canReadLeads = permissions.some((permission) => permission === 'leads:read-own' || permission === 'leads:read-team' || permission === 'leads:read-all');
  const canManageFollowUps = permissions.includes('followups:manage');
  const canManageSiteVisits = permissions.includes('site-visits:manage');
  const canReadInventory = permissions.includes('inventory:read');
  const availableViews = useMemo(() => [...(canReadLeads ? ['leads' as const] : []), ...(canReadLeads ? ['followUps' as const] : []), ...(canReadLeads ? ['visits' as const] : []), ...(canReadInventory ? ['units' as const] : []), ...(canReadLeads ? ['bookings' as const] : [])], [canManageFollowUps, canManageSiteVisits, canReadInventory, canReadLeads]);

  const load = useCallback(
    async (quiet = false) => {
      if (!organizationId || !projectId || !accessToken) return;
      if (!availableViews.includes(view)) return;
      const sequence = ++requestSequence.current;
      quiet ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const args = [organizationId, projectId, accessToken] as const;
        const range = dateRange(filters.from ?? '', filters.to ?? '', timezone);
        let next: ListItem[];
        if (view === 'leads') {
          const result = await fetchLeads(...args, { search: deferredSearch, stage: filters.status as LeadStage | undefined, assignedTo: team ? filters.assignedTo : undefined, page });
          next = result.data;
          if (sequence === requestSequence.current) setTotal(result.meta.total);
        } else if (view === 'followUps') next = await fetchFollowUps(...args, { search: deferredSearch, status: filters.status as FollowUpStatus | undefined, assignedTo: team ? filters.assignedTo : undefined, ...range });
        else if (view === 'visits') next = await fetchSiteVisits(...args, { search: deferredSearch, status: filters.status as SiteVisitStatus | undefined, assignedSalesperson: team ? filters.assignedTo : undefined, scheduledFrom: range.from, scheduledTo: range.to });
        else if (view === 'units') next = await fetchUnits(...args, { search: deferredSearch, status: filters.status as UnitStatus | undefined });
        else next = await fetchBookings(...args, { search: deferredSearch, status: filters.status as BookingStatus | undefined, bookedFrom: filters.from || undefined, bookedTo: filters.to || undefined });
        if (sequence === requestSequence.current) { setItems(next); setCommandReview(false); }
      } catch (cause) {
        if (sequence === requestSequence.current) setError(getLocalizedErrorMessage(cause, t('errors.load')));
      } finally {
        if (sequence === requestSequence.current) { setLoading(false); setRefreshing(false); }
      }
    },
    [accessToken, availableViews, deferredSearch, organizationId, projectId, t, view, filters, page, team, timezone],
  );

  useFocusEffect(useCallback(() => { const identity = JSON.stringify([organizationId, projectId, view, filters, page, deferredSearch]); const quiet = lastRead.current === identity; lastRead.current = identity; void load(quiet); return () => { requestSequence.current += 1; }; }, [load, organizationId, projectId, view, filters, page, deferredSearch]));
  useEffect(() => {
    setItems([]);
  }, [project?.id, view]);
  useEffect(() => {
    if (!availableViews.includes(view) && availableViews[0]) setView(availableViews[0]);
  }, [availableViews, view]);

  const visibleItems = items;

  async function saveLead() {
    if (writeLock.current || commandReview || !active || !permissions.includes('leads:create') || !leadDraft || !session?.activeOrganization || !project) return;
    setLeadFormError('');
    const nextFieldErrors: LeadFieldErrors = {};
    if (!leadDraft.customerName.trim())
      nextFieldErrors.customerName = tCommon('validation.required', {
        field: t('fields.customerName'),
      });
    else if (leadDraft.customerName.trim().length < 2) nextFieldErrors.customerName = t('errors.requiredLead');
    if (!leadDraft.primaryMobile.trim())
      nextFieldErrors.primaryMobile = tCommon('validation.required', {
        field: t('fields.primaryMobile'),
      });
    else if (!callableNumber(leadDraft.primaryMobile)) nextFieldErrors.primaryMobile = tCommon('validation.phone');
    if (leadDraft.email?.trim() && !isValidEmail(leadDraft.email)) nextFieldErrors.email = tCommon('validation.email');
    if (leadDraft.budgetMin !== undefined && !isValidNonNegativeNumber(String(leadDraft.budgetMin))) nextFieldErrors.budgetMin = tCommon('validation.number');
    if (leadDraft.budgetMax !== undefined && !isValidNonNegativeNumber(String(leadDraft.budgetMax))) nextFieldErrors.budgetMax = tCommon('validation.number');
    if (leadDraft.budgetMin !== undefined && leadDraft.budgetMax !== undefined && leadDraft.budgetMax < leadDraft.budgetMin) nextFieldErrors.budgetMax = tErrors('api.LEAD_BUDGET_RANGE_INVALID');
    setLeadFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;
    writeLock.current = true; setWorking(true);
    try {
      await createLead(session.activeOrganization.id, project.id, session.accessToken, { ...leadDraft, primaryMobile: leadDraft.primaryMobile.trim() });
      if (!alive.current) return;
      setLeadDraft(null);
      setLeadFieldErrors({});
      await load(true);
    } catch (cause) {
      if (alive.current) { if (uncertainWrite(cause instanceof ApiRequestError ? cause.status : undefined)) setCommandReview(true); setLeadFormError(getLocalizedErrorMessage(cause, t('parity.uncertain'))); }
    } finally {
      writeLock.current = false; if (alive.current) setWorking(false);
    }
  }

  async function saveUnit() {
    if (writeLock.current || commandReview || !active || !permissions.includes('inventory:manage') || !unitDraft || !session?.activeOrganization || !project) return;
    setUnitFormError('');
    const nextFieldErrors: UnitFieldErrors = {};
    if (!unitDraft.unitNumber.trim())
      nextFieldErrors.unitNumber = tCommon('validation.required', {
        field: t('fields.unitNumber'),
      });
    if (!unitDraft.unitType.trim())
      nextFieldErrors.unitType = tCommon('validation.required', {
        field: t('fields.unitType'),
      });
    const priceBasis = unitDraft.priceBasis ?? 'TOTAL';
    if (unitDraft.areaSqft !== undefined && (!isValidNonNegativeNumber(String(unitDraft.areaSqft)) || unitDraft.areaSqft <= 0)) nextFieldErrors.areaSqft = t('unitImport.errorCodes.POSITIVE_NUMBER');
    if (priceBasis === 'TOTAL' && (!Number.isFinite(Number(unitPriceAmount)) || Number(unitPriceAmount) <= 0)) nextFieldErrors.totalPrice = t('unitImport.errorCodes.POSITIVE_NUMBER');
    if (priceBasis === 'PER_SQFT' && (!unitDraft.areaSqft || unitDraft.areaSqft <= 0)) nextFieldErrors.areaSqft = t('unitImport.errorCodes.POSITIVE_NUMBER');
    if (priceBasis === 'PER_SQFT' && (!Number.isFinite(unitDraft.ratePerSqft) || !unitDraft.ratePerSqft || unitDraft.ratePerSqft <= 0)) nextFieldErrors.ratePerSqft = t('unitImport.errorCodes.POSITIVE_NUMBER');
    setUnitFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;
    writeLock.current = true; setWorking(true);
    try {
      const { id, ...draft } = unitDraft;
      const input: UnitInput =
        priceBasis === 'TOTAL'
          ? {
              ...draft,
              priceBasis,
              basePrice: Number(unitPriceAmount) * priceMultipliers[unitPriceInputUnit],
              ratePerSqft: undefined,
            }
          : {
              ...draft,
              priceBasis,
              basePrice: undefined,
            };
      if (id) { const current = (await fetchUnits(session.activeOrganization.id, project.id, session.accessToken)).find(row => row.id === id); if (!alive.current) return; if (!current || ['BLOCKED', 'BOOKED'].includes(current.status)) throw new Error(t('parity.stale')); }
      if (id) await updateUnit(session.activeOrganization.id, project.id, id, session.accessToken, input);
      else await createUnit(session.activeOrganization.id, project.id, session.accessToken, input);
      setUnitDraft(null);
      setUnitFieldErrors({});
      await load(true);
    } catch (cause) {
      if (alive.current) { if (uncertainWrite(cause instanceof ApiRequestError ? cause.status : undefined)) setCommandReview(true); setUnitFormError(getLocalizedErrorMessage(cause, t('parity.uncertain'))); }
    } finally {
      writeLock.current = false; if (alive.current) setWorking(false);
    }
  }

  function confirmClose(close: () => void) { if (writeLock.current) return; Alert.alert(t('parity.discardTitle'), t('parity.discardDescription'), [{ text: tCommon('actions.cancel'), style: 'cancel' }, { text: tCommon('actions.close'), style: 'destructive', onPress: close }]); }

  function closeLeadForm() {
    confirmClose(() => setLeadDraft(null));
  }

  function closeUnitForm() {
    confirmClose(() => setUnitDraft(null));
  }

  function openVisitOutcome(item: SalesSiteVisit) {
    const schedule = localScheduleParts(item.scheduledAt);
    setVisitError(''); setVisitReview(false); setSelectedVisit(item);
    setVisitStatus('COMPLETED');
    setVisitFeedback(item.customerFeedback ?? '');
    setVisitObjections(item.objectionsConcerns ?? '');
    setVisitNextAction(item.nextAction ?? '');
    setVisitDate(schedule.date);
    setVisitTime(schedule.time);
    setVisitAttendeeCount(item.attendeeCount == null ? '' : String(item.attendeeCount));
  }

  async function saveVisitOutcome() {
    if (writeLock.current || visitReview || !active || !permissions.includes('site-visits:manage') || !selectedVisit || !session?.activeOrganization || !project) return;
    const scheduledAt = visitStatus === 'RESCHEDULED' ? toScheduleIso(visitDate, visitTime) : undefined;
    if (visitStatus === 'RESCHEDULED' && !scheduledAt) { setVisitError(tCommon('validation.date')); return; }
    if (visitAttendeeCount && (!Number.isInteger(Number(visitAttendeeCount)) || Number(visitAttendeeCount) < 1 || Number(visitAttendeeCount) > 1000)) { setVisitError(t('leadDetail.attendeeCountError')); return; }
    writeLock.current = true; setWorking(true); setVisitError('');
    try {
      const lead = await fetchLead(session.activeOrganization.id, project.id, selectedVisit.leadId, session.accessToken);
      const current = (await fetchSiteVisits(session.activeOrganization.id, project.id, session.accessToken)).find(row => row.id === selectedVisit.id);
      if (!alive.current) return;
      if (!canWriteLead(permissions, active, 'site-visits:manage', lead, session.user.id)) throw new Error(t('parity.accessDenied'));
      if (!current || !['SCHEDULED', 'RESCHEDULED'].includes(current.status) || JSON.stringify(current) !== JSON.stringify(selectedVisit)) { setVisitReview(true); throw new Error(t('parity.stale')); }
      await updateSiteVisit(session.activeOrganization.id, project.id, selectedVisit.leadId, selectedVisit.id, session.accessToken, {
        status: visitStatus,
        ...(scheduledAt ? { scheduledAt } : {}),
        ...(visitAttendeeCount ? { attendeeCount: Number(visitAttendeeCount) } : {}),
        customerFeedback: visitFeedback.trim() || undefined,
        objectionsConcerns: visitObjections.trim() || undefined,
        nextAction: visitNextAction.trim() || undefined,
      });
      if (!alive.current) return;
      setSelectedVisit(null);
      await load(true);
    } catch (cause) {
      if (alive.current) { if (uncertainWrite(cause instanceof ApiRequestError ? cause.status : undefined)) setVisitReview(true); setVisitError(getLocalizedErrorMessage(cause, t('parity.uncertain'))); }
    } finally {
      writeLock.current = false; if (alive.current) setWorking(false);
    }
  }

  async function releaseBlock(item: SalesUnit) {
    if (writeLock.current || !active || !permissions.includes('inventory:block') || !item.activeBlockId || !session?.activeOrganization || !project) return;
    Alert.alert(t('units.releaseTitle'), t('units.releaseConfirm', { unit: item.unitNumber }), [
      { text: tCommon('actions.cancel'), style: 'cancel' },
      {
        text: t('units.release'),
        style: 'destructive',
        onPress: () =>
          void (async () => {
            if (writeLock.current || !alive.current) return;
            writeLock.current = true;
            try {
              const current = (await fetchUnits(session.activeOrganization!.id, project.id, session.accessToken)).find(row => row.id === item.id);
              if (!alive.current) return;
              if (!current || current.status !== 'BLOCKED' || current.activeBlockId !== item.activeBlockId) throw new Error(t('parity.stale'));
              await releaseUnitBlock(session.activeOrganization!.id, project.id, item.activeBlockId!, session.accessToken);
              await load(true);
            } catch (cause) {
              if (alive.current) Alert.alert(t('errors.title'), getLocalizedErrorMessage(cause, t('parity.uncertain')));
            } finally { writeLock.current = false; }
          })(),
      },
    ]);
  }

  function renderItem({ item }: { item: ListItem }) {
    if (isLead(item))
      return (
        <OperationalEntityCard
          compact
          accessibilityLabel={t('leads.openA11y', {
            name: item.customerName,
            stage: t(`stage.${item.currentStage}`),
          })}
          contextLeading={t(`priority.${item.priority}`)}
          contextTrailing={t(`stage.${item.currentStage}`)}
          title={item.customerName}
          supporting={item.primaryMobile}
          value={item.interestedUnitNumber ?? undefined}
          valueLabel={item.interestedUnitNumber ? t('leads.unit') : undefined}
          footerLeading={item.assignedToName ?? t('leads.unassigned')}
          footerTrailing={<AppIcon color={mobileTheme.color.text.muted} name="chevron-right" size={20} />}
          tone={item.priority === 'URGENT' ? 'danger' : item.priority === 'HIGH' ? 'warning' : 'info'}
          onPress={() =>
            router.push({
              pathname: '/(app)/sales-lead',
              params: { leadId: item.id },
            })
          }
        />
      );
    if (isFollowUp(item))
      return (
        <OperationalEntityCard
          compact
          contextLeading={t(`followUpType.${item.type}`)}
          contextTrailing={t(`followUpStatus.${item.status}`)}
          title={item.customerName}
          supporting={formatDate(item.scheduledAt, language, {
            dateStyle: 'medium',
            timeStyle: 'short', timeZone: timezone,
          })}
          footerLeading={item.notes ?? t('followUps.noNotes')}
          details={<SalesDetailRows rows={[{ label: t('fields.outcome'), value: item.outcome }, { label: t('fields.notes'), value: item.notes }, { label: t('parity.nextTime'), value: item.nextFollowUpAt ? formatDate(item.nextFollowUpAt, language, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }) : null }, { label: t('parity.completedAt'), value: item.completedAt ? formatDate(item.completedAt, language, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }) : null }]} />}
          onPress={() => router.push({ pathname: '/(app)/sales-lead', params: { leadId: item.leadId } })}
          footerTrailing={active && canManageFollowUps ? <View style={styles.headingActions}><Button fullWidth={false} label={t('parity.update')} size="sm" variant="secondary" onPress={() => { setCompleteMode(false); setSelectedFollowUp(item); }} />{item.status === 'SCHEDULED' ? <Button fullWidth={false} label={t('followUps.complete')} size="sm" variant="success" onPress={() => { setCompleteMode(true); setSelectedFollowUp(item); }} /> : null}</View> : undefined}
          tone={item.status === 'COMPLETED' ? 'success' : new Date(item.scheduledAt) < new Date() && item.status === 'SCHEDULED' ? 'danger' : 'warning'}
        />
      );
    if (isVisit(item))
      return (
        <OperationalEntityCard
          compact
          accessibilityLabel={t('visits.openA11y', {
            customer: item.customerName,
            status: t(`visitStatus.${item.status}`),
          })}
          contextLeading={item.assignedSalespersonName}
          contextTrailing={t(`visitStatus.${item.status}`)}
          title={item.customerName}
          supporting={formatDate(item.scheduledAt, language, {
            dateStyle: 'medium',
            timeStyle: 'short', timeZone: timezone,
          })}
          details={<SalesDetailRows rows={[{ label: t('fields.objectionsConcerns'), value: item.objectionsConcerns }, { label: t('fields.nextAction'), value: item.nextAction }, { label: t('parity.completedAt'), value: item.completedAt ? formatDate(item.completedAt, language, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }) : null }]} />}
          onPress={() => router.push({ pathname: '/(app)/sales-lead', params: { leadId: item.leadId } })}
          value={item.customerFeedback ?? undefined}
          valueLabel={item.customerFeedback ? t('fields.customerFeedback') : undefined}
          footerLeading={item.attendeeCount ? t('visits.attendees', { count: item.attendeeCount }) : t('visits.noAttendeeCount')}
          footerTrailing={active && canManageSiteVisits && (item.status === 'SCHEDULED' || item.status === 'RESCHEDULED') ? <Button fullWidth={false} label={t('visits.update')} size="sm" variant="secondary" onPress={() => openVisitOutcome(item)} /> : undefined}
          tone={item.status === 'COMPLETED' ? 'success' : item.status === 'CANCELLED' || item.status === 'NO_SHOW' ? 'danger' : 'warning'}
        />
      );
    if (isUnit(item))
      return (
        <OperationalEntityCard
          compact
          accessibilityLabel={t('units.openInterestQueueA11y', {
            unit: item.unitNumber,
            count: Number(item.interestCount ?? 0),
          })}
          contextLeading={[item.wingTower, item.floor].filter(Boolean).join(' · ') || t('units.inventory')}
          contextTrailing={t(`unitStatus.${item.status}`)}
          title={item.unitNumber}
          supporting={[
            item.unitType,
            item.areaSqft ? t('units.area', { value: item.areaSqft }) : null,
            item.priceBasis === 'PER_SQFT' && item.ratePerSqft
              ? t('pricing.rateValue', {
                  value: formatNumber(item.ratePerSqft, language),
                })
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
          value={item.basePrice == null ? undefined : displayPrice(item.basePrice)}
          valueLabel={item.basePrice == null ? undefined : item.priceBasis === 'PER_SQFT' ? t('pricing.estimatedTotal') : t('pricing.totalPrice')}
          footerLeading={[
            item.blockExpiresAt
              ? t('units.expires', {
                  date: formatDate(item.blockExpiresAt, language, {
                    dateStyle: 'medium',
                    timeStyle: 'short', timeZone: timezone,
                  }),
                })
              : t('units.openForSale'),
            t('units.interestCount', {
              count: Number(item.interestCount ?? 0),
            }),
          ].join(' · ')}
          footerTrailing={
            active && item.status === 'BLOCKED' && item.activeBlockId && permissions.includes('inventory:block') ? (
              <Button fullWidth={false} label={t('units.release')} size="sm" variant="danger" onPress={() => releaseBlock(item)} />
            ) : active && permissions.includes('inventory:manage') && !['BLOCKED', 'BOOKED'].includes(item.status) ? (
              <Button
                fullWidth={false}
                label={t('units.edit')}
                size="sm"
                variant="secondary"
                onPress={() => {
                  const price = editablePrice(item.basePrice);
                  setUnitPriceAmount(price.amount);
                  setUnitPriceInputUnit(price.unit);
                  setUnitFormError('');
                  setUnitFieldErrors({});
                  setUnitDraft({
                    id: item.id,
                    unitNumber: item.unitNumber,
                    unitType: item.unitType,
                    wingTower: item.wingTower ?? undefined,
                    floor: item.floor ?? undefined,
                    areaSqft: item.areaSqft ?? undefined,
                    facing: item.facing ?? undefined,
                    basePrice: item.basePrice ?? undefined,
                    priceBasis: item.priceBasis ?? 'TOTAL',
                    ratePerSqft: item.ratePerSqft ?? undefined,
                    status: item.status === 'AVAILABLE' || item.status === 'UNAVAILABLE' || item.status === 'SOLD' ? item.status : 'AVAILABLE',
                  });
                }}
              />
            ) : undefined
          }
          tone={item.status === 'AVAILABLE' ? 'success' : item.status === 'BLOCKED' ? 'warning' : item.status === 'BOOKED' || item.status === 'SOLD' ? 'info' : 'neutral'}
          onPress={() =>
            router.push({
              pathname: '/(app)/sales-unit',
              params: { unitId: item.id },
            })
          }
        />
      );
    return (
      <OperationalEntityCard
        compact
        accessibilityLabel={t('bookings.openA11y', {
          customer: item.customerName,
          status: t(`bookingStatus.${item.status}`),
        })}
        contextLeading={item.bookedByName ?? t('bookings.booking')}
        contextTrailing={t(`bookingStatus.${item.status}`)}
        title={item.customerName}
        supporting={[item.unitNumber, item.bookingReference].filter(Boolean).join(' · ') || item.customerMobile}
        value={
          item.bookingAmount == null
            ? undefined
            : formatInr(item.bookingAmount, language, {
                maximumFractionDigits: 2,
              })
        }
        valueLabel={t('bookings.amount')}
        footerLeading={formatDate(`${item.bookingDate.slice(0, 10)}T12:00:00`, language)}
        footerTrailing={<AppIcon color={mobileTheme.color.text.muted} name="chevron-right" size={20} />}
        tone={item.status === 'CONFIRMED' ? 'success' : 'danger'}
        onPress={() =>
          router.push({
            pathname: '/(app)/sales-booking',
            params: { bookingId: item.id },
          })
        }
      />
    );
  }

  if (!project || !session?.activeOrganization)
    return (
      <NirmanScreenBackground>
        <CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('title')} />
        <EmptyState title={t('noProject.title')} description={t('noProject.description')} actionLabel={t('noProject.action')} onAction={() => router.replace('/(app)/dashboard')} />
      </NirmanScreenBackground>
    );

  const viewTitle = t(`views.${view}.title`);
  const canCreate = active && (view === 'leads' ? permissions.includes('leads:create') : view === 'units' ? permissions.includes('inventory:manage') : false);
  const createAction = canCreate ? (
    view === 'units' ? (
      <View style={styles.headingActions}>
        <IconButton icon="file-upload-outline" accessibilityLabel={t('units.import')} variant="default" onPress={() => router.push('/(app)/sales-unit-import')} />
        <IconButton
          icon="plus"
          accessibilityLabel={t('units.add')}
          variant="primary"
          onPress={() => {
            setUnitPriceAmount('');
            setUnitPriceInputUnit('LAKH');
            setUnitFormError('');
            setUnitFieldErrors({});
            setUnitDraft({ ...emptyUnit });
          }}
        />
      </View>
    ) : (
      <IconButton
        icon="plus"
        accessibilityLabel={t('leads.add')}
        variant="primary"
        onPress={() => {
          setLeadFormError('');
          setLeadFieldErrors({});
          setLeadDraft({ ...emptyLead });
        }}
      />
    )
  ) : undefined;

  return (
    <NirmanScreenBackground scroll={false}>
      <RefreshFlatList busy={loading || refreshing}
        style={styles.flatList}
        contentContainerStyle={styles.list}
        data={loading ? [] : visibleItems}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={() => load(true)}
        renderItem={renderItem}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('title')} subtitle={project.name} action={<IconButton icon="view-grid-outline" accessibilityLabel={t('navigation.open')} variant="glass" onPress={() => setShowNavigation(true)} />} />
            <ProjectContextCard compact showSwitchAction />
            <SalesSectionHeading title={viewTitle} description={t(`views.${view}.description`)} action={createAction} />
            {!active ? <FormError message={t('parity.readOnly')} /> : null}
            <SalesSectionHeading title={t('parity.workingTimezone', { timezone })} />
            <ListControls><SalesListFilters view={view} value={filters} team={team} timezone={timezone} onApply={next => { setFilters(next); setPage(1); }} search={<SearchField maxLength={view === 'units' ? 120 : 160} accessibilityLabel={t('search.a11y')} placeholder={t('search.placeholder')} value={search} onChangeText={value => { setSearch(value); setPage(1); }} />} /></ListControls>

            <FormError message={error} />
            {loading ? <LoadingState label={t('loading')} /> : null}
          </View>
        }
        ListFooterComponent={view === 'leads' ? <View style={styles.footer}><Button label={t('parity.previous')} variant="secondary" disabled={page <= 1 || loading || refreshing} onPress={() => setPage(page - 1)} /><SalesSectionHeading title={t('parity.page', { page, total })} /><Button label={t('parity.next')} variant="secondary" disabled={page * 50 >= total || loading || refreshing} onPress={() => setPage(page + 1)} /></View> : null}
        ListEmptyComponent={!loading && !error ? <EmptyState title={t(`views.${view}.emptyTitle`)} description={t(`views.${view}.emptyDescription`)} /> : null}
      />

      <BottomSheet visible={showNavigation} title={t('navigation.title')} description={t('navigation.description')} scroll onClose={() => setShowNavigation(false)}>
        {availableViews.map((key) => (
          <SalesChoice
            key={key}
            label={t(`views.${key}.title`)}
            description={t(`views.${key}.description`)}
            selected={view === key}
            onPress={() => {
              setView(key);
              setSearch(''); setFilters({}); setPage(1);
              setShowNavigation(false);
            }}
          />
        ))}
      </BottomSheet>

      {leadDraft ? (
        <BottomSheet
          visible
          title={t('leads.formTitle')}
          description={t('leads.formDescription')}
          scroll
          showCloseButton={false}
          onClose={closeLeadForm}
          footer={
            <View style={styles.footer}>
              <Button style={styles.footerButton} label={tCommon('actions.cancel')} variant="secondary" onPress={closeLeadForm} />
              <Button style={styles.footerButton} disabled={working || commandReview} label={working ? t('saving') : t('leads.save')} onPress={() => void saveLead()} />
            </View>
          }
        >
          <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working ? 'none' : 'auto'}>
          <FormError message={leadFormError} />
          {commandReview ? <><FormError message={t('parity.uncertain')} /><RefreshButton busy={loading || refreshing} label={t('refresh')} disabled={working} variant="secondary" onRefresh={() => load(true)} /></> : null}
          <FormField label={t('fields.customerName')} required error={leadFieldErrors.customerName}>
            <Input
              autoCapitalize="words"
              invalid={Boolean(leadFieldErrors.customerName)}
              value={leadDraft.customerName}
              onChangeText={(customerName) => {
                setLeadDraft({ ...leadDraft, customerName });
                if (leadFieldErrors.customerName)
                  setLeadFieldErrors((current) => ({
                    ...current,
                    customerName: undefined,
                  }));
              }}
            />
          </FormField>
          <FormField label={t('fields.primaryMobile')} required error={leadFieldErrors.primaryMobile}>
            <Input
              autoComplete="tel"
              invalid={Boolean(leadFieldErrors.primaryMobile)}
              keyboardType="phone-pad"
              maxLength={24}
              placeholder="9876543210"
              textContentType="telephoneNumber"
              value={leadDraft.primaryMobile}
              onBlur={() =>
                setLeadFieldErrors((current) => ({
                  ...current,
                  primaryMobile: !leadDraft.primaryMobile
                    ? tCommon('validation.required', {
                        field: t('fields.primaryMobile'),
                      })
                    : !callableNumber(leadDraft.primaryMobile)
                      ? tCommon('validation.phone')
                      : undefined,
                }))
              }
              onChangeText={(value) => {
                const primaryMobile = value.replace(/[^+\d\s()-]/g, '');
                setLeadDraft({ ...leadDraft, primaryMobile });
                setLeadFieldErrors((current) => ({
                  ...current,
                  primaryMobile: primaryMobile.length === 10 && !isValidPhone(primaryMobile) ? tCommon('validation.phone') : undefined,
                }));
              }}
            />
          </FormField>
          <FormField label={t('fields.email')} error={leadFieldErrors.email}>
            <Input
              autoCapitalize="none"
              invalid={Boolean(leadFieldErrors.email)}
              keyboardType="email-address"
              value={leadDraft.email ?? ''}
              onChangeText={(email) => {
                setLeadDraft({ ...leadDraft, email });
                if (leadFieldErrors.email)
                  setLeadFieldErrors((current) => ({
                    ...current,
                    email: undefined,
                  }));
              }}
            />
          </FormField>
          <FormField label={t('fields.preferredUnitType')}>
            <Input value={leadDraft.preferredUnitType ?? ''} onChangeText={(preferredUnitType) => setLeadDraft({ ...leadDraft, preferredUnitType })} />
          </FormField>
          <FormField label={t('fields.budgetMin')} error={leadFieldErrors.budgetMin}>
            <Input
              invalid={Boolean(leadFieldErrors.budgetMin)}
              keyboardType="decimal-pad"
              value={leadDraft.budgetMin?.toString() ?? ''}
              onChangeText={(value) => {
                setLeadDraft({
                  ...leadDraft,
                  budgetMin: value ? Number(value) : undefined,
                });
                if (leadFieldErrors.budgetMin || leadFieldErrors.budgetMax)
                  setLeadFieldErrors((current) => ({
                    ...current,
                    budgetMin: undefined,
                    budgetMax: undefined,
                  }));
              }}
            />
          </FormField>
          <FormField label={t('fields.budgetMax')} error={leadFieldErrors.budgetMax}>
            <Input
              invalid={Boolean(leadFieldErrors.budgetMax)}
              keyboardType="decimal-pad"
              value={leadDraft.budgetMax?.toString() ?? ''}
              onChangeText={(value) => {
                setLeadDraft({
                  ...leadDraft,
                  budgetMax: value ? Number(value) : undefined,
                });
                if (leadFieldErrors.budgetMax)
                  setLeadFieldErrors((current) => ({
                    ...current,
                    budgetMax: undefined,
                  }));
              }}
            />
          </FormField>
          <FormField label={t('fields.source')} required>
            {LEAD_SOURCES.map((source: LeadSource) => (
              <SalesChoice key={source} label={t(`source.${source}`)} selected={leadDraft.source === source} onPress={() => setLeadDraft({ ...leadDraft, source })} />
            ))}
          </FormField>
          <FormField label={t('fields.priority')} required>
            {LEAD_PRIORITIES.map((priority: LeadPriority) => (
              <SalesChoice key={priority} label={t(`priority.${priority}`)} selected={leadDraft.priority === priority} onPress={() => setLeadDraft({ ...leadDraft, priority })} />
            ))}
          </FormField>
          <LeadAdditionalFields value={leadDraft} onChange={next => setLeadDraft({ ...leadDraft, ...next })} />
          </View>
        </BottomSheet>
      ) : null}

      {unitDraft ? (
        <BottomSheet
          visible
          title={unitDraft.id ? t('units.editTitle') : t('units.formTitle')}
          scroll
          showCloseButton={false}
          onClose={closeUnitForm}
          footer={
            <View style={styles.footer}>
              <Button style={styles.footerButton} label={tCommon('actions.cancel')} variant="secondary" onPress={closeUnitForm} />
              <Button style={styles.footerButton} disabled={working || commandReview} label={working ? t('saving') : t('units.save')} onPress={() => void saveUnit()} />
            </View>
          }
        >
          <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working ? 'none' : 'auto'}>
          <FormError message={unitFormError} />
          {commandReview ? <><FormError message={t('parity.uncertain')} /><RefreshButton busy={loading || refreshing} label={t('refresh')} disabled={working} variant="secondary" onRefresh={() => load(true)} /></> : null}
          <FormField label={t('fields.unitNumber')} required error={unitFieldErrors.unitNumber}>
            <Input
              invalid={Boolean(unitFieldErrors.unitNumber)}
              value={unitDraft.unitNumber}
              onChangeText={(unitNumber) => {
                setUnitDraft({ ...unitDraft, unitNumber });
                if (unitFieldErrors.unitNumber)
                  setUnitFieldErrors((current) => ({
                    ...current,
                    unitNumber: undefined,
                  }));
              }}
            />
          </FormField>
          <FormField label={t('fields.unitType')} required error={unitFieldErrors.unitType}>
            <Input
              invalid={Boolean(unitFieldErrors.unitType)}
              value={unitDraft.unitType}
              onChangeText={(unitType) => {
                setUnitDraft({ ...unitDraft, unitType });
                if (unitFieldErrors.unitType)
                  setUnitFieldErrors((current) => ({
                    ...current,
                    unitType: undefined,
                  }));
              }}
            />
          </FormField>
          <View style={styles.fieldRow}>
            <View style={styles.fieldColumn}>
              <FormField label={t('fields.wingTower')}>
                <Input value={unitDraft.wingTower ?? ''} onChangeText={(wingTower) => setUnitDraft({ ...unitDraft, wingTower })} />
              </FormField>
            </View>
            <View style={styles.fieldColumn}>
              <FormField label={t('fields.floor')}>
                <Input value={unitDraft.floor ?? ''} onChangeText={(floor) => setUnitDraft({ ...unitDraft, floor })} />
              </FormField>
            </View>
          </View>
          <View style={styles.fieldRow}>
            <View style={styles.fieldColumn}>
              <FormField label={t('fields.areaSqft')} required={unitDraft.priceBasis === 'PER_SQFT'} error={unitFieldErrors.areaSqft}>
                <Input
                  invalid={Boolean(unitFieldErrors.areaSqft)}
                  keyboardType="decimal-pad"
                  value={unitDraft.areaSqft?.toString() ?? ''}
                  onChangeText={(value) => {
                    setUnitDraft({
                      ...unitDraft,
                      areaSqft: value ? Number(value) : undefined,
                    });
                    if (unitFieldErrors.areaSqft)
                      setUnitFieldErrors((current) => ({
                        ...current,
                        areaSqft: undefined,
                      }));
                  }}
                />
              </FormField>
            </View>
            <View style={styles.fieldColumn}>
              <FormField label={t('fields.facing')}>
                <Input value={unitDraft.facing ?? ''} onChangeText={(facing) => setUnitDraft({ ...unitDraft, facing })} />
              </FormField>
            </View>
          </View>
          <FormField label={t('fields.priceBasis')} required>
            <View accessibilityRole="radiogroup" style={styles.chipRow}>
              {UNIT_PRICE_BASES.map((priceBasis) => (
                <Chip
                  key={priceBasis}
                  label={t(`pricing.${priceBasis}`)}
                  selected={(unitDraft.priceBasis ?? 'TOTAL') === priceBasis}
                  style={styles.choiceChip}
                  onPress={() => {
                    setUnitDraft({
                      ...unitDraft,
                      priceBasis,
                      ratePerSqft: priceBasis === 'TOTAL' ? undefined : unitDraft.ratePerSqft,
                    });
                    setUnitFieldErrors((current) => ({
                      ...current,
                      totalPrice: undefined,
                      ratePerSqft: undefined,
                    }));
                  }}
                />
              ))}
            </View>
          </FormField>
          {(unitDraft.priceBasis ?? 'TOTAL') === 'TOTAL' ? (
            <>
              <FormField label={t('fields.totalPrice')} required error={unitFieldErrors.totalPrice}>
                <Input
                  invalid={Boolean(unitFieldErrors.totalPrice)}
                  keyboardType="decimal-pad"
                  value={unitPriceAmount}
                  onChangeText={(value) => {
                    setUnitPriceAmount(value.replace(/[^0-9.]/g, ''));
                    if (unitFieldErrors.totalPrice)
                      setUnitFieldErrors((current) => ({
                        ...current,
                        totalPrice: undefined,
                      }));
                  }}
                />
              </FormField>
              <FormField label={t('fields.priceUnit')} required>
                <View accessibilityRole="radiogroup" style={styles.chipRow}>
                  {UNIT_PRICE_INPUT_UNITS.map((unit) => (
                    <Chip key={unit} label={t(`pricing.${unit}`)} selected={unitPriceInputUnit === unit} style={styles.choiceChip} onPress={() => setUnitPriceInputUnit(unit)} />
                  ))}
                </View>
              </FormField>
            </>
          ) : (
            <FormField label={t('fields.ratePerSqft')} required error={unitFieldErrors.ratePerSqft}>
              <Input
                invalid={Boolean(unitFieldErrors.ratePerSqft)}
                keyboardType="decimal-pad"
                value={unitDraft.ratePerSqft?.toString() ?? ''}
                onChangeText={(value) => {
                  setUnitDraft({
                    ...unitDraft,
                    ratePerSqft: value ? Number(value) : undefined,
                  });
                  if (unitFieldErrors.ratePerSqft)
                    setUnitFieldErrors((current) => ({
                      ...current,
                      ratePerSqft: undefined,
                    }));
                }}
              />
            </FormField>
          )}
          {((unitDraft.priceBasis ?? 'TOTAL') === 'TOTAL' ? Number(unitPriceAmount) * priceMultipliers[unitPriceInputUnit] : (unitDraft.areaSqft ?? 0) * (unitDraft.ratePerSqft ?? 0)) > 0 ? (
            <Card variant="blueprint" padding="sm">
              <SalesDetailRows
                rows={[
                  {
                    label: (unitDraft.priceBasis ?? 'TOTAL') === 'PER_SQFT' ? t('pricing.estimatedTotal') : t('pricing.totalPrice'),
                    value: formatInr((unitDraft.priceBasis ?? 'TOTAL') === 'TOTAL' ? Number(unitPriceAmount) * priceMultipliers[unitPriceInputUnit] : (unitDraft.areaSqft ?? 0) * (unitDraft.ratePerSqft ?? 0), language, { maximumFractionDigits: 0 }),
                  },
                ]}
              />
            </Card>
          ) : null}
          <FormField label={t('fields.status')} required>
            <View accessibilityRole="radiogroup" style={styles.chipRow}>
              {(['AVAILABLE', 'UNAVAILABLE', 'SOLD'] as const).map((status) => (
                <Chip key={status} label={t(`unitStatus.${status}`)} selected={unitDraft.status === status} style={styles.choiceChip} onPress={() => setUnitDraft({ ...unitDraft, status })} />
              ))}
            </View>
          </FormField>
          </View>
        </BottomSheet>
      ) : null}

      {selectedFollowUp ? <FollowUpUpdateSheet key={selectedFollowUp.id} item={selectedFollowUp} complete={completeMode} close={() => setSelectedFollowUp(null)} saved={() => { setSelectedFollowUp(null); void load(true); }} /> : null}
      {selectedVisit ? (
        <BottomSheet
          visible
          title={t('visits.updateTitle')}
          description={t('visits.updateDescription')}
          scroll
          showCloseButton={false}
          onClose={() => confirmClose(() => setSelectedVisit(null))}
          footer={
            <View style={styles.footer}>
              <Button style={styles.footerButton} label={tCommon('actions.cancel')} variant="secondary" onPress={() => confirmClose(() => setSelectedVisit(null))} />
              <Button style={styles.footerButton} disabled={working || visitReview || (visitStatus === 'RESCHEDULED' && !toScheduleIso(visitDate, visitTime))} label={working ? t('saving') : t('visits.saveOutcome')} variant={visitStatus === 'CANCELLED' || visitStatus === 'NO_SHOW' ? 'danger' : 'success'} onPress={() => void saveVisitOutcome()} />
            </View>
          }
        >
          <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working ? 'none' : 'auto'}>
          <FormError message={visitError} />
          {visitReview ? <RefreshButton busy={loading || refreshing} label={t('refresh')} disabled={working} variant="secondary" onRefresh={async () => { if (!organizationId || !projectId || !accessToken) return; await fetchSiteVisits(organizationId, projectId, accessToken).then(rows => { if (!alive.current) return; const current = rows.find(row => row.id === selectedVisit.id); if (current && ['SCHEDULED', 'RESCHEDULED'].includes(current.status)) { setSelectedVisit(current); setVisitReview(false); setVisitError(''); } else setVisitError(t('parity.stale')); }).catch(cause => { if (alive.current) setVisitError(getLocalizedErrorMessage(cause, t('errors.load'))); }); }} /> : null}
          <FormField label={t('fields.visitStatus')} required>
            <View accessibilityRole="radiogroup" style={styles.chipRow}>
              {SITE_VISIT_STATUSES.filter((status) => status !== 'SCHEDULED').map((status) => (
                <Chip key={status} accessibilityRole="radio" accessibilityState={{ selected: visitStatus === status }} label={t(`visitStatus.${status}`)} selected={visitStatus === status} onPress={() => setVisitStatus(status)} />
              ))}
            </View>
          </FormField>
          {visitStatus === 'RESCHEDULED' ? (
            <View style={styles.fieldRow}>
              <FormField style={styles.fieldColumn} label={t('fields.date')} required>
                <DateInput allowClear={false} accessibilityLabel={t('fields.date')} value={visitDate} onChangeText={setVisitDate} />
              </FormField>
              <FormField style={styles.fieldColumn} label={t('fields.time')} required>
                <Input accessibilityLabel={t('fields.time')} keyboardType="numbers-and-punctuation" placeholder="14:30" value={visitTime} onChangeText={setVisitTime} />
              </FormField>
            </View>
          ) : null}
          <FormField label={t('fields.attendeeCount')}>
            <Input accessibilityLabel={t('fields.attendeeCount')} keyboardType="number-pad" value={visitAttendeeCount} onChangeText={(value) => setVisitAttendeeCount(value.replace(/\D/g, '').slice(0, 4))} />
          </FormField>
          <FormField label={t('fields.customerFeedback')}>
            <Input multiline numberOfLines={3} value={visitFeedback} onChangeText={setVisitFeedback} style={styles.multiline} />
          </FormField>
          <FormField label={t('fields.objectionsConcerns')}>
            <Input multiline numberOfLines={3} value={visitObjections} onChangeText={setVisitObjections} style={styles.multiline} />
          </FormField>
          <FormField label={t('fields.nextAction')}>
            <Input multiline numberOfLines={2} value={visitNextAction} onChangeText={setVisitNextAction} style={styles.multiline} />
          </FormField>
          </View>
        </BottomSheet>
      ) : null}
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  flatList: { flex: 1 },
  list: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[8] },
  headerContent: {
    gap: mobileTheme.spacing[5],
    marginBottom: mobileTheme.spacing[3],
  },
  headingActions: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  fieldRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[3],
  },
  fieldColumn: { flex: 1, minWidth: 140 },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[2],
  },
  choiceChip: { minHeight: 48 },
  footer: { flex: 1, flexDirection: 'row', gap: mobileTheme.spacing[3] },
  footerButton: { flex: 1 },
  multiline: {
    minHeight: 96,
    paddingTop: mobileTheme.spacing[3],
    textAlignVertical: 'top',
  },
});
