import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BottomSheet, Button, CompactScreenHeader, EmptyState, FormError, FormField, IconButton, Input, LoadingState, NirmanScreenBackground, OperationalEntityCard } from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { formatDate, formatInr, formatNumber } from '../../i18n/formatters';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useSession } from '../../providers';
import { mobileTheme } from '../../theme';
import { decideUnitHoldRequest, fetchUnitInterests, fetchUnits } from './services';
import { SalesSectionHeading } from './sales-ui';
import type { SalesUnit, SalesUnitInterest } from './types';

export function SalesUnitScreen() {
  const { unitId } = useLocalSearchParams<{ unitId?: string }>();
  const { t, i18n } = useTranslation('sales');
  const { t: tCommon } = useTranslation('common');
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const language = (i18n.resolvedLanguage ?? 'en') as 'en' | 'hi' | 'gu';
  const [unit, setUnit] = useState<SalesUnit | null>(null);
  const [interests, setInterests] = useState<SalesUnitInterest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);
  const [selectedInterest, setSelectedInterest] = useState<SalesUnitInterest | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const displayPrice = (value: number) => value >= 10_000_000
    ? t('pricing.croreValue', { value: formatNumber(value / 10_000_000, language, { maximumFractionDigits: 2 }) })
    : value >= 100_000
      ? t('pricing.lakhValue', { value: formatNumber(value / 100_000, language, { maximumFractionDigits: 2 }) })
      : formatInr(value, language, { maximumFractionDigits: 0 });

  const load = useCallback(async (quiet = false) => {
    if (!unitId || !session?.activeOrganization || !project) return;
    quiet ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [nextUnits, nextInterests] = await Promise.all([
        fetchUnits(session.activeOrganization.id, project.id, session.accessToken),
        fetchUnitInterests(session.activeOrganization.id, project.id, unitId, session.accessToken),
      ]);
      setUnit(nextUnits.find((item) => item.id === unitId) ?? null);
      setInterests(nextInterests);
    } catch (cause) { setError(getLocalizedErrorMessage(cause, t('errors.load'))); }
    finally { setLoading(false); setRefreshing(false); }
  }, [project, session, t, unitId]);

  useEffect(() => { void load(); }, [load]);

  async function submitDecision() {
    if (!decision || !selectedInterest?.holdRequestId || !session?.activeOrganization || !project) return;
    setWorking(true); setError(null);
    try {
      await decideUnitHoldRequest(session.activeOrganization.id, project.id, selectedInterest.holdRequestId, session.accessToken, { decision, notes: decisionNotes.trim() || undefined });
      setDecision(null); setSelectedInterest(null); setDecisionNotes('');
      await load(true);
    } catch (cause) { setError(getLocalizedErrorMessage(cause, t('errors.save'))); }
    finally { setWorking(false); }
  }

  if (!unitId || !project || !session?.activeOrganization) return <NirmanScreenBackground><CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('unitQueue.title')} /><EmptyState title={t('noProject.title')} description={t('noProject.description')} /></NirmanScreenBackground>;

  return <NirmanScreenBackground scroll={false}>
    <FlatList
      contentContainerStyle={styles.list}
      data={loading ? [] : interests}
      keyExtractor={(interest) => interest.id}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      renderItem={({ item }) => <OperationalEntityCard compact contextLeading={t(`unitInterestStatus.${item.status}`)} contextTrailing={t(`stage.${item.leadStage}`)} title={item.customerName} supporting={item.primaryMobile} value={item.assignedToName ?? t('leads.unassigned')} valueLabel={t('fields.salesperson')} footerLeading={item.lastActivityAt ? t('unitQueue.lastActivity', { date: formatDate(item.lastActivityAt, language, { dateStyle: 'medium', timeStyle: 'short' }) }) : t('unitQueue.noActivity')} footerTrailing={item.holdRequestId && permissions.includes('inventory:block') ? <View style={styles.decisionActions}><Button fullWidth={false} label={t('unitQueue.reject')} size="sm" variant="danger" onPress={() => { setSelectedInterest(item); setDecision('REJECTED'); setDecisionNotes(''); }} /><Button fullWidth={false} disabled={unit?.status !== 'AVAILABLE'} label={t('unitQueue.approve')} size="sm" variant="success" onPress={() => { setSelectedInterest(item); setDecision('APPROVED'); setDecisionNotes(''); }} /></View> : undefined} tone={item.status === 'SELECTED' ? 'success' : item.status === 'HIGH_INTENT' ? 'warning' : item.status === 'WAITLISTED' ? 'info' : 'neutral'} />}
      ListHeaderComponent={<View style={styles.header}>
        <CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={unit?.unitNumber ?? t('unitQueue.title')} subtitle={project.name} action={<IconButton icon="refresh" accessibilityLabel={t('refresh')} variant="glass" onPress={() => void load(true)} />} />
        <FormError message={error} />
        {loading ? <LoadingState label={t('loading')} /> : null}
        {unit ? <OperationalEntityCard contextLeading={[unit.wingTower, unit.floor].filter(Boolean).join(' · ') || t('units.inventory')} contextTrailing={t(`unitStatus.${unit.status}`)} title={unit.unitNumber} supporting={[unit.unitType, unit.areaSqft ? t('units.area', { value: unit.areaSqft }) : null, unit.priceBasis === 'PER_SQFT' && unit.ratePerSqft ? t('pricing.rateValue', { value: formatNumber(unit.ratePerSqft, language) }) : null].filter(Boolean).join(' · ')} value={unit.basePrice == null ? undefined : displayPrice(unit.basePrice)} valueLabel={unit.basePrice == null ? undefined : unit.priceBasis === 'PER_SQFT' ? t('pricing.estimatedTotal') : t('pricing.totalPrice')} footerLeading={t('units.interestCount', { count: Number(unit.interestCount ?? interests.length) })} tone={unit.status === 'AVAILABLE' ? 'success' : unit.status === 'BLOCKED' ? 'warning' : 'info'} /> : null}
        <SalesSectionHeading title={t('unitQueue.interestedCustomers')} description={t('unitQueue.description')} />
      </View>}
      ListEmptyComponent={!loading && !error ? <EmptyState title={t('unitQueue.emptyTitle')} description={t('unitQueue.emptyDescription')} /> : null}
    />

    {decision && selectedInterest ? <BottomSheet visible title={t(decision === 'APPROVED' ? 'unitQueue.approveTitle' : 'unitQueue.rejectTitle')} description={t('unitQueue.decisionDescription', { customer: selectedInterest.customerName, unit: selectedInterest.unitNumber })} showCloseButton={false} onClose={() => setDecision(null)} footer={<View style={styles.footer}><Button label={tCommon('actions.cancel')} variant="secondary" style={styles.footerButton} onPress={() => setDecision(null)} /><Button disabled={working} label={t(decision === 'APPROVED' ? 'unitQueue.approve' : 'unitQueue.reject')} variant={decision === 'APPROVED' ? 'success' : 'danger'} style={styles.footerButton} onPress={() => void submitDecision()} /></View>}><FormError message={error} /><FormField label={t('fields.decisionNotes')} optional><Input multiline value={decisionNotes} onChangeText={setDecisionNotes} style={styles.notes} /></FormField></BottomSheet> : null}
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
