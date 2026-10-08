import { refreshTogether } from '@nirman-app/shared';
import { RefreshFlatList } from "../../components/ui/refresh-control";

import { RefreshIconButton } from "../../components/ui/refresh-button";
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button, CompactScreenHeader, EmptyState, FormError, IconButton, LoadingState, NirmanScreenBackground, OperationalEntityCard } from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { formatDate, formatInr, formatNumber } from '../../i18n/formatters';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useSession } from '../../providers';
import { mobileTheme } from '../../theme';
import { fetchUnitInterests, fetchUnits } from './services';
import { canReadSales } from './sales-rules';
import { UnitWorkflowSheet, type UnitWorkflow } from './unit-workflow-sheet';
import { SalesDetailRows, SalesSectionHeading } from './sales-ui';
import type { SalesUnit, SalesUnitInterest } from './types';

export function SalesUnitScreen() {
  const { unitId } = useLocalSearchParams<{ unitId?: string }>();
  const { t, i18n } = useTranslation('sales');
  const { t: tCommon } = useTranslation('common');
  const { session } = useSession();
  const project = getActiveProject(session);
  const activeOrganizationId = session?.activeOrganization?.id;
  const activeProjectId = project?.id;
  const accessToken = session?.accessToken;
  const permissions = getActiveProjectPermissions(session);
  const language = (i18n.resolvedLanguage ?? 'en') as 'en' | 'hi' | 'gu';
  const [unit, setUnit] = useState<SalesUnit | null>(null);
  const [interests, setInterests] = useState<SalesUnitInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const active = project?.status === 'ACTIVE';
  const timezone = session?.activeOrganization?.workingTimezone || session?.activeOrganization?.timezone || 'Asia/Kolkata';
  const can = (p: string) => active && (permissions as readonly string[]).includes(p);
  const leadActions = canReadSales(permissions) && can('leads:update');
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<UnitWorkflow | null>(null);
  const [selectedInterest, setSelectedInterest] = useState<SalesUnitInterest | null>(null);
  const requestSequence = useRef(0);
  const displayPrice = (value: number) => value >= 10_000_000
    ? t('pricing.croreValue', { value: formatNumber(value / 10_000_000, language, { maximumFractionDigits: 2 }) })
    : value >= 100_000
      ? t('pricing.lakhValue', { value: formatNumber(value / 100_000, language, { maximumFractionDigits: 2 }) })
      : formatInr(value, language, { maximumFractionDigits: 0 });

  const load = useCallback(async (quiet = false) => {
    if (!unitId || !activeOrganizationId || !activeProjectId || !accessToken) return;
    const sequence = ++requestSequence.current;
    quiet ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [nextUnits, nextInterests] = await refreshTogether([
        fetchUnits(activeOrganizationId, activeProjectId, accessToken),
        fetchUnitInterests(activeOrganizationId, activeProjectId, unitId, accessToken),
      ]);
      if (sequence !== requestSequence.current) return;
      setUnit(nextUnits.find((item) => item.id === unitId) ?? null);
      setInterests(nextInterests);
    } catch (cause) {
      if (sequence === requestSequence.current) setError(getLocalizedErrorMessage(cause, t('errors.load')));
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [accessToken, activeOrganizationId, activeProjectId, t, unitId]);

  useFocusEffect(useCallback(() => { void load(); return () => { requestSequence.current += 1; }; }, [load]));
  function open(action: UnitWorkflow, interest?: SalesUnitInterest) { setSelectedInterest(interest ?? null); setDecision(action); }

  if (!unitId || !project || !session?.activeOrganization) return <NirmanScreenBackground><CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('unitQueue.title')} /><EmptyState title={t('noProject.title')} description={t('noProject.description')} /></NirmanScreenBackground>;

  const initialLoading = loading && !unit;

  return <NirmanScreenBackground scroll={false}>
    <RefreshFlatList busy={loading || refreshing}
      contentContainerStyle={styles.list}
      data={initialLoading ? [] : interests}
      keyExtractor={(interest) => interest.id}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      renderItem={({ item }) => <OperationalEntityCard compact contextLeading={t(`unitInterestStatus.${item.status}`)} contextTrailing={t(`stage.${item.leadStage}`)} title={item.customerName} supporting={item.primaryMobile} value={item.assignedToName ?? t('leads.unassigned')} valueLabel={t('fields.salesperson')}
        details={<SalesDetailRows rows={[{ label: t('fields.priority'), value: t(`priority.${item.leadPriority}`) }, { label: t('fields.notes'), value: item.notes }, { label: t('fields.requestNotes'), value: item.holdRequestNotes }, { label: t('parity.status'), value: item.holdRequestStatus ? t(`parity.hold${item.holdRequestStatus}`) : null }, { label: t('parity.createdAt'), value: item.holdRequestedAt ? formatDate(item.holdRequestedAt, language, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }) : null }, { label: t('parity.nextTime'), value: item.nextFollowUpAt ? formatDate(item.nextFollowUpAt, language, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }) : null }]} />}
        footerLeading={item.lastActivityAt ? t('unitQueue.lastActivity', { date: formatDate(item.lastActivityAt, language, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }) }) : t('unitQueue.noActivity')}
        footerTrailing={<View style={styles.decisionActions}>
          {leadActions && can('inventory:interest') && unit && ['AVAILABLE', 'BLOCKED'].includes(unit.status) && item.leadStage !== 'BOOKED' ? <Button fullWidth={false} label={t('parity.update')} size="sm" variant="secondary" onPress={() => open('interest', item)} /> : null}
          {leadActions && can('inventory:request-block') && unit && ['AVAILABLE', 'BLOCKED'].includes(unit.status) && item.status !== 'WITHDRAWN' && !item.holdRequestId && item.leadStage !== 'BOOKED' ? <Button fullWidth={false} label={t('leadDetail.requestHold')} size="sm" variant="secondary" onPress={() => open('request', item)} /> : null}
          {item.holdRequestId && item.holdRequestStatus === 'PENDING' && can('inventory:block') ? <><Button fullWidth={false} label={t('unitQueue.reject')} size="sm" variant="danger" onPress={() => open('REJECTED', item)} /><Button fullWidth={false} disabled={unit?.status !== 'AVAILABLE'} label={t('unitQueue.approve')} size="sm" variant="success" onPress={() => open('APPROVED', item)} /></> : null}
        </View>}
        onPress={canReadSales(permissions) ? () => router.push({ pathname: '/(app)/sales-lead', params: { leadId: item.leadId } }) : undefined}
        tone={item.status === 'SELECTED' ? 'success' : item.status === 'HIGH_INTENT' ? 'warning' : item.status === 'WAITLISTED' ? 'info' : 'neutral'} />}
      ListHeaderComponent={<View style={styles.header}>
        <CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={unit?.unitNumber ?? t('unitQueue.title')} subtitle={project.name} action={<RefreshIconButton busy={loading || refreshing} icon="refresh" accessibilityLabel={t('refresh')} disabled={loading || refreshing} variant="glass" onRefresh={() => load(true)} />} />
        <FormError message={error} />
        {!active ? <FormError message={t('parity.readOnly')} /> : null}
        {initialLoading ? <LoadingState label={t('loading')} /> : <>
          {unit ? <OperationalEntityCard contextLeading={[unit.wingTower, unit.floor].filter(Boolean).join(' · ') || t('units.inventory')} contextTrailing={t(`unitStatus.${unit.status}`)} title={unit.unitNumber} supporting={[unit.unitType, unit.areaSqft ? t('units.area', { value: unit.areaSqft }) : null, unit.priceBasis === 'PER_SQFT' && unit.ratePerSqft ? t('pricing.rateValue', { value: formatNumber(unit.ratePerSqft, language) }) : null].filter(Boolean).join(' · ')} value={unit.basePrice == null ? undefined : displayPrice(unit.basePrice)} valueLabel={unit.basePrice == null ? undefined : unit.priceBasis === 'PER_SQFT' ? t('pricing.estimatedTotal') : t('pricing.totalPrice')} footerLeading={t('units.interestCount', { count: Number(unit.interestCount ?? interests.length) })} tone={unit.status === 'AVAILABLE' ? 'success' : unit.status === 'BLOCKED' ? 'warning' : 'info'} /> : null}
          {unit ? <>
            <SalesDetailRows rows={[{ label: t('fields.unitType'), value: unit.unitType }, { label: t('fields.wingTower'), value: unit.wingTower }, { label: t('fields.floor'), value: unit.floor }, { label: t('fields.areaSqft'), value: unit.areaSqft?.toString() }, { label: t('fields.facing'), value: unit.facing }, { label: t('fields.totalPrice'), value: unit.basePrice == null ? null : formatInr(unit.basePrice, language) }, { label: t('fields.priceBasis'), value: t(`pricing.${unit.priceBasis}`) }, { label: t('fields.ratePerSqft'), value: unit.ratePerSqft == null ? null : formatInr(unit.ratePerSqft, language) }, { label: t('parity.blockedBy'), value: unit.blockedBy ? t('parity.nameUnavailable') : null }, { label: t('parity.expiry'), value: unit.blockExpiresAt ? formatDate(unit.blockExpiresAt, language, { dateStyle: 'medium', timeStyle: 'short', timeZone: timezone }) : null }, { label: t('parity.pendingRequests'), value: String(unit.pendingHoldRequestCount) }]} />
            <View style={styles.decisionActions}>
              {can('inventory:manage') && !['BLOCKED', 'BOOKED'].includes(unit.status) ? <Button fullWidth={false} label={t('units.edit')} variant="secondary" onPress={() => open('edit')} /> : null}
              {leadActions && can('inventory:interest') && ['AVAILABLE', 'BLOCKED'].includes(unit.status) ? <Button fullWidth={false} label={t('leadDetail.recordInterest')} variant="secondary" onPress={() => open('interest')} /> : null}
              {leadActions && can('inventory:block') && unit.status === 'AVAILABLE' ? <Button fullWidth={false} label={t('parity.block')} variant="secondary" onPress={() => open('block')} /> : null}
              {can('inventory:block') && unit.status === 'BLOCKED' && unit.activeBlockId ? <Button fullWidth={false} label={t('units.release')} variant="danger" onPress={() => open('release')} /> : null}
              {unit.blockedForLeadId && canReadSales(permissions) ? <Button fullWidth={false} label={t('bookings.openLead')} variant="secondary" onPress={() => router.push({ pathname: '/(app)/sales-lead', params: { leadId: unit.blockedForLeadId! } })} /> : null}
            </View>
          </> : null}
          <SalesSectionHeading title={t('unitQueue.interestedCustomers')} description={t('unitQueue.description')} />
        </>}
      </View>}
      ListEmptyComponent={!initialLoading && !error ? <EmptyState title={t('unitQueue.emptyTitle')} description={t('unitQueue.emptyDescription')} /> : null}
    />

    {decision && unit ? <UnitWorkflowSheet key={`${unit.id}:${decision}:${selectedInterest?.id}`} unit={unit} action={decision} interest={selectedInterest ?? undefined} close={() => setDecision(null)} saved={() => { setDecision(null); void load(true); }} /> : null}
  </NirmanScreenBackground>;
}

const styles = StyleSheet.create({
  list: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[8] },
  header: { gap: mobileTheme.spacing[5], marginBottom: mobileTheme.spacing[3] },
  decisionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] },
  footer: { flex: 1, flexDirection: 'row', gap: mobileTheme.spacing[3] },
  footerButton: { flex: 1 },
  notes: { minHeight: 96, paddingTop: mobileTheme.spacing[3], textAlignVertical: 'top' },
});
