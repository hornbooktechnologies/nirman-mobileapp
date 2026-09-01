import { KHARCHI_BALANCE_STATUSES, KHARCHI_PAYMENT_METHODS } from '@nirman-app/shared';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon, AppText, Button, Card, Chip, CompactScreenHeader, EmptyState, LoadingState, NirmanScreenBackground, OperationalEntityCard, SearchField, StatusBadge } from '../../components/ui';
import { formatDate, formatInr, getLocalizedErrorMessage } from '../../i18n';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import { ProjectContextCard } from '../projects';
import { exportKharchiCsv, fetchKharchiList, fetchKharchiSummary } from './services';
import { KharchiFormSheet } from './kharchi-form-sheet';
import type { KharchiAdvance, KharchiBalanceStatus, KharchiPaymentMethod, KharchiSummary } from './types';

const dateValue = (value: string) => new Date(`${value}T12:00:00`);
const tone = (status: KharchiBalanceStatus) => status === 'DEDUCTED' ? 'success' : status === 'PARTIALLY_DEDUCTED' ? 'info' : 'warning';

export function KharchiScreen() {
  const { t } = useTranslation('kharchi');
  const { language } = useLocalization();
  const { session } = useSession();
  const activeProject = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = activeProject?.id ?? null;
  const accessToken = session?.accessToken ?? null;
  const canRead = permissions.includes('kharchi:read');
  const canCreate = permissions.includes('kharchi:create') && activeProject?.status === 'ACTIVE';
  const canExport = permissions.includes('kharchi:export');
  const [items, setItems] = useState<KharchiAdvance[]>([]);
  const [summary, setSummary] = useState<KharchiSummary | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<KharchiBalanceStatus | undefined>();
  const [method, setMethod] = useState<KharchiPaymentMethod | undefined>();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const requestSequence = useRef(0);

  const query = useMemo(() => ({ pageSize: 20, search: search.trim() || undefined, status, paymentMethod: method, sortBy: 'requestDate' as const, sortOrder: 'desc' as const }), [method, search, status]);

  async function exportCsv() {
    if (!organizationId || !projectId || !accessToken || exporting) return;
    setExporting(true);
    try {
      const result = await exportKharchiCsv(organizationId, projectId, accessToken, query);
      await Share.share({ title: t('export.title'), message: result.csv });
    } catch (exportError) {
      Alert.alert(t('export.failedTitle'), getLocalizedErrorMessage(exportError, t('export.failed')));
    } finally {
      setExporting(false);
    }
  }

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (!organizationId || !projectId || !accessToken || !canRead) { setLoading(false); return; }
    const sequence = ++requestSequence.current;
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const [list, nextSummary] = await Promise.all([
        fetchKharchiList(organizationId, projectId, accessToken, { ...query, page: nextPage }),
        append ? Promise.resolve(null) : fetchKharchiSummary(organizationId, projectId, accessToken),
      ]);
      if (sequence !== requestSequence.current) return;
      setItems((current) => append ? [...current, ...list.items.filter((item) => !current.some((existing) => existing.id === item.id))] : list.items);
      setPage(list.pagination.page); setTotalPages(list.pagination.totalPages);
      if (nextSummary) setSummary(nextSummary);
    } catch (loadError) {
      if (sequence === requestSequence.current) setError(getLocalizedErrorMessage(loadError, t('errors.loadFailed')));
    } finally {
      if (sequence === requestSequence.current) { setLoading(false); setRefreshing(false); setLoadingMore(false); }
    }
  }, [accessToken, canRead, organizationId, projectId, query, t]);

  useEffect(() => { setItems([]); setSummary(null); setPage(1); void load(1); return () => { requestSequence.current += 1; }; }, [load]);

  const header = <View style={styles.headerContent}>
    <CompactScreenHeader title={t('screen.title')} subtitle={activeProject?.name ?? t('screen.chooseProject')} action={canCreate ? <Button label={t('create.shortAction')} fullWidth={false} size="sm" leadingIcon="plus" onPress={() => setCreateOpen(true)} /> : undefined} />
    <ProjectContextCard compact showSwitchAction />
    {activeProject && activeProject.status !== 'ACTIVE' ? <Card style={styles.notice}><AppText style={styles.noticeText}>{t('screen.readOnly')}</AppText></Card> : null}
    {summary ? <Card style={styles.summary}><SummaryLine label={t('summary.outstanding')} value={formatInr(Number(summary.outstandingAmount), language)} emphasis /><SummaryLine label={t('summary.advances')} value={formatInr(Number(summary.effectiveAmount), language)} /><SummaryLine label={t('summary.deducted')} value={formatInr(Number(summary.deductedAmount), language)} />{Number(summary.adjustmentAmount) !== 0 ? <SummaryLine label={t('summary.adjustments')} value={formatInr(Number(summary.adjustmentAmount), language)} /> : null}</Card> : null}
    <SearchField accessibilityLabel={t('filters.searchA11y')} placeholder={t('filters.search')} value={search} onChangeText={setSearch} />
    <View style={styles.filters}><Chip label={t('filters.allStatuses')} selected={!status} onPress={() => setStatus(undefined)} />{KHARCHI_BALANCE_STATUSES.map((value) => <Chip key={value} label={t(`status.${value}`)} selected={status === value} onPress={() => setStatus(status === value ? undefined : value)} />)}</View>
    <View style={styles.filters}><Chip label={t('filters.allMethods')} selected={!method} onPress={() => setMethod(undefined)} />{KHARCHI_PAYMENT_METHODS.map((value) => <Chip key={value} label={t(`paymentMethod.${value}`)} selected={method === value} onPress={() => setMethod(method === value ? undefined : value)} />)}</View>
    {canExport ? <Button label={exporting ? t('export.preparing') : t('export.action')} variant="secondary" leadingIcon="file-delimited-outline" disabled={exporting} onPress={() => void exportCsv()} /> : null}
  </View>;

  if (!activeProject || !projectId) return <NirmanScreenBackground footer={<CustomerTabBar activeKey="kharchi" />}><CompactScreenHeader title={t('screen.title')} /><ProjectContextCard compact showSwitchAction /><EmptyState title={t('empty.noProjectTitle')} description={t('empty.noProjectDescription')} /></NirmanScreenBackground>;
  if (!canRead) return <NirmanScreenBackground footer={<CustomerTabBar activeKey="kharchi" />}><CompactScreenHeader title={t('screen.title')} subtitle={activeProject.name} /><EmptyState title={t('empty.permissionTitle')} description={t('empty.permissionDescription')} /></NirmanScreenBackground>;

  return <NirmanScreenBackground footer={<CustomerTabBar activeKey="kharchi" />} scroll={false}>
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[styles.list, !items.length && !loading && styles.emptyList]}
      ListHeaderComponent={header}
      ListEmptyComponent={loading ? <LoadingState label={t('loading.list')} /> : error ? <EmptyState title={t('errors.title')} description={error} actionLabel={t('actions.retry')} onAction={() => void load(1)} /> : <EmptyState title={t('empty.title')} description={t('empty.description')} actionLabel={canCreate ? t('create.action') : undefined} onAction={canCreate ? () => setCreateOpen(true) : undefined} />}
      ListFooterComponent={loadingMore ? <LoadingState label={t('loading.more')} /> : null}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(1); }} />}
      onEndReachedThreshold={0.35}
      onEndReached={() => { if (!loading && !loadingMore && page < totalPages) void load(page + 1, true); }}
      renderItem={({ item }) => <OperationalEntityCard compact accessibilityLabel={t('list.openA11y', { worker: item.workerName, amount: formatInr(Number(item.outstandingAmount), language) })} contextLeading={item.workerCode} contextTrailing={item.trade} title={item.workerName} supporting={formatDate(dateValue(item.requestDate), language)} value={formatInr(Number(item.outstandingAmount), language)} valueLabel={t('list.outstanding')} footerLeading={t(`paymentMethod.${item.paymentMethod}`)} footerTrailing={<View style={styles.footerStatus}><StatusBadge label={t(`status.${item.status}`)} tone={tone(item.status)} /><AppIcon name="chevron-right" size={20} color={mobileTheme.color.text.muted} /></View>} tone={tone(item.status)} onPress={() => router.push({ pathname: '/(app)/kharchi-detail', params: { kharchiId: item.id } } as Href)} />}
    />
    {createOpen && organizationId && accessToken ? <KharchiFormSheet visible organizationId={organizationId} projectId={projectId} accessToken={accessToken} onClose={() => setCreateOpen(false)} onSaved={async () => { await load(1); }} /> : null}
  </NirmanScreenBackground>;
}

function SummaryLine({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) { return <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.summaryLine}><AppText style={styles.summaryLabel} weight={600}>{label}</AppText><AppText style={[styles.summaryValue, emphasis && styles.emphasis]} weight={700}>{value}</AppText></View>; }
const styles = StyleSheet.create({ headerContent: { gap: mobileTheme.spacing[4], marginBottom: mobileTheme.spacing[4] }, list: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[4] }, emptyList: { flexGrow: 1 }, summary: { gap: mobileTheme.spacing[2] }, summaryLine: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3], justifyContent: 'space-between', minHeight: 30 }, summaryLabel: { ...mobileText.body, color: mobileTheme.color.text.secondary, flex: 1 }, summaryValue: { ...mobileText.body, fontVariant: ['tabular-nums'], textAlign: 'right' }, emphasis: { color: mobileTheme.color.action.primary, fontSize: 18 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: mobileTheme.spacing[2] }, notice: { backgroundColor: mobileTheme.color.status.warning.background }, noticeText: { ...mobileText.body, color: mobileTheme.color.status.warning.foreground }, footerStatus: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2] } });
