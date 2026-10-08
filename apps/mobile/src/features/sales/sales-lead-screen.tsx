import { refreshTogether } from '@nirman-app/shared';
import { RefreshFlatList } from "../../components/ui/refresh-control";

import { RefreshIconButton, RefreshButton } from "../../components/ui/refresh-button";
import { FOLLOW_UP_TYPES, LEAD_STAGES, type FollowUpType, type LeadStage } from '@nirman-app/shared';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, BottomSheet, Button, Chip, CompactScreenHeader, DateInput, EmptyState, FormError, FormField, IconButton, Input, LoadingState, NirmanScreenBackground, OperationalEntityCard, TimeInput } from '../../components/ui';
import { formatInr } from '../../i18n/formatters';
import { formatDate } from '../../i18n/formatters';
import { ApiRequestError } from '../../lib/api';
import { LeadAdditionalFields } from './lead-additional-fields';
import { useSalesAssignees } from './sales-assignees';
import { canWriteLead, eligibleBookingUnit, retainBookingAttempt, assignmentPermission, scheduleInstant, callableNumber as validCallableNumber, uncertainWrite } from './sales-rules';
import { getLocalizedErrorMessage } from '../../i18n';
import { formatDateOnly, isValidDateOnly, isValidEmail, isValidNonNegativeNumber, isValidPhone } from '../../lib/validation';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { ProjectContextCard } from '../projects';
import { addActivity, assignLead, createBooking, createFollowUp, createSiteVisit, fetchActivities, fetchLead, fetchLeadUnitInterests, fetchUnits, requestUnitHold, saveUnitInterest, updateLead } from './services';
import { SalesActivityCard, SalesChoice, SalesDetailRows, SalesSectionHeading } from './sales-ui';
import type { LeadInput, SalesActivity, SalesLead, SalesUnit, SalesUnitInterest } from './types';

type SheetKey = 'stage' | 'activity' | 'followUp' | 'visit' | 'assign' | 'interest' | 'holdRequest' | 'booking' | 'edit' | null;
type EditFieldErrors = Partial<Record<'customerName' | 'primaryMobile' | 'email', string>>;
type ActionFieldErrors = Partial<Record<'stage' | 'lostReason' | 'date' | 'time' | 'attendeeCount' | 'unit' | 'bookingDate' | 'bookingAmount' | 'assignee', string>>;

function makeBookingIdempotencyKey(leadId: string) {
  return `booking-${leadId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function SalesLeadScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>();
  const { t, i18n } = useTranslation('sales');
  const { t: tCommon } = useTranslation('common');
  const { session } = useSession();
  const project = getActiveProject(session);
  const activeOrganizationId = session?.activeOrganization?.id;
  const activeProjectId = project?.id;
  const accessToken = session?.accessToken;
  const permissions = getActiveProjectPermissions(session);
  const language = (i18n.resolvedLanguage ?? 'en') as 'en' | 'hi' | 'gu';
  const timezone = session?.activeOrganization?.workingTimezone || session?.activeOrganization?.timezone || 'Asia/Kolkata';
  const active = project?.status === 'ACTIVE';
  const requestSequence = useRef(0);
  const alive = useRef(true);
  const writeLock = useRef(false);
  const bookingAttempt = useRef<Parameters<typeof createBooking>[3] | null>(null);
  const [bookingLocked, setBookingLocked] = useState(false);
  const [extraDraft, setExtraDraft] = useState<Partial<LeadInput>>({});
  const assignees = useSalesAssignees();
  const [scheduleAssignee, setScheduleAssignee] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const toIso = (date: string, time: string) => scheduleInstant(`${date}T${time}`, timezone);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const [lead, setLead] = useState<SalesLead | null>(null);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [units, setUnits] = useState<SalesUnit[]>([]);
  const [leadInterests, setLeadInterests] = useState<SalesUnitInterest[]>([]);
  const [interests, setInterests] = useState<SalesUnitInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [commandReview, setCommandReview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKey>(null);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetRetry, setSheetRetry] = useState(0);
  const canReadInventory = permissions.includes('inventory:read');
  const [stage, setStage] = useState<LeadStage>('NEW');
  const [lostReason, setLostReason] = useState('');
  const [activityType, setActivityType] = useState<'CALL_OUTCOME' | 'NOTE_ADDED' | 'BROCHURE_SHARED'>('NOTE_ADDED');
  const [summary, setSummary] = useState('');
  const [activitySummaryError, setActivitySummaryError] = useState('');
  const [details, setDetails] = useState('');
  const [scheduleDate, setScheduleDate] = useState(formatDateOnly(new Date()));
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [visitAttendeeCount, setVisitAttendeeCount] = useState('');
  const [followUpType, setFollowUpType] = useState<FollowUpType>('PHONE');
  const [selectedUnit, setSelectedUnit] = useState<SalesUnit | null>(null);
  const [selectedInterest, setSelectedInterest] = useState<SalesUnitInterest | null>(null);
  const [interestStatus, setInterestStatus] = useState<'INTERESTED' | 'HIGH_INTENT'>('INTERESTED');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [bookingIdempotencyKey, setBookingIdempotencyKey] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftMobile, setDraftMobile] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [editFormError, setEditFormError] = useState('');
  const [editFieldErrors, setEditFieldErrors] = useState<EditFieldErrors>({});
  const [actionFieldErrors, setActionFieldErrors] = useState<ActionFieldErrors>({});

  const load = useCallback(
    async (quiet = false) => {
      if (!leadId || !activeOrganizationId || !activeProjectId || !accessToken) return;
      const sequence = ++requestSequence.current;
      quiet ? setRefreshing(true) : setLoading(true);
      setError(null);
      try {
        const [nextLead, nextActivities, nextInterests] = await refreshTogether([fetchLead(activeOrganizationId, activeProjectId, leadId, accessToken), fetchActivities(activeOrganizationId, activeProjectId, leadId, accessToken), canReadInventory ? fetchLeadUnitInterests(activeOrganizationId, activeProjectId, leadId, accessToken) : Promise.resolve([])]);
        if (sequence !== requestSequence.current || !alive.current) return;
        setLead(nextLead);
        setActivities(nextActivities); setLeadInterests(nextInterests); setCommandReview(false);
      } catch (cause) {
        if (sequence === requestSequence.current && alive.current) setError(getLocalizedErrorMessage(cause, t('errors.load')));
      } finally {
        if (sequence === requestSequence.current && alive.current) { setLoading(false); setRefreshing(false); }
      }
    },
    // getActiveProject normalizes into a new object on each render. Depend on
    // request identity so loading/data updates do not trigger another fetch.
    [leadId, activeOrganizationId, activeProjectId, accessToken, canReadInventory, t],
  );

  useFocusEffect(useCallback(() => { void load(); return () => { requestSequence.current += 1; }; }, [load]));

  useEffect(() => {
    if (!activeOrganizationId || !activeProjectId || !accessToken || !leadId) return;
    if (sheet !== 'assign' && sheet !== 'interest' && sheet !== 'holdRequest' && sheet !== 'booking') return;
    if (sheet === 'assign' || (sheet === 'booking' && !canReadInventory)) return;

    // Open first, then load options. Closing/switching the sheet invalidates
    // late responses so they cannot replace another action's options or error.
    let active = true;
    setSheetLoading(true);
    setSheetError(null);
    void (async () => {
      try {
        if (sheet === 'holdRequest') {
          setInterests([]);
          setSelectedInterest(null);
          const nextInterests = await fetchLeadUnitInterests(activeOrganizationId, activeProjectId, leadId, accessToken);
          if (active) setInterests(nextInterests.filter((interest) => interest.status !== 'WITHDRAWN' && !interest.holdRequestId));
        } else {
          setUnits([]);
          if (!bookingAttempt.current) setSelectedUnit(null);
          const nextUnits = await fetchUnits(activeOrganizationId, activeProjectId, accessToken);
          if (active) setUnits(nextUnits.filter(unit => sheet === 'interest' ? ['AVAILABLE', 'BLOCKED'].includes(unit.status) : eligibleBookingUnit(unit, leadId)));
        }
      } catch (cause) {
        if (active) setSheetError(getLocalizedErrorMessage(cause, t('errors.load')));
      } finally {
        if (active) setSheetLoading(false);
      }
    })();
    return () => { active = false; };
  }, [sheet, sheetRetry, activeOrganizationId, activeProjectId, accessToken, leadId, canReadInventory, t]);

  const callableNumber = useMemo(() => validCallableNumber(lead?.primaryMobile ?? ''), [lead?.primaryMobile]);

  async function run(action: () => Promise<unknown>, close = true) {
    if (writeLock.current || commandReview || !active || !lead) return;
    writeLock.current = true; setWorking(true);
    setError(null);
    try {
      const current = await fetchLead(organizationId, projectId, leadId!, token);
      if (!alive.current) return;
      if (current.updatedAt !== lead.updatedAt || current.assignedTo !== lead.assignedTo || current.currentStage !== lead.currentStage) { setLead(current); throw new Error(t('parity.stale')); }
      await action();
      if (!alive.current) return;
      if (close) setSheet(null);
      await load(true);
    } catch (cause) {
      if (alive.current) { if (uncertainWrite(cause instanceof ApiRequestError ? cause.status : undefined)) setCommandReview(true); setError(getLocalizedErrorMessage(cause, t('parity.uncertain'))); }
    } finally {
      writeLock.current = false; if (alive.current) setWorking(false);
    }
  }

  function saveActivity() {
    const nextSummary = summary.trim();
    if (!nextSummary) {
      setActivitySummaryError(tCommon('validation.required', { field: t('fields.summary') }));
      return;
    }

    setActivitySummaryError('');
    void run(() =>
      addActivity(organizationId, projectId, leadId!, token, {
        activityType,
        summary: nextSummary,
        details: details.trim() || undefined,
      }),
    );
  }

  function openUnits(nextSheet: 'interest' | 'booking') {
    if (!session?.activeOrganization || !project) return;
    if (nextSheet === 'booking' && leadId && !bookingAttempt.current) setBookingIdempotencyKey(makeBookingIdempotencyKey(leadId));
    setActionFieldErrors({});
    setUnits([]);
    if (!bookingAttempt.current) setSelectedUnit(null);
    setSheetError(null);
    setSheetLoading(nextSheet === 'interest' || canReadInventory);
    setError(null);
    setSheet(nextSheet);
  }

  function openHoldRequests() {
    if (!session?.activeOrganization || !project || !leadId) return;
    setInterests([]);
    setSelectedInterest(null);
    setDetails('');
    setActionFieldErrors({});
    setSheetError(null);
    setSheetLoading(true);
    setError(null);
    setSheet('holdRequest');
  }

  function openAssignees() {
    if (!session?.activeOrganization || !project) return;
    setActionFieldErrors({});
    setSheetError(null);
    setSheetLoading(false);
    setError(null);
    setAssigneeId(''); setSheet('assign');
  }

  if (!leadId || !project || !session?.activeOrganization)
    return (
      <NirmanScreenBackground>
        <CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('leadDetail.title')} />
        <EmptyState title={t('noProject.title')} description={t('noProject.description')} />
      </NirmanScreenBackground>
    );

  const organizationId = session.activeOrganization.id;
  const projectId = project.id;
  const token = session.accessToken;
  const can = (permission: string) => Boolean(lead && canWriteLead(permissions, active, permission, lead, session.user.id));
  function requestClose() { if (writeLock.current) return; Alert.alert(t('parity.discardTitle'), bookingLocked ? t('parity.bookingLocked') : t('parity.discardDescription'), [{ text: tCommon('actions.cancel'), style: 'cancel' }, { text: t('parity.discardTitle'), style: 'destructive', onPress: () => setSheet(null) }]); }
  const recentActivities = activities.slice(0, 3);
  const bookingAmountInvalid = Boolean(amount) && !isValidNonNegativeNumber(amount);
  const sheetOptionsUnavailable = sheetLoading || Boolean(sheetError);
  const sheetFeedback = sheetLoading ? <LoadingState label={t('loading')} /> : sheetError ? (
    <View>
      <FormError message={sheetError} />
      <Button label={tCommon('actions.retry')} variant="secondary" onPress={() => {
        setSheetLoading(true);
        setSheetRetry((current) => current + 1);
      }} />
    </View>
  ) : null;

  function getScheduleErrors() {
    const nextErrors: ActionFieldErrors = {};
    if (scheduleAssignee && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(scheduleAssignee)) nextErrors.assignee = t('parity.assigneeInvalid');
    if (!isValidDateOnly(scheduleDate)) nextErrors.date = tCommon('validation.date');
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleTime)) nextErrors.time = t('fields.timeHint');
    return nextErrors;
  }

  function saveStage() {
    const stageError = stage === 'BOOKED'
      ? tCommon('validation.required', { field: t('fields.status') })
      : undefined;
    const lostReasonError = stage === 'LOST' && !lostReason.trim()
      ? tCommon('validation.required', { field: t('fields.lostReason') })
      : undefined;
    setActionFieldErrors({ stage: stageError, lostReason: lostReasonError });
    if (stageError || lostReasonError) return;
    void run(() =>
      updateLead(organizationId, projectId, leadId!, token, {
        currentStage: stage,
        ...(stage === 'LOST' ? { lostReason: lostReason.trim() } : {}),
      }),
    );
  }

  function saveFollowUp() {
    const nextErrors = getScheduleErrors();
    setActionFieldErrors(nextErrors);
    const nextScheduledAt = toIso(scheduleDate, scheduleTime);
    if (Object.keys(nextErrors).length || !nextScheduledAt) return;
    void run(() =>
      createFollowUp(organizationId, projectId, leadId!, token, {
        scheduledAt: nextScheduledAt,
        type: followUpType,
        ...(scheduleAssignee ? { assignedUserId: scheduleAssignee } : {}),
        notes: details.trim() || undefined,
      }),
    );
  }

  function saveVisit() {
    const nextErrors = getScheduleErrors();
    const attendeeCount = visitAttendeeCount ? Number(visitAttendeeCount) : undefined;
    if (attendeeCount !== undefined && (!Number.isInteger(attendeeCount) || attendeeCount < 1 || attendeeCount > 1000)) {
      nextErrors.attendeeCount = t('leadDetail.attendeeCountError');
    }
    setActionFieldErrors(nextErrors);
    const nextScheduledAt = toIso(scheduleDate, scheduleTime);
    if (Object.keys(nextErrors).length || !nextScheduledAt) return;
    void run(() =>
      createSiteVisit(organizationId, projectId, leadId!, token, {
        scheduledAt: nextScheduledAt,
        ...(scheduleAssignee ? { assignedSalesperson: scheduleAssignee } : {}),
        ...(attendeeCount !== undefined ? { attendeeCount } : {}),
      }),
    );
  }

  function saveInterest() {
    if (!selectedUnit) {
      setActionFieldErrors({ unit: t('leadDetail.selectInterestUnitError') });
      return;
    }
    setActionFieldErrors({});
    void run(() =>
      saveUnitInterest(organizationId, projectId, selectedUnit.id, token, {
        leadId: leadId!,
        status: interestStatus,
        notes: details.trim() || undefined,
      }),
    );
  }

  function saveHoldRequest() {
    if (!selectedInterest) {
      setActionFieldErrors({ unit: t('leadDetail.selectHoldUnitError') });
      return;
    }
    setActionFieldErrors({});
    void run(() =>
      requestUnitHold(organizationId, projectId, selectedInterest.unitId, token, {
        leadId: leadId!,
        notes: details.trim() || undefined,
      }),
    );
  }

  async function confirmBooking() {
    if (writeLock.current || !can('leads:convert') || !lead || !leadId) return;
    if (!bookingAttempt.current) {
      const nextErrors: ActionFieldErrors = {};
      if (!isValidDateOnly(scheduleDate)) nextErrors.bookingDate = tCommon('validation.date');
      if (bookingAmountInvalid) nextErrors.bookingAmount = tCommon('validation.number');
      if (selectedUnit && !permissions.includes('inventory:book')) nextErrors.unit = t('parity.accessDenied');
      setActionFieldErrors(nextErrors);
      if (Object.keys(nextErrors).length || !bookingIdempotencyKey) return;
    }
    writeLock.current = true; setWorking(true); setError(null);
    try {
      if (!bookingAttempt.current) {
        const current = await fetchLead(organizationId, projectId, leadId, token);
        if (!alive.current) return;
        if (current.updatedAt !== lead.updatedAt || current.currentStage === 'BOOKED') { setLead(current); throw new Error(t('parity.stale')); }
        if (selectedUnit) {
          const unit = (await fetchUnits(organizationId, projectId, token)).find(unit => unit.id === selectedUnit.id);
          if (!alive.current) return;
          if (!unit || !eligibleBookingUnit(unit, leadId)) throw new Error(t('parity.stale'));
        }
        bookingAttempt.current = retainBookingAttempt(bookingAttempt.current, { idempotencyKey: bookingIdempotencyKey, leadId, ...(selectedUnit ? { unitId: selectedUnit.id } : {}), bookingDate: scheduleDate, ...(amount ? { bookingAmount: Number(amount) } : {}), ...(reference.trim() ? { bookingReference: reference.trim() } : {}) });
      }
      setBookingLocked(true);
      const booking = await createBooking(organizationId, projectId, token, bookingAttempt.current);
      if (!alive.current) return;
      bookingAttempt.current = null; setBookingLocked(false); setSheet(null); setBookingIdempotencyKey('');
      await load(true);
      if (!alive.current) return;
      Alert.alert(t('bookings.confirmedTitle'), t('bookings.confirmedDescription'), [{ text: tCommon('progress.done') }, { text: t('bookings.viewBooking'), onPress: () => router.push({ pathname: '/(app)/sales-booking', params: { bookingId: booking.id } }) }]);
    } catch (cause) {
      if (!alive.current) return;
      const status = cause instanceof ApiRequestError ? cause.status : undefined;
      if (!uncertainWrite(status) && status !== 409) { bookingAttempt.current = null; setBookingLocked(false); }
      setError(getLocalizedErrorMessage(cause, t('parity.uncertain')));
    } finally { writeLock.current = false; if (alive.current) setWorking(false); }
  }

  async function saveCustomerDetails() {
    setEditFormError('');
    const nextFieldErrors: EditFieldErrors = {};
    if (!draftName.trim())
      nextFieldErrors.customerName = tCommon('validation.required', {
        field: t('fields.customerName'),
      });
    else if (draftName.trim().length < 2) nextFieldErrors.customerName = t('errors.requiredLead');
    if (!draftMobile.trim())
      nextFieldErrors.primaryMobile = tCommon('validation.required', {
        field: t('fields.primaryMobile'),
      });
    else if (!validCallableNumber(draftMobile)) nextFieldErrors.primaryMobile = tCommon('validation.phone');
    if (draftEmail.trim() && !isValidEmail(draftEmail)) nextFieldErrors.email = tCommon('validation.email');
    setEditFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;
    if (writeLock.current || commandReview || !can('leads:update')) return;
    if ((extraDraft.budgetMin !== undefined && (!Number.isFinite(extraDraft.budgetMin) || extraDraft.budgetMin < 0)) || (extraDraft.budgetMax !== undefined && (!Number.isFinite(extraDraft.budgetMax) || extraDraft.budgetMax < 0 || extraDraft.budgetMax < (extraDraft.budgetMin ?? 0)))) { setEditFormError(tCommon('validation.number')); return; }
    writeLock.current = true; setWorking(true);
    try {
      const current = await fetchLead(organizationId, projectId, leadId!, token);
      if (!alive.current) return;
      if (current.updatedAt !== lead?.updatedAt) { setLead(current); throw new Error(t('parity.stale')); }
      await updateLead(organizationId, projectId, leadId!, token, {
        customerName: draftName.trim(),
        primaryMobile: draftMobile.trim(),
        ...extraDraft,
        email: draftEmail.trim() || null,
      });
      if (!alive.current) return;
      setSheet(null);
      setEditFieldErrors({});
      await load(true);
    } catch (cause) {
      if (alive.current) { if (uncertainWrite(cause instanceof ApiRequestError ? cause.status : undefined)) setCommandReview(true); setEditFormError(getLocalizedErrorMessage(cause, t('parity.uncertain'))); }
    } finally {
      writeLock.current = false; if (alive.current) setWorking(false);
    }
  }

  function closeEditForm() {
    requestClose();
    setEditFormError('');
    setEditFieldErrors({});
  }

  return (
    <NirmanScreenBackground scroll={false}>
      <RefreshFlatList busy={loading || refreshing}
        contentContainerStyle={styles.list}
        data={loading ? [] : recentActivities}
        style={styles.flatList}
        keyExtractor={(item) => item.id}
        refreshing={refreshing}
        onRefresh={() => load(true)}
        renderItem={({ item }) => <SalesActivityCard activity={item} />}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={lead?.customerName ?? t('leadDetail.title')} subtitle={project.name} action={<RefreshIconButton busy={loading || refreshing} icon="refresh" accessibilityLabel={t('refresh')} variant="glass" onRefresh={() => load(true)} />} />
            <ProjectContextCard compact />
            <FormError message={error} />
            {loading ? <LoadingState label={t('loading')} /> : null}
            {lead ? (
              <>
                <OperationalEntityCard
                  contextLeading={t(`priority.${lead.priority}`)}
                  contextTrailing={t(`stage.${lead.currentStage}`)}
                  title={lead.customerName}
                  supporting={lead.primaryMobile}
                  value={lead.interestedUnitNumber ?? undefined}
                  valueLabel={lead.interestedUnitNumber ? t('leads.unit') : undefined}
                  footerLeading={lead.assignedToName ?? t('leads.unassigned')}
                  tone={lead.priority === 'URGENT' ? 'danger' : lead.priority === 'HIGH' ? 'warning' : 'info'}
                  details={
                    <SalesDetailRows
                      rows={[
                        { label: t('fields.email'), value: lead.email },
                        { label: t('parity.alternateMobile'), value: lead.alternateMobile },
                        { label: t('parity.sourceDetail'), value: lead.sourceDetail },
                        { label: t('fields.preferredUnitType'), value: lead.preferredUnitType },
                        { label: t('parity.purchasePurpose'), value: lead.purchasePurpose },
                        { label: t('parity.purchaseTimeline'), value: lead.purchaseTimeline },
                        { label: t('parity.createdAt'), value: formatDate(lead.createdAt, language, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }) },
                        { label: t('parity.updatedAt'), value: formatDate(lead.updatedAt, language, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }) },
                        { label: t('parity.firstConvertedAt'), value: lead.convertedAt ? formatDate(lead.convertedAt, language, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }) : null },
                        { label: t('parity.firstConvertedBy'), value: lead.convertedByName ?? (lead.convertedBy ? t('parity.notProvided') : null) },

                        {
                          label: t('fields.source'),
                          value: t(`source.${lead.source}`),
                        },
                        {
                          label: t('fields.budget'),
                          value: lead.budgetMin != null || lead.budgetMax != null ? `${lead.budgetMin == null ? '—' : formatInr(lead.budgetMin, language, { maximumFractionDigits: 2 })} – ${lead.budgetMax == null ? '—' : formatInr(lead.budgetMax, language, { maximumFractionDigits: 2 })}` : null,
                        },
                        {
                          label: t('fields.createdBy'),
                          value: lead.createdByName,
                        },
                        {
                          label: t('fields.lostReason'),
                          value: lead.lostReason,
                        },
                      ]}
                    />
                  }
                />
                <View style={styles.actions}>
                  {callableNumber ? <Button fullWidth={false} label={t('leadDetail.call')} leadingIcon="phone-outline" variant="success" onPress={() => void Linking.openURL(`tel:${callableNumber}`)} /> : null}
                  {can('leads:update') ? <Button
                    fullWidth={false}
                    label={t('leadDetail.edit')}
                    leadingIcon="pencil-outline"
                    variant="secondary"
                    onPress={() => {
                      setExtraDraft({ alternateMobile: lead.alternateMobile ?? undefined, preferredUnitType: lead.preferredUnitType ?? undefined, budgetMin: lead.budgetMin ?? undefined, budgetMax: lead.budgetMax ?? undefined, purchasePurpose: lead.purchasePurpose ?? undefined, purchaseTimeline: lead.purchaseTimeline ?? undefined, source: lead.source, sourceDetail: lead.sourceDetail ?? undefined, priority: lead.priority, interestedUnitId: lead.interestedUnitId ?? undefined });
                      setDraftName(lead.customerName);
                      setDraftMobile(lead.primaryMobile);
                      setDraftEmail(lead.email ?? '');
                      setEditFormError('');
                      setEditFieldErrors({});
                      setSheet('edit');
                    }}
                  /> : null}
                </View>
                <SalesSectionHeading title={t('leadDetail.actions')} description={t('leadDetail.actionsDescription')} />
                <View style={styles.actionList}>
                  {can('leads:update') ? (
                    <SalesChoice
                      label={t('leadDetail.changeStage')}
                      description={t(`stage.${lead.currentStage}`)}
                      icon="swap-horizontal"
                      onPress={() => {
                        setStage(lead.currentStage);
                        setLostReason(lead.lostReason ?? '');
                        setActionFieldErrors({});
                        setSheet('stage');
                      }}
                    />
                  ) : null}
                  {active && lead && permissions.includes(assignmentPermission(lead.assignedTo)) ? <SalesChoice label={t(lead.assignedTo ? 'parity.reassign' : 'leadDetail.assign')} description={lead.assignedToName ?? t('leads.unassigned')} icon="account-switch-outline" onPress={() => void openAssignees()} /> : null}
                  {can('leads:update') ? (
                    <SalesChoice
                      label={t('leadDetail.addActivity')}
                      description={t('leadDetail.addActivityDescription')}
                      icon="text-box-plus-outline"
                      onPress={() => {
                        setSummary('');
                        setActivitySummaryError('');
                        setDetails('');
                        setSheet('activity');
                      }}
                    />
                  ) : null}
                  {can('followups:manage') ? (
                    <SalesChoice
                      label={t('leadDetail.scheduleFollowUp')}
                      description={t('leadDetail.scheduleFollowUpDescription')}
                      icon="calendar-clock-outline"
                      onPress={() => {
                        setDetails(''); setScheduleAssignee('');
                        setActionFieldErrors({});
                        setSheet('followUp');
                      }}
                    />
                  ) : null}
                  {can('site-visits:manage') ? (
                    <SalesChoice
                      label={t('leadDetail.scheduleVisit')}
                      description={t('leadDetail.scheduleVisitDescription')}
                      icon="map-marker-plus-outline"
                      onPress={() => {
                        setScheduleAssignee(''); setVisitAttendeeCount('');
                        setActionFieldErrors({});
                        setSheet('visit');
                      }}
                    />
                  ) : null}
                  {can('leads:update') && canReadInventory && permissions.includes('inventory:interest') && lead.currentStage !== 'BOOKED' ? (
                    <SalesChoice
                      label={t('leadDetail.recordInterest')}
                      description={t('leadDetail.recordInterestDescription')}
                      icon="home-heart"
                      onPress={() => {
                        setDetails('');
                        setInterestStatus('INTERESTED');
                        void openUnits('interest');
                      }}
                    />
                  ) : null}
                  {can('leads:update') && canReadInventory && permissions.includes('inventory:request-block') && lead.currentStage !== 'BOOKED' ? <SalesChoice label={t('leadDetail.requestHold')} description={t('leadDetail.requestHoldDescription')} icon="lock-clock" onPress={() => void openHoldRequests()} /> : null}
                  {can('leads:convert') && (lead.currentStage !== 'BOOKED' || bookingLocked) ? (
                    <SalesChoice
                      label={t('leadDetail.confirmBooking')}
                      description={t('leadDetail.confirmBookingDescription')}
                      icon="check-decagram-outline"
                      onPress={() => {
                        if (!bookingAttempt.current) { setAmount(''); setReference(''); }
                        void openUnits('booking');
                      }}
                    />
                  ) : null}
                </View>
                {canReadInventory ? <><SalesSectionHeading title={t('parity.interestsTitle')} />{leadInterests.length ? leadInterests.map(interest => <OperationalEntityCard key={interest.id} compact title={interest.unitNumber} contextLeading={t(`unitInterestStatus.${interest.status}`)} contextTrailing={interest.holdRequestStatus ? t(`parity.hold${interest.holdRequestStatus}`) : undefined} details={<SalesDetailRows rows={[{ label: t('fields.notes'), value: interest.notes }, { label: t('fields.requestNotes'), value: interest.holdRequestNotes }]} />} onPress={() => router.push({ pathname: '/(app)/sales-unit', params: { unitId: interest.unitId } })} />) : <EmptyState title={t('parity.noInterests')} />}</> : null}
                <SalesSectionHeading title={t('leadDetail.recentActivity')} description={t('leadDetail.recentActivityDescription')} />
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={!loading && lead ? <EmptyState title={t('leadDetail.emptyTimeline')} description={t('leadDetail.emptyTimelineDescription')} /> : null}
        ListFooterComponent={
          activities.length > 3 ? (
            <Button
              label={t('leadDetail.viewAllActivity', {
                count: activities.length,
              })}
              leadingIcon="format-list-bulleted"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/(app)/sales-activity',
                  params: { leadId },
                })
              }
            />
          ) : null
        }
      />

      {sheet === 'edit' ? (
        <BottomSheet visible title={t('leadDetail.editTitle')} scroll showCloseButton={false} onClose={closeEditForm} footer={<SheetFooter cancel={tCommon('actions.cancel')} save={working ? t('saving') : t('save')} working={working || commandReview} onCancel={closeEditForm} onSave={() => void saveCustomerDetails()} />}>
          <FormError message={editFormError} />
          {commandReview ? <RefreshButton busy={loading || refreshing} label={t('refresh')} disabled={working} variant="secondary" onRefresh={() => load(true)} /> : null}
          <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working ? 'none' : 'auto'}>
          <FormField label={t('fields.customerName')} required error={editFieldErrors.customerName}>
            <Input
              invalid={Boolean(editFieldErrors.customerName)}
              value={draftName}
              onChangeText={(value) => {
                setDraftName(value);
                if (editFieldErrors.customerName)
                  setEditFieldErrors((current) => ({
                    ...current,
                    customerName: undefined,
                  }));
              }}
            />
          </FormField>
          <FormField label={t('fields.primaryMobile')} required error={editFieldErrors.primaryMobile}>
            <Input
              autoComplete="tel"
              invalid={Boolean(editFieldErrors.primaryMobile)}
              keyboardType="phone-pad"
              maxLength={24}
              placeholder="9876543210"
              textContentType="telephoneNumber"
              value={draftMobile}
              onBlur={() =>
                setEditFieldErrors((current) => ({
                  ...current,
                  primaryMobile: !draftMobile
                    ? tCommon('validation.required', {
                        field: t('fields.primaryMobile'),
                      })
                    : !validCallableNumber(draftMobile)
                      ? tCommon('validation.phone')
                      : undefined,
                }))
              }
              onChangeText={(value) => {
                const primaryMobile = value.replace(/[^+\d\s()-]/g, '');
                setDraftMobile(primaryMobile);
                setEditFieldErrors((current) => ({
                  ...current,
                  primaryMobile: primaryMobile.length === 10 && !isValidPhone(primaryMobile) ? tCommon('validation.phone') : undefined,
                }));
              }}
            />
          </FormField>
          <FormField label={t('fields.email')} error={editFieldErrors.email}>
            <Input
              autoCapitalize="none"
              invalid={Boolean(editFieldErrors.email)}
              keyboardType="email-address"
              value={draftEmail}
              onChangeText={(value) => {
                setDraftEmail(value);
                if (editFieldErrors.email)
                  setEditFieldErrors((current) => ({
                    ...current,
                    email: undefined,
                  }));
              }}
            />
          </FormField>
          <LeadAdditionalFields editing value={extraDraft} onChange={setExtraDraft} />
          </View>
        </BottomSheet>
      ) : null}

      {sheet === 'stage' ? (
        <BottomSheet
          visible
          title={t('leadDetail.stageTitle')}
          description={t('leadDetail.stageDescription')}
          scroll
          showCloseButton={false}
          onClose={requestClose}
          footer={
            <SheetFooter
              cancel={tCommon('actions.cancel')}
              save={working ? t('saving') : t('save')}
              working={working || commandReview}
              onCancel={requestClose}
              onSave={saveStage}
            />
          }
        >
          <FormError message={error} />
          {commandReview ? <RefreshButton busy={loading || refreshing} label={t('refresh')} disabled={working} variant="secondary" onRefresh={() => load(true)} /> : null}
          <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working ? 'none' : 'auto'}>
          <FormField label={t('fields.status')} required error={actionFieldErrors.stage}>
            {LEAD_STAGES.filter((value) => value !== 'BOOKED').map((value) => (
              <SalesChoice
                key={value}
                label={t(`stage.${value}`)}
                selected={stage === value}
                onPress={() => {
                  setStage(value);
                  if (actionFieldErrors.stage || actionFieldErrors.lostReason) setActionFieldErrors((current) => ({ ...current, stage: undefined, lostReason: undefined }));
                }}
              />
            ))}
          </FormField>
          {stage === 'LOST' ? (
            <FormField label={t('fields.lostReason')} required error={actionFieldErrors.lostReason}>
              <Input
                invalid={Boolean(actionFieldErrors.lostReason)}
                multiline
                value={lostReason}
                onChangeText={(value) => {
                  setLostReason(value);
                  if (actionFieldErrors.lostReason) setActionFieldErrors((current) => ({ ...current, lostReason: undefined }));
                }}
                style={styles.multiline}
              />
            </FormField>
          ) : null}
          </View>
        </BottomSheet>
      ) : null}

      {sheet === 'activity' ? (
        <BottomSheet
          visible
          title={t('leadDetail.activityTitle')}
          scroll
          showCloseButton={false}
          onClose={requestClose}
          footer={
            <SheetFooter
              cancel={tCommon('actions.cancel')}
              save={working ? t('saving') : t('save')}
              working={working || commandReview}
              onCancel={requestClose}
              onSave={saveActivity}
            />
          }
        >
          <FormError message={error} />
          {commandReview ? <RefreshButton busy={loading || refreshing} label={t('refresh')} disabled={working} variant="secondary" onRefresh={() => load(true)} /> : null}
          <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working ? 'none' : 'auto'}>
          {(['CALL_OUTCOME', 'NOTE_ADDED', 'BROCHURE_SHARED'] as const).map((value) => (
            <SalesChoice key={value} label={t(`activity.${value}`)} selected={activityType === value} onPress={() => setActivityType(value)} />
          ))}
          <FormField label={t('fields.summary')} required error={activitySummaryError}>
            <Input invalid={Boolean(activitySummaryError)} value={summary} onChangeText={(value) => { setSummary(value); if (activitySummaryError) setActivitySummaryError(''); }} />
          </FormField>
          <FormField label={t('fields.details')}>
            <Input multiline value={details} onChangeText={setDetails} style={styles.multiline} />
          </FormField>
          </View>
        </BottomSheet>
      ) : null}

      {sheet === 'followUp' ? (
        <BottomSheet
          visible
          title={t('leadDetail.followUpTitle')}
          scroll
          showCloseButton={false}
          onClose={requestClose}
          footer={
            <SheetFooter
              cancel={tCommon('actions.cancel')}
              save={working ? t('leadDetail.scheduling') : t('leadDetail.schedule')}
              working={working || commandReview}
              onCancel={requestClose}
              onSave={saveFollowUp}
            />
          }
        >
          <FormError message={error} />
          {commandReview ? <RefreshButton busy={loading || refreshing} label={t('refresh')} disabled={working} variant="secondary" onRefresh={() => load(true)} /> : null}
          <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working ? 'none' : 'auto'}>
          <ScheduleFields date={scheduleDate} time={scheduleTime} errors={actionFieldErrors} setDate={setScheduleDate} setTime={setScheduleTime} setErrors={setActionFieldErrors} />
          <FormField label={t('fields.followUpType')} required>
            <View accessibilityRole="radiogroup" style={styles.followUpTypes}>
              {FOLLOW_UP_TYPES.map((value) => (
                <Chip key={value} accessibilityRole="radio" accessibilityState={{ selected: followUpType === value }} label={t(`followUpType.${value}`)} selected={followUpType === value} style={styles.followUpTypeChip} onPress={() => setFollowUpType(value)} />
              ))}
            </View>
          </FormField>
          <FormField label={t('fields.notes')}>
            <Input multiline value={details} onChangeText={setDetails} style={styles.multiline} />
          </FormField>
          <FormField label={t('fields.salesperson')} error={actionFieldErrors.assignee}><SalesChoice label={t('parity.defaultAssignee')} selected={!scheduleAssignee} onPress={() => setScheduleAssignee('')} />{assignees.options.map(option => <SalesChoice key={option.value} label={option.label} selected={scheduleAssignee === option.value} onPress={() => setScheduleAssignee(option.value)} />)}<Input placeholder={t('parity.userId')} value={scheduleAssignee} onChangeText={setScheduleAssignee} /></FormField>
          </View>
        </BottomSheet>
      ) : null}

      {sheet === 'visit' ? (
        <BottomSheet
          visible
          title={t('leadDetail.visitTitle')}
          description={t('leadDetail.visitDescription')}
          scroll
          showCloseButton={false}
          onClose={requestClose}
          footer={
            <SheetFooter
              cancel={tCommon('actions.cancel')}
              save={working ? t('leadDetail.scheduling') : t('leadDetail.schedule')}
              working={working || commandReview}
              onCancel={requestClose}
              onSave={saveVisit}
            />
          }
        >
          <FormError message={error} />
          {commandReview ? <RefreshButton busy={loading || refreshing} label={t('refresh')} disabled={working} variant="secondary" onRefresh={() => load(true)} /> : null}
          <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working ? 'none' : 'auto'}>
          <ScheduleFields date={scheduleDate} time={scheduleTime} errors={actionFieldErrors} setDate={setScheduleDate} setTime={setScheduleTime} setErrors={setActionFieldErrors} />
          <FormField label={t('fields.attendeeCount')} error={actionFieldErrors.attendeeCount}>
            <Input
              accessibilityLabel={t('fields.attendeeCount')}
              invalid={Boolean(actionFieldErrors.attendeeCount)}
              keyboardType="number-pad"
              value={visitAttendeeCount}
              onChangeText={(value) => {
                setVisitAttendeeCount(value.replace(/\D/g, '').slice(0, 4));
                if (actionFieldErrors.attendeeCount) setActionFieldErrors((current) => ({ ...current, attendeeCount: undefined }));
              }}
            />
          </FormField>
          <FormField label={t('fields.salesperson')} error={actionFieldErrors.assignee}><SalesChoice label={t('parity.defaultAssignee')} selected={!scheduleAssignee} onPress={() => setScheduleAssignee('')} />{assignees.options.map(option => <SalesChoice key={option.value} label={option.label} selected={scheduleAssignee === option.value} onPress={() => setScheduleAssignee(option.value)} />)}<Input placeholder={t('parity.userId')} value={scheduleAssignee} onChangeText={setScheduleAssignee} /></FormField>
          </View>
        </BottomSheet>
      ) : null}

      {sheet === 'assign' ? (
        <BottomSheet visible title={t('leadDetail.assignTitle')} description={t('leadDetail.assignDescription')} scroll onClose={requestClose}>
          <FormError message={error} />
          {sheetFeedback}
          {assignees.options.map(option => <SalesChoice key={option.value} label={option.label} selected={lead?.assignedTo === option.value} onPress={() => { if (!working && !commandReview) void run(() => assignLead(organizationId, projectId, leadId, token, option.value)); }} />)}
          <Input placeholder={t('parity.userId')} value={assigneeId} onChangeText={setAssigneeId} />
          <Button disabled={working || commandReview || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assigneeId)} label={t('leadDetail.assign')} onPress={() => void run(() => assignLead(organizationId, projectId, leadId, token, assigneeId))} />
          {working ? <LoadingState label={t('loading')} /> : null}
        </BottomSheet>
      ) : null}

      {sheet === 'interest' ? (
        <BottomSheet
          visible
          title={t('leadDetail.interestTitle')}
          description={t('leadDetail.interestDescription')}
          scroll
          showCloseButton={false}
          onClose={requestClose}
          footer={
            <SheetFooter
              cancel={tCommon('actions.cancel')}
              save={working ? t('saving') : t('leadDetail.saveInterest')}
              working={working || sheetOptionsUnavailable}
              onCancel={requestClose}
              onSave={saveInterest}
            />
          }
        >
          <FormError message={error} />
          {commandReview ? <RefreshButton busy={loading || refreshing} label={t('refresh')} disabled={working} variant="secondary" onRefresh={() => load(true)} /> : null}
          <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working ? 'none' : 'auto'}>
          {sheetFeedback}
          <FormField label={t('fields.unit')} required error={actionFieldErrors.unit}>
            {!sheetOptionsUnavailable ? units.length ? units.map((unit) => <SalesChoice key={unit.id} label={unit.unitNumber} description={[unit.unitType, unit.wingTower, unit.floor, t(`unitStatus.${unit.status}`)].filter(Boolean).join(' · ')} selected={selectedUnit?.id === unit.id} onPress={() => { setSelectedUnit(unit); if (actionFieldErrors.unit) setActionFieldErrors((current) => ({ ...current, unit: undefined })); }} />) : <EmptyState title={t('units.noInterestUnits')} description={t('units.noInterestUnitsDescription')} /> : null}
          </FormField>
          <FormField label={t('fields.interestLevel')} required>
            <View accessibilityRole="radiogroup" style={styles.followUpTypes}>
              {(['INTERESTED', 'HIGH_INTENT'] as const).map((status) => (
                <Chip key={status} accessibilityRole="radio" accessibilityState={{ selected: interestStatus === status }} label={t(`unitInterestStatus.${status}`)} selected={interestStatus === status} style={styles.followUpTypeChip} onPress={() => setInterestStatus(status)} />
              ))}
            </View>
          </FormField>
          <FormField label={t('fields.notes')}>
            <Input multiline value={details} onChangeText={setDetails} style={styles.multiline} />
          </FormField>
          </View>
        </BottomSheet>
      ) : null}

      {sheet === 'holdRequest' ? (
        <BottomSheet visible title={t('leadDetail.requestHoldTitle')} description={t('leadDetail.requestHoldSheetDescription')} scroll showCloseButton={false} onClose={requestClose} footer={<SheetFooter cancel={tCommon('actions.cancel')} save={working ? t('leadDetail.submitting') : t('leadDetail.submitHoldRequest')} working={working || sheetOptionsUnavailable} onCancel={requestClose} onSave={saveHoldRequest} />}>
          <FormError message={error} />
          {commandReview ? <RefreshButton busy={loading || refreshing} label={t('refresh')} disabled={working} variant="secondary" onRefresh={() => load(true)} /> : null}
          <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working ? 'none' : 'auto'}>
          {sheetFeedback}
          <FormField label={t('fields.unit')} required error={actionFieldErrors.unit}>
            {!sheetOptionsUnavailable ? interests.length ? interests.map((interest) => <SalesChoice key={interest.id} label={interest.unitNumber} description={t(`unitInterestStatus.${interest.status}`)} selected={selectedInterest?.id === interest.id} onPress={() => { setSelectedInterest(interest); if (actionFieldErrors.unit) setActionFieldErrors((current) => ({ ...current, unit: undefined })); }} />) : <EmptyState title={t('leadDetail.noHoldCandidates')} description={t('leadDetail.noHoldCandidatesDescription')} /> : null}
          </FormField>
          <FormField label={t('fields.requestNotes')}>
            <Input multiline value={details} onChangeText={setDetails} style={styles.multiline} />
          </FormField>
          </View>
        </BottomSheet>
      ) : null}

      {sheet === 'booking' && lead ? (
        <BottomSheet visible title={t('leadDetail.bookingTitle')} description={t('leadDetail.bookingDescription')} scroll showCloseButton={false} onClose={requestClose} footer={<SheetFooter cancel={tCommon('actions.cancel')} save={working ? t('leadDetail.confirming') : bookingLocked ? t('parity.bookingRetry') : t('leadDetail.confirm')} working={working || (!bookingLocked && (sheetOptionsUnavailable || !bookingIdempotencyKey))} onCancel={requestClose} onSave={() => void confirmBooking()} />}>
          <FormError message={error} />
          {bookingLocked ? <FormError message={t('parity.bookingLocked')} /> : null}
          <View style={{ gap: mobileTheme.spacing[4] }} pointerEvents={working || bookingLocked ? 'none' : 'auto'}>
          {sheetFeedback}
          <AppText style={styles.helper} weight={600}>
            {t('leadDetail.inventoryOptional')}
          </AppText>
          {!sheetOptionsUnavailable ? <SalesChoice label={t('leadDetail.noUnit')} description={t('leadDetail.noUnitDescription')} selected={!selectedUnit} onPress={() => setSelectedUnit(null)} /> : null}
          {!sheetOptionsUnavailable && permissions.includes('inventory:book') ? units.map((unit) => (
            <SalesChoice key={unit.id} label={unit.unitNumber} description={[unit.unitType, unit.wingTower, unit.floor].filter(Boolean).join(' · ')} selected={selectedUnit?.id === unit.id} onPress={() => setSelectedUnit(unit)} />
          )) : null}
          <FormField label={t('fields.bookingDate')} required error={actionFieldErrors.bookingDate}>
            <DateInput allowClear={false} accessibilityLabel={t('fields.bookingDate')} invalid={Boolean(actionFieldErrors.bookingDate)} value={scheduleDate} onChangeText={(value) => { setScheduleDate(value); if (actionFieldErrors.bookingDate) setActionFieldErrors((current) => ({ ...current, bookingDate: undefined })); }} />
          </FormField>
          <FormField label={t('fields.bookingAmount')} error={actionFieldErrors.bookingAmount ?? (bookingAmountInvalid ? tCommon('validation.number') : undefined)}>
            <Input invalid={Boolean(actionFieldErrors.bookingAmount) || bookingAmountInvalid} keyboardType="decimal-pad" value={amount} onChangeText={(value) => { setAmount(value.replace(/[^0-9.]/g, '')); if (actionFieldErrors.bookingAmount) setActionFieldErrors((current) => ({ ...current, bookingAmount: undefined })); }} />
          </FormField>
          <FormField label={t('fields.bookingReference')}>
            <Input value={reference} onChangeText={setReference} />
          </FormField>
          </View>
        </BottomSheet>
      ) : null}
    </NirmanScreenBackground>
  );
}

function SheetFooter({ cancel, save, working, onCancel, onSave }: { cancel: string; save: string; working: boolean; onCancel: () => void; onSave: () => void }) {
  return (
    <View style={styles.footer}>
      <Button style={styles.footerButton} label={cancel} variant="secondary" onPress={onCancel} />
      <Button style={styles.footerButton} disabled={working} label={save} onPress={onSave} />
    </View>
  );
}

function ScheduleFields({ date, time, errors, setDate, setTime, setErrors }: {
  date: string;
  time: string;
  errors: ActionFieldErrors;
  setDate: (value: string) => void;
  setTime: (value: string) => void;
  setErrors: Dispatch<SetStateAction<ActionFieldErrors>>;
}) {
  const { t } = useTranslation('sales');
  return (
    <>
      <FormField label={t('fields.date')} required error={errors.date}>
        <DateInput
          allowClear={false}
          accessibilityLabel={t('fields.date')}
          invalid={Boolean(errors.date)}
          value={date}
          onChangeText={(value) => {
            setDate(value);
            if (errors.date) setErrors((current) => ({ ...current, date: undefined }));
          }}
        />
      </FormField>
      <FormField label={t('fields.time')} required error={errors.time}>
        <TimeInput
          accessibilityLabel={t('fields.time')}
          invalid={Boolean(errors.time)}
          value={time}
          onChangeText={(value) => {
            setTime(value);
            if (errors.time) setErrors((current) => ({ ...current, time: undefined }));
          }}
        />
      </FormField>
    </>
  );
}

const styles = StyleSheet.create({
  flatList: { flex: 1 },
  list: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[8] },
  headerContent: {
    gap: mobileTheme.spacing[5],
    marginBottom: mobileTheme.spacing[3],
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[3],
  },
  actionList: { gap: mobileTheme.spacing[3] },
  followUpTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: mobileTheme.spacing[2],
  },
  followUpTypeChip: { minHeight: 48 },
  footer: { flex: 1, flexDirection: 'row', gap: mobileTheme.spacing[3] },
  footerButton: { flex: 1 },
  multiline: {
    minHeight: 96,
    paddingTop: mobileTheme.spacing[3],
    textAlignVertical: 'top',
  },
  helper: { ...mobileText.body, color: mobileTheme.color.text.secondary },
});
