import {
  FOLLOW_UP_TYPES,
  LEAD_STAGES,
  type FollowUpType,
  type LeadStage,
} from '@nirman-app/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  BottomSheet,
  Button,
  Chip,
  CompactScreenHeader,
  DateInput,
  EmptyState,
  FormError,
  FormField,
  IconButton,
  Input,
  LoadingState,
  NirmanScreenBackground,
  OperationalEntityCard,
  TimeInput,
} from '../../components/ui';
import { formatInr } from '../../i18n/formatters';
import { getLocalizedErrorMessage } from '../../i18n';
import { formatDateOnly, isValidEmail, isValidPhone, sanitizePhoneInput } from '../../lib/validation';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { fetchProjectMembers } from '../members/services';
import type { ProjectMember } from '../members/types';
import { ProjectContextCard } from '../projects';
import {
  addActivity,
  assignLead,
  createBooking,
  createFollowUp,
  createSiteVisit,
  fetchActivities,
  fetchLead,
  fetchLeadUnitInterests,
  fetchUnits,
  requestUnitHold,
  saveUnitInterest,
  updateLead,
} from './services';
import { SalesActivityCard, SalesChoice, SalesDetailRows, SalesSectionHeading } from './sales-ui';
import type { SalesActivity, SalesLead, SalesUnit, SalesUnitInterest } from './types';

type SheetKey = 'stage' | 'activity' | 'followUp' | 'visit' | 'assign' | 'interest' | 'holdRequest' | 'booking' | 'edit' | null;
type EditFieldErrors = Partial<Record<'customerName' | 'primaryMobile' | 'email', string>>;

function toIso(date: string, time: string) {
  const value = new Date(`${date}T${/^\d{2}:\d{2}$/.test(time) ? time : '10:00'}:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

export function SalesLeadScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>();
  const { t, i18n } = useTranslation('sales');
  const { t: tCommon } = useTranslation('common');
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const language = (i18n.resolvedLanguage ?? 'en') as 'en' | 'hi' | 'gu';
  const [lead, setLead] = useState<SalesLead | null>(null);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [units, setUnits] = useState<SalesUnit[]>([]);
  const [interests, setInterests] = useState<SalesUnitInterest[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKey>(null);
  const [stage, setStage] = useState<LeadStage>('NEW');
  const [lostReason, setLostReason] = useState('');
  const [activityType, setActivityType] = useState<'CALL_OUTCOME' | 'NOTE_ADDED' | 'BROCHURE_SHARED'>('NOTE_ADDED');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [scheduleDate, setScheduleDate] = useState(formatDateOnly(new Date()));
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [followUpType, setFollowUpType] = useState<FollowUpType>('PHONE');
  const [selectedUnit, setSelectedUnit] = useState<SalesUnit | null>(null);
  const [selectedInterest, setSelectedInterest] = useState<SalesUnitInterest | null>(null);
  const [interestStatus, setInterestStatus] = useState<'INTERESTED' | 'HIGH_INTENT'>('INTERESTED');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftMobile, setDraftMobile] = useState('');
  const [draftEmail, setDraftEmail] = useState('');
  const [editFormError, setEditFormError] = useState('');
  const [editFieldErrors, setEditFieldErrors] = useState<EditFieldErrors>({});

  const load = useCallback(async (quiet = false) => {
    if (!leadId || !session?.activeOrganization || !project) return;
    quiet ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [nextLead, nextActivities] = await Promise.all([
        fetchLead(session.activeOrganization.id, project.id, leadId, session.accessToken),
        fetchActivities(session.activeOrganization.id, project.id, leadId, session.accessToken),
      ]);
      setLead(nextLead); setActivities(nextActivities);
    } catch (cause) { setError(getLocalizedErrorMessage(cause, t('errors.load'))); }
    finally { setLoading(false); setRefreshing(false); }
  }, [leadId, project, session, t]);

  useEffect(() => { void load(); }, [load]);

  const callableNumber = useMemo(() => lead?.primaryMobile.replace(/[^+\d]/g, '') ?? '', [lead?.primaryMobile]);

  async function run(action: () => Promise<unknown>, close = true) {
    setWorking(true); setError(null);
    try { await action(); if (close) setSheet(null); await load(true); }
    catch (cause) { setError(getLocalizedErrorMessage(cause, t('errors.save'))); }
    finally { setWorking(false); }
  }

  async function openUnits(nextSheet: 'interest' | 'booking') {
    if (!session?.activeOrganization || !project) return;
    if (nextSheet === 'booking' && !permissions.includes('inventory:read')) {
      setUnits([]); setSelectedUnit(null); setSheet(nextSheet); return;
    }
    setWorking(true); setError(null);
    try {
      const nextUnits = await fetchUnits(session.activeOrganization.id, project.id, session.accessToken);
      setUnits(nextSheet === 'booking' ? nextUnits.filter((unit) => unit.status === 'AVAILABLE' || (unit.status === 'BLOCKED' && unit.blockedForLeadId === leadId)) : nextUnits.filter((unit) => unit.status === 'AVAILABLE' || unit.status === 'BLOCKED'));
      setSelectedUnit(null); setSheet(nextSheet);
    }
    catch (cause) { Alert.alert(t('errors.title'), getLocalizedErrorMessage(cause, t('errors.load'))); }
    finally { setWorking(false); }
  }

  async function openHoldRequests() {
    if (!session?.activeOrganization || !project || !leadId) return;
    setWorking(true); setError(null);
    try {
      setInterests((await fetchLeadUnitInterests(session.activeOrganization.id, project.id, leadId, session.accessToken)).filter((interest) => interest.status !== 'WITHDRAWN'));
      setSelectedInterest(null); setDetails(''); setSheet('holdRequest');
    } catch (cause) { Alert.alert(t('errors.title'), getLocalizedErrorMessage(cause, t('errors.load'))); }
    finally { setWorking(false); }
  }

  async function openAssignees() {
    if (!session?.activeOrganization || !project) return;
    setWorking(true);
    try { setMembers(await fetchProjectMembers(session.activeOrganization.id, project.id, session.accessToken)); setSheet('assign'); }
    catch (cause) { Alert.alert(t('errors.title'), getLocalizedErrorMessage(cause, t('errors.load'))); }
    finally { setWorking(false); }
  }

  if (!leadId || !project || !session?.activeOrganization) return <NirmanScreenBackground><CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('leadDetail.title')} /><EmptyState title={t('noProject.title')} description={t('noProject.description')} /></NirmanScreenBackground>;

  const organizationId = session.activeOrganization.id;
  const projectId = project.id;
  const token = session.accessToken;
  const scheduledAt = toIso(scheduleDate, scheduleTime);
  const recentActivities = activities.slice(0, 3);

  async function saveCustomerDetails() {
    setEditFormError('');
    const nextFieldErrors: EditFieldErrors = {};
    if (!draftName.trim()) nextFieldErrors.customerName = tCommon('validation.required', { field: t('fields.customerName') });
    else if (draftName.trim().length < 2) nextFieldErrors.customerName = t('errors.requiredLead');
    if (!draftMobile.trim()) nextFieldErrors.primaryMobile = tCommon('validation.required', { field: t('fields.primaryMobile') });
    else if (!isValidPhone(draftMobile)) nextFieldErrors.primaryMobile = tCommon('validation.phone');
    if (draftEmail.trim() && !isValidEmail(draftEmail)) nextFieldErrors.email = tCommon('validation.email');
    setEditFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;
    setWorking(true);
    try {
      await updateLead(organizationId, projectId, leadId!, token, { customerName: draftName.trim(), primaryMobile: draftMobile.trim(), email: draftEmail.trim() || undefined });
      setSheet(null);
      setEditFieldErrors({});
      await load(true);
    } catch (cause) { setEditFormError(getLocalizedErrorMessage(cause, t('errors.save'))); }
    finally { setWorking(false); }
  }

  function closeEditForm() {
    setSheet(null);
    setEditFormError('');
    setEditFieldErrors({});
  }

  return <NirmanScreenBackground scroll={false}>
    <FlatList
      contentContainerStyle={styles.list}
      data={loading ? [] : recentActivities}
      style={styles.flatList}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      renderItem={({ item }) => <SalesActivityCard activity={item} />}
      ListHeaderComponent={<View style={styles.headerContent}>
        <CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={lead?.customerName ?? t('leadDetail.title')} subtitle={project.name} action={<IconButton icon="refresh" accessibilityLabel={t('refresh')} variant="glass" onPress={() => void load(true)} />} />
        <ProjectContextCard compact />
        <FormError message={error} />
        {loading ? <LoadingState label={t('loading')} /> : null}
        {lead ? <>
          <OperationalEntityCard contextLeading={t(`priority.${lead.priority}`)} contextTrailing={t(`stage.${lead.currentStage}`)} title={lead.customerName} supporting={lead.primaryMobile} value={lead.interestedUnitNumber ?? undefined} valueLabel={lead.interestedUnitNumber ? t('leads.unit') : undefined} footerLeading={lead.assignedToName ?? t('leads.unassigned')} tone={lead.priority === 'URGENT' ? 'danger' : lead.priority === 'HIGH' ? 'warning' : 'info'} details={<SalesDetailRows rows={[{ label: t('fields.email'), value: lead.email }, { label: t('fields.source'), value: t(`source.${lead.source}`) }, { label: t('fields.budget'), value: lead.budgetMin != null || lead.budgetMax != null ? `${lead.budgetMin == null ? '—' : formatInr(lead.budgetMin, language, { maximumFractionDigits: 0 })} – ${lead.budgetMax == null ? '—' : formatInr(lead.budgetMax, language, { maximumFractionDigits: 0 })}` : null }, { label: t('fields.createdBy'), value: lead.createdByName }, { label: t('fields.lostReason'), value: lead.lostReason }]} />}/>
          <View style={styles.actions}>
            <Button fullWidth={false} label={t('leadDetail.call')} leadingIcon="phone-outline" variant="success" onPress={() => void Linking.openURL(`tel:${callableNumber}`)} />
            <Button fullWidth={false} label={t('leadDetail.edit')} leadingIcon="pencil-outline" variant="secondary" onPress={() => { setDraftName(lead.customerName); setDraftMobile(lead.primaryMobile); setDraftEmail(lead.email ?? ''); setEditFormError(''); setEditFieldErrors({}); setSheet('edit'); }} />
          </View>
          <SalesSectionHeading title={t('leadDetail.actions')} description={t('leadDetail.actionsDescription')} />
          <View style={styles.actionList}>
            {permissions.includes('leads:update') ? <SalesChoice label={t('leadDetail.changeStage')} description={t(`stage.${lead.currentStage}`)} icon="swap-horizontal" onPress={() => { setStage(lead.currentStage); setLostReason(lead.lostReason ?? ''); setSheet('stage'); }} /> : null}
            {permissions.includes('leads:assign') || permissions.includes('leads:reassign') ? <SalesChoice label={t('leadDetail.assign')} description={lead.assignedToName ?? t('leads.unassigned')} icon="account-switch-outline" onPress={() => void openAssignees()} /> : null}
            {permissions.includes('leads:update') ? <SalesChoice label={t('leadDetail.addActivity')} description={t('leadDetail.addActivityDescription')} icon="text-box-plus-outline" onPress={() => { setSummary(''); setDetails(''); setSheet('activity'); }} /> : null}
            {permissions.includes('followups:manage') ? <SalesChoice label={t('leadDetail.scheduleFollowUp')} description={t('leadDetail.scheduleFollowUpDescription')} icon="calendar-clock-outline" onPress={() => { setDetails(''); setSheet('followUp'); }} /> : null}
            {permissions.includes('site-visits:manage') ? <SalesChoice label={t('leadDetail.scheduleVisit')} description={t('leadDetail.scheduleVisitDescription')} icon="map-marker-plus-outline" onPress={() => { setDetails(''); setSheet('visit'); }} /> : null}
            {permissions.includes('inventory:interest') && lead.currentStage !== 'BOOKED' ? <SalesChoice label={t('leadDetail.recordInterest')} description={t('leadDetail.recordInterestDescription')} icon="home-heart" onPress={() => { setDetails(''); setInterestStatus('INTERESTED'); void openUnits('interest'); }} /> : null}
            {permissions.includes('inventory:request-block') && lead.currentStage !== 'BOOKED' ? <SalesChoice label={t('leadDetail.requestHold')} description={t('leadDetail.requestHoldDescription')} icon="lock-clock" onPress={() => void openHoldRequests()} /> : null}
            {permissions.includes('leads:convert') && lead.currentStage !== 'BOOKED' ? <SalesChoice label={t('leadDetail.confirmBooking')} description={t('leadDetail.confirmBookingDescription')} icon="check-decagram-outline" onPress={() => { setAmount(''); setReference(''); void openUnits('booking'); }} /> : null}
          </View>
          <SalesSectionHeading title={t('leadDetail.recentActivity')} description={t('leadDetail.recentActivityDescription')} />
        </> : null}
      </View>}
      ListEmptyComponent={!loading && lead ? <EmptyState title={t('leadDetail.emptyTimeline')} description={t('leadDetail.emptyTimelineDescription')} /> : null}
      ListFooterComponent={activities.length > 3 ? <Button label={t('leadDetail.viewAllActivity', { count: activities.length })} leadingIcon="format-list-bulleted" variant="secondary" onPress={() => router.push({ pathname: '/(app)/sales-activity', params: { leadId } })} /> : null}
    />

    {sheet === 'edit' ? <BottomSheet visible title={t('leadDetail.editTitle')} scroll showCloseButton={false} onClose={closeEditForm} footer={<SheetFooter cancel={tCommon('actions.cancel')} save={t('save')} working={working} onCancel={closeEditForm} onSave={() => void saveCustomerDetails()} />}><FormError message={editFormError} /><FormField label={t('fields.customerName')} required error={editFieldErrors.customerName}><Input invalid={Boolean(editFieldErrors.customerName)} value={draftName} onChangeText={(value) => { setDraftName(value); if (editFieldErrors.customerName) setEditFieldErrors((current) => ({ ...current, customerName: undefined })); }} /></FormField><FormField label={t('fields.primaryMobile')} required error={editFieldErrors.primaryMobile}><Input autoComplete="tel" invalid={Boolean(editFieldErrors.primaryMobile)} keyboardType="phone-pad" maxLength={10} placeholder="9876543210" textContentType="telephoneNumber" value={draftMobile} onBlur={() => setEditFieldErrors((current) => ({ ...current, primaryMobile: !draftMobile ? tCommon('validation.required', { field: t('fields.primaryMobile') }) : !isValidPhone(draftMobile) ? tCommon('validation.phone') : undefined }))} onChangeText={(value) => { const primaryMobile = sanitizePhoneInput(value); setDraftMobile(primaryMobile); setEditFieldErrors((current) => ({ ...current, primaryMobile: primaryMobile.length === 10 && !isValidPhone(primaryMobile) ? tCommon('validation.phone') : undefined })); }} /></FormField><FormField label={t('fields.email')} optional error={editFieldErrors.email}><Input autoCapitalize="none" invalid={Boolean(editFieldErrors.email)} keyboardType="email-address" value={draftEmail} onChangeText={(value) => { setDraftEmail(value); if (editFieldErrors.email) setEditFieldErrors((current) => ({ ...current, email: undefined })); }} /></FormField></BottomSheet> : null}

    {sheet === 'stage' ? <BottomSheet visible title={t('leadDetail.stageTitle')} description={t('leadDetail.stageDescription')} scroll showCloseButton={false} onClose={() => setSheet(null)} footer={<SheetFooter cancel={tCommon('actions.cancel')} save={t('save')} working={working || stage === 'BOOKED' || (stage === 'LOST' && !lostReason.trim())} onCancel={() => setSheet(null)} onSave={() => void run(() => updateLead(organizationId, projectId, leadId, token, { currentStage: stage, ...(stage === 'LOST' ? { lostReason: lostReason.trim() } : {}) }))} />}><FormError message={error} />{LEAD_STAGES.filter((value) => value !== 'BOOKED').map((value) => <SalesChoice key={value} label={t(`stage.${value}`)} selected={stage === value} onPress={() => setStage(value)} />)}{stage === 'LOST' ? <FormField label={t('fields.lostReason')} required><Input multiline value={lostReason} onChangeText={setLostReason} style={styles.multiline} /></FormField> : null}</BottomSheet> : null}

    {sheet === 'activity' ? <BottomSheet visible title={t('leadDetail.activityTitle')} scroll showCloseButton={false} onClose={() => setSheet(null)} footer={<SheetFooter cancel={tCommon('actions.cancel')} save={t('save')} working={working || !summary.trim()} onCancel={() => setSheet(null)} onSave={() => void run(() => addActivity(organizationId, projectId, leadId, token, { activityType, summary: summary.trim(), details: details.trim() || undefined }))} />}><FormError message={error} />{(['CALL_OUTCOME', 'NOTE_ADDED', 'BROCHURE_SHARED'] as const).map((value) => <SalesChoice key={value} label={t(`activity.${value}`)} selected={activityType === value} onPress={() => setActivityType(value)} />)}<FormField label={t('fields.summary')} required><Input value={summary} onChangeText={setSummary} /></FormField><FormField label={t('fields.details')} optional><Input multiline value={details} onChangeText={setDetails} style={styles.multiline} /></FormField></BottomSheet> : null}

    {sheet === 'followUp' ? <BottomSheet visible title={t('leadDetail.followUpTitle')} scroll showCloseButton={false} onClose={() => setSheet(null)} footer={<SheetFooter cancel={tCommon('actions.cancel')} save={t('leadDetail.schedule')} working={working || !scheduledAt} onCancel={() => setSheet(null)} onSave={() => scheduledAt && void run(() => createFollowUp(organizationId, projectId, leadId, token, { scheduledAt, type: followUpType, notes: details.trim() || undefined }))} />}><FormError message={error} /><ScheduleFields date={scheduleDate} time={scheduleTime} setDate={setScheduleDate} setTime={setScheduleTime} /><FormField label={t('fields.followUpType')} required><View accessibilityRole="radiogroup" style={styles.followUpTypes}>{FOLLOW_UP_TYPES.map((value) => <Chip key={value} accessibilityRole="radio" accessibilityState={{ selected: followUpType === value }} label={t(`followUpType.${value}`)} selected={followUpType === value} style={styles.followUpTypeChip} onPress={() => setFollowUpType(value)} />)}</View></FormField><FormField label={t('fields.notes')} optional><Input multiline value={details} onChangeText={setDetails} style={styles.multiline} /></FormField></BottomSheet> : null}

    {sheet === 'visit' ? <BottomSheet visible title={t('leadDetail.visitTitle')} scroll showCloseButton={false} onClose={() => setSheet(null)} footer={<SheetFooter cancel={tCommon('actions.cancel')} save={t('leadDetail.schedule')} working={working || !scheduledAt} onCancel={() => setSheet(null)} onSave={() => scheduledAt && void run(() => createSiteVisit(organizationId, projectId, leadId, token, { scheduledAt }))} />}><FormError message={error} /><ScheduleFields date={scheduleDate} time={scheduleTime} setDate={setScheduleDate} setTime={setScheduleTime} /></BottomSheet> : null}

    {sheet === 'assign' ? <BottomSheet visible title={t('leadDetail.assignTitle')} description={t('leadDetail.assignDescription')} scroll onClose={() => setSheet(null)}><FormError message={error} />{members.filter((member) => member.status === 'ACTIVE').map((member) => <SalesChoice key={member.user.id} label={member.user.name} description={member.role.name} selected={lead?.assignedTo === member.user.id} onPress={() => void run(() => assignLead(organizationId, projectId, leadId, token, member.user.id))} />)}</BottomSheet> : null}

    {sheet === 'interest' ? <BottomSheet visible title={t('leadDetail.interestTitle')} description={t('leadDetail.interestDescription')} scroll showCloseButton={false} onClose={() => setSheet(null)} footer={<SheetFooter cancel={tCommon('actions.cancel')} save={t('leadDetail.saveInterest')} working={working || !selectedUnit} onCancel={() => setSheet(null)} onSave={() => selectedUnit && void run(() => saveUnitInterest(organizationId, projectId, selectedUnit.id, token, { leadId, status: interestStatus, notes: details.trim() || undefined }))} />}><FormError message={error} />{units.length ? units.map((unit) => <SalesChoice key={unit.id} label={unit.unitNumber} description={[unit.unitType, unit.wingTower, unit.floor, t(`unitStatus.${unit.status}`)].filter(Boolean).join(' · ')} selected={selectedUnit?.id === unit.id} onPress={() => setSelectedUnit(unit)} />) : <EmptyState title={t('units.noInterestUnits')} description={t('units.noInterestUnitsDescription')} />}<FormField label={t('fields.interestLevel')} required><View accessibilityRole="radiogroup" style={styles.followUpTypes}>{(['INTERESTED', 'HIGH_INTENT'] as const).map((status) => <Chip key={status} accessibilityRole="radio" accessibilityState={{ selected: interestStatus === status }} label={t(`unitInterestStatus.${status}`)} selected={interestStatus === status} style={styles.followUpTypeChip} onPress={() => setInterestStatus(status)} />)}</View></FormField><FormField label={t('fields.notes')} optional><Input multiline value={details} onChangeText={setDetails} style={styles.multiline} /></FormField></BottomSheet> : null}

    {sheet === 'holdRequest' ? <BottomSheet visible title={t('leadDetail.requestHoldTitle')} description={t('leadDetail.requestHoldSheetDescription')} scroll showCloseButton={false} onClose={() => setSheet(null)} footer={<SheetFooter cancel={tCommon('actions.cancel')} save={t('leadDetail.submitHoldRequest')} working={working || !selectedInterest} onCancel={() => setSheet(null)} onSave={() => selectedInterest && void run(() => requestUnitHold(organizationId, projectId, selectedInterest.unitId, token, { leadId, notes: details.trim() || undefined }))} />}><FormError message={error} />{interests.filter((interest) => !interest.holdRequestId).length ? interests.filter((interest) => !interest.holdRequestId).map((interest) => <SalesChoice key={interest.id} label={interest.unitNumber} description={t(`unitInterestStatus.${interest.status}`)} selected={selectedInterest?.id === interest.id} onPress={() => setSelectedInterest(interest)} />) : <EmptyState title={t('leadDetail.noHoldCandidates')} description={t('leadDetail.noHoldCandidatesDescription')} />}<FormField label={t('fields.requestNotes')} optional><Input multiline value={details} onChangeText={setDetails} style={styles.multiline} /></FormField></BottomSheet> : null}

    {sheet === 'booking' && lead ? <BottomSheet visible title={t('leadDetail.bookingTitle')} description={t('leadDetail.bookingDescription')} scroll showCloseButton={false} onClose={() => setSheet(null)} footer={<SheetFooter cancel={tCommon('actions.cancel')} save={t('leadDetail.confirm')} working={working} onCancel={() => setSheet(null)} onSave={() => void run(() => createBooking(organizationId, projectId, token, { idempotencyKey: `${leadId}-${Date.now()}-mobile`, leadId, ...(selectedUnit ? { unitId: selectedUnit.id } : {}), bookingDate: scheduleDate, customerName: lead.customerName, customerMobile: lead.primaryMobile, ...(amount ? { bookingAmount: Number(amount) } : {}), ...(reference.trim() ? { bookingReference: reference.trim() } : {}) }))} />}><FormError message={error} /><AppText style={styles.helper} weight={600}>{t('leadDetail.inventoryOptional')}</AppText><SalesChoice label={t('leadDetail.noUnit')} description={t('leadDetail.noUnitDescription')} selected={!selectedUnit} onPress={() => setSelectedUnit(null)} />{units.map((unit) => <SalesChoice key={unit.id} label={unit.unitNumber} description={[unit.unitType, unit.wingTower, unit.floor].filter(Boolean).join(' · ')} selected={selectedUnit?.id === unit.id} onPress={() => setSelectedUnit(unit)} />)}<FormField label={t('fields.bookingDate')} required><DateInput allowClear={false} accessibilityLabel={t('fields.bookingDate')} value={scheduleDate} onChangeText={setScheduleDate} /></FormField><FormField label={t('fields.bookingAmount')} optional><Input keyboardType="decimal-pad" value={amount} onChangeText={setAmount} /></FormField><FormField label={t('fields.bookingReference')} optional><Input value={reference} onChangeText={setReference} /></FormField></BottomSheet> : null}
  </NirmanScreenBackground>;
}

function SheetFooter({ cancel, save, working, onCancel, onSave }: { cancel: string; save: string; working: boolean; onCancel: () => void; onSave: () => void }) {
  return <View style={styles.footer}><Button style={styles.footerButton} label={cancel} variant="secondary" onPress={onCancel} /><Button style={styles.footerButton} disabled={working} label={save} onPress={onSave} /></View>;
}

function ScheduleFields({ date, time, setDate, setTime }: { date: string; time: string; setDate: (value: string) => void; setTime: (value: string) => void }) {
  const { t } = useTranslation('sales');
  return <><FormField label={t('fields.date')} required><DateInput allowClear={false} accessibilityLabel={t('fields.date')} value={date} onChangeText={setDate} /></FormField><FormField label={t('fields.time')} required><TimeInput accessibilityLabel={t('fields.time')} value={time} onChangeText={setTime} /></FormField></>;
}

const styles = StyleSheet.create({
  flatList: { flex: 1 },
  list: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[8] },
  headerContent: { gap: mobileTheme.spacing[5], marginBottom: mobileTheme.spacing[3] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[3] },
  actionList: { gap: mobileTheme.spacing[3] },
  followUpTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  followUpTypeChip: { minHeight: 48 },
  footer: { flex: 1, flexDirection: 'row', gap: mobileTheme.spacing[3] },
  footerButton: { flex: 1 },
  multiline: { minHeight: 96, paddingTop: mobileTheme.spacing[3], textAlignVertical: 'top' },
  helper: { ...mobileText.body, color: mobileTheme.color.text.secondary },
});
