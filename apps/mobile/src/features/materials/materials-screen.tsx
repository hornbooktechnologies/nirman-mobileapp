import { MATERIAL_REQUEST_STATUSES, MATERIAL_WORKFLOW_MODES, type MaterialRequest, type MaterialRequestStatus, type MaterialSummary, type MaterialWorkflowMode } from '@nirman-app/shared';
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, RefreshControl, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppliedFilterChip, AppliedFilters, AppIcon, AppText, BottomSheet, Button, Card, CompactScreenHeader, DateInput, EmptyState, FilterGroup, FilterOption, FormError, FormField, IconButton, ListControls, ListFilterBar, ListFilterSheet, LoadingState, NirmanScreenBackground, OperationalEntityCard, SearchField, StatusBadge } from '../../components/ui';
import { formatDate, formatInr, formatNumber, getLocalizedErrorMessage } from '../../i18n';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import { ProjectContextCard } from '../projects';
import { MaterialRequestSheet } from './material-request-sheet';
import { materialTone } from './materials-ui';
import { configureMaterialSettings, exportMaterialsCsv, fetchMaterialSettings, fetchMaterials, fetchMaterialsSummary } from './services';
import type { MaterialSettings } from './types';

const dateValue = (value: string) => new Date(`${value}T12:00:00`);

export function MaterialsScreen() {
  const { t } = useTranslation('materials'); const { t: tCommon } = useTranslation('common');
  const { language } = useLocalization(); const { session } = useSession();
  const project = getActiveProject(session); const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null; const projectId = project?.id ?? null; const token = session?.accessToken ?? null;
  const canRead = permissions.includes('materials:read'); const canCreate = permissions.includes('materials:create') && project?.status === 'ACTIVE';
  const canConfigure = permissions.includes('materials:configure') && project?.status === 'ACTIVE'; const canExport = permissions.includes('materials:export');
  const [items, setItems] = useState<MaterialRequest[]>([]); const [summary, setSummary] = useState<MaterialSummary | null>(null); const [settings, setSettings] = useState<MaterialSettings | null>(null);
  const [search, setSearch] = useState(''); const [status, setStatus] = useState<MaterialRequestStatus | undefined>(); const [draftStatus, setDraftStatus] = useState<MaterialRequestStatus | undefined>();
  const [requiredFrom, setRequiredFrom] = useState(''); const [requiredTo, setRequiredTo] = useState(''); const [draftRequiredFrom, setDraftRequiredFrom] = useState(''); const [draftRequiredTo, setDraftRequiredTo] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false); const [createOpen, setCreateOpen] = useState(false); const [settingsOpen, setSettingsOpen] = useState(false);
  const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(1); const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false); const [loadingMore, setLoadingMore] = useState(false); const [error, setError] = useState(''); const [exporting, setExporting] = useState(false);
  const sequence = useRef(0);
  const activeFilterCount = Number(Boolean(status)) + Number(Boolean(requiredFrom)) + Number(Boolean(requiredTo));
  const draftDateRangeInvalid = Boolean(draftRequiredFrom && draftRequiredTo && draftRequiredFrom > draftRequiredTo);
  const query = useMemo(() => ({ pageSize: 20, search: search.trim() || undefined, status, requiredFrom: requiredFrom || undefined, requiredTo: requiredTo || undefined, sortBy: 'updatedAt' as const, sortOrder: 'desc' as const }), [requiredFrom, requiredTo, search, status]);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (!organizationId || !projectId || !token || !canRead) { setLoading(false); return; }
    const request = ++sequence.current; append ? setLoadingMore(true) : setLoading(true); setError('');
    try {
      const [list, nextSummary, nextSettings] = await Promise.all([
        fetchMaterials(organizationId, projectId, token, { ...query, page: nextPage }),
        append ? Promise.resolve(null) : fetchMaterialsSummary(organizationId, projectId, token),
        append ? Promise.resolve(null) : fetchMaterialSettings(organizationId, projectId, token),
      ]);
      if (request !== sequence.current) return;
      setItems((current) => append ? [...current, ...list.items.filter((item) => !current.some((row) => row.id === item.id))] : list.items);
      setPage(list.pagination.page); setTotalPages(list.pagination.totalPages); if (nextSummary) setSummary(nextSummary); if (nextSettings) setSettings(nextSettings);
    } catch (loadError) { if (request === sequence.current) setError(getLocalizedErrorMessage(loadError, t('errors.loadFailed'))); }
    finally { if (request === sequence.current) { setLoading(false); setRefreshing(false); setLoadingMore(false); } }
  }, [canRead, organizationId, projectId, query, t, token]);

  useEffect(() => { setItems([]); setSummary(null); setPage(1); void load(1); return () => { sequence.current += 1; }; }, [load]);

  async function exportCsv() {
    if (!organizationId || !projectId || !token || exporting) return; setExporting(true);
    try { const result = await exportMaterialsCsv(organizationId, projectId, token, query); await Share.share({ title: t('export.title'), message: result.csv }); }
    catch (exportError) { Alert.alert(t('export.failedTitle'), getLocalizedErrorMessage(exportError, t('export.failed'))); }
    finally { setExporting(false); }
  }

  const header = <View style={styles.header}>
    <CompactScreenHeader title={t('screen.title')} subtitle={project?.name ?? t('screen.chooseProject')} action={<View style={styles.headerActions}>{canConfigure ? <IconButton accessibilityLabel={t('settings.openA11y')} icon="cog-outline" variant="glass" onPress={() => setSettingsOpen(true)} /> : null}{canCreate ? <IconButton accessibilityLabel={t('create.openA11y')} icon="plus" variant="primary" onPress={() => settings?.configured ? setCreateOpen(true) : setSettingsOpen(true)} /> : null}</View>} />
    <ProjectContextCard compact showSwitchAction />
    {project?.status !== 'ACTIVE' ? <Card style={styles.notice}><AppText style={styles.noticeText}>{t('screen.readOnly')}</AppText></Card> : null}
    {settings && !settings.configured ? <Card style={styles.notice}><AppText style={styles.noticeText}>{t('settings.notConfigured')}</AppText>{canConfigure ? <Button label={t('settings.configureNow')} size="sm" fullWidth={false} variant="secondary" onPress={() => setSettingsOpen(true)} /> : null}</Card> : null}
    {summary ? <Card style={styles.summary}><View style={styles.summaryTop}><SummaryMetric label={t('summary.total')} value={formatNumber(summary.totalRequests, language)} /><SummaryMetric label={t('summary.overdue')} value={formatNumber(summary.overdueRequests, language)} danger={summary.overdueRequests > 0} /></View><View style={styles.summaryDivider} /><SummaryRow label={t('summary.estimated')} value={formatInr(Number(summary.estimatedCost), language)} /><SummaryRow label={t('summary.purchased')} value={formatInr(Number(summary.purchaseCost), language)} /></Card> : null}
    <ListControls><ListFilterBar search={<SearchField accessibilityLabel={t('filters.searchA11y')} placeholder={t('filters.search')} value={search} onChangeText={setSearch} />} filterLabel={tCommon('listFilters.action')} filterAccessibilityLabel={tCommon('listFilters.actionA11y', { count: activeFilterCount })} activeFilterCount={activeFilterCount} expanded={filtersOpen} onOpenFilters={() => { setDraftStatus(status); setDraftRequiredFrom(requiredFrom); setDraftRequiredTo(requiredTo); setFiltersOpen(true); }} />{activeFilterCount ? <AppliedFilters>{status ? <AppliedFilterChip label={t(`status.${status}`)} removeAccessibilityLabel={tCommon('listFilters.removeA11y', { filter: t(`status.${status}`) })} onRemove={() => setStatus(undefined)} /> : null}{requiredFrom ? <AppliedFilterChip label={t('filters.fromChip', { date: formatDate(dateValue(requiredFrom), language) })} removeAccessibilityLabel={tCommon('listFilters.removeA11y', { filter: t('filters.from') })} onRemove={() => setRequiredFrom('')} /> : null}{requiredTo ? <AppliedFilterChip label={t('filters.toChip', { date: formatDate(dateValue(requiredTo), language) })} removeAccessibilityLabel={tCommon('listFilters.removeA11y', { filter: t('filters.to') })} onRemove={() => setRequiredTo('')} /> : null}</AppliedFilters> : null}</ListControls>
    {canExport ? <Button label={exporting ? t('export.preparing') : t('export.action')} variant="secondary" leadingIcon="file-delimited-outline" disabled={exporting} onPress={() => void exportCsv()} /> : null}
  </View>;

  if (!project || !projectId) return <NirmanScreenBackground footer={<CustomerTabBar activeKey="materials" />}><CompactScreenHeader title={t('screen.title')} /><ProjectContextCard compact showSwitchAction /><EmptyState title={t('empty.noProjectTitle')} description={t('empty.noProjectDescription')} /></NirmanScreenBackground>;
  if (!canRead) return <NirmanScreenBackground footer={<CustomerTabBar activeKey="materials" />}><CompactScreenHeader title={t('screen.title')} subtitle={project.name} /><EmptyState title={t('empty.permissionTitle')} description={t('empty.permissionDescription')} /></NirmanScreenBackground>;

  return <NirmanScreenBackground footer={<CustomerTabBar activeKey="materials" />} scroll={false}>
    <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={[styles.list, !items.length && !loading && styles.emptyList]} ListHeaderComponent={header}
      ListEmptyComponent={loading ? <LoadingState label={t('loading.list')} /> : error ? <EmptyState title={t('errors.title')} description={error} actionLabel={tCommon('actions.retry')} onAction={() => void load(1)} /> : <EmptyState title={t('empty.title')} description={t('empty.description')} actionLabel={canCreate ? t('create.action') : undefined} onAction={canCreate ? () => settings?.configured ? setCreateOpen(true) : setSettingsOpen(true) : undefined} />}
      ListFooterComponent={loadingMore ? <LoadingState label={t('loading.more')} /> : null} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(1); }} />} onEndReachedThreshold={0.35} onEndReached={() => { if (!loading && !loadingMore && page < totalPages) void load(page + 1, true); }}
      renderItem={({ item }) => <OperationalEntityCard compact accessibilityLabel={t('list.openA11y', { material: item.materialName, status: t(`status.${item.status}`), delivered: formatNumber(Number(item.deliveredQuantity), language), requested: formatNumber(Number(item.requestedQuantity), language) })} contextLeading={item.category || t('list.uncategorized')} contextTrailing={t(`status.${item.status}`)} title={item.materialName} supporting={`${t('list.requestedBy')} ${item.requestedBy} · ${formatDate(dateValue(item.requestedOn), language)}`} value={`${formatNumber(Number(item.deliveredQuantity), language)} / ${formatNumber(Number(item.requestedQuantity), language)}`} valueLabel={t(`unit.${item.unitOfMeasure}`)} footerLeading={item.requiredByDate ? t('list.requiredBy', { date: formatDate(dateValue(item.requiredByDate), language) }) : t('list.noRequiredDate')} footerTrailing={<View style={styles.cardFooter}><StatusBadge label={t(`status.${item.status}`)} tone={materialTone(item.status)} /><AppIcon name="chevron-right" size={20} color={mobileTheme.color.text.muted} /></View>} tone={materialTone(item.status)} onPress={() => router.push({ pathname: '/(app)/material-detail', params: { materialRequestId: item.id } } as Href)} />}
    />
    <ListFilterSheet visible={filtersOpen} title={tCommon('listFilters.title')} description={t('filters.description')} clearLabel={tCommon('listFilters.clearAll')} applyLabel={tCommon('listFilters.apply')} onClear={() => { setDraftStatus(undefined); setDraftRequiredFrom(''); setDraftRequiredTo(''); setStatus(undefined); setRequiredFrom(''); setRequiredTo(''); setFiltersOpen(false); }} onApply={() => { if (draftDateRangeInvalid) return; setStatus(draftStatus); setRequiredFrom(draftRequiredFrom); setRequiredTo(draftRequiredTo); setFiltersOpen(false); }} onClose={() => setFiltersOpen(false)}><FormError message={draftDateRangeInvalid ? t('filters.dateRangeError') : ''} /><FilterGroup label={t('filters.status')}><FilterOption label={t('filters.allStatuses')} selected={!draftStatus} onPress={() => setDraftStatus(undefined)} />{MATERIAL_REQUEST_STATUSES.map((value) => <FilterOption key={value} label={t(`status.${value}`)} selected={draftStatus === value} onPress={() => setDraftStatus(value)} />)}</FilterGroup><FormField label={t('filters.from')} optional><DateInput accessibilityLabel={t('filters.fromA11y')} value={draftRequiredFrom} onChangeText={setDraftRequiredFrom} /></FormField><FormField label={t('filters.to')} optional error={draftDateRangeInvalid ? t('filters.dateRangeError') : undefined}><DateInput accessibilityLabel={t('filters.toA11y')} invalid={draftDateRangeInvalid} minimumDate={draftRequiredFrom ? dateValue(draftRequiredFrom) : undefined} value={draftRequiredTo} onChangeText={setDraftRequiredTo} /></FormField></ListFilterSheet>
    {createOpen && organizationId && token ? <MaterialRequestSheet visible organizationId={organizationId} projectId={projectId} accessToken={token} canReadProjectMembers={permissions.includes('project-members:read')} onClose={() => setCreateOpen(false)} onSaved={() => load(1)} /> : null}
    {settingsOpen && organizationId && token ? <SettingsSheet visible settings={settings} organizationId={organizationId} projectId={projectId} accessToken={token} onClose={() => setSettingsOpen(false)} onSaved={(next) => { setSettings(next); setSettingsOpen(false); }} /> : null}
  </NirmanScreenBackground>;
}

function SettingsSheet({ visible, settings, organizationId, projectId, accessToken, onClose, onSaved }: { visible: boolean; settings: MaterialSettings | null; organizationId: string; projectId: string; accessToken: string; onClose: () => void; onSaved: (settings: MaterialSettings) => void }) {
  const { t } = useTranslation('materials'); const { t: tCommon } = useTranslation('common'); const [mode, setMode] = useState<MaterialWorkflowMode>(settings?.workflowMode ?? 'DIRECT'); const [working, setWorking] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (visible) { setMode(settings?.workflowMode ?? 'DIRECT'); setError(''); } }, [settings?.workflowMode, visible]);
  async function save() { setWorking(true); setError(''); try { onSaved(await configureMaterialSettings(organizationId, projectId, accessToken, mode)); } catch (saveError) { setError(getLocalizedErrorMessage(saveError, t('errors.settingsFailed'))); } finally { setWorking(false); } }
  return <BottomSheet visible={visible} title={t('settings.title')} description={t('settings.description')} scroll showCloseButton={false} onClose={onClose} footer={<View style={styles.sheetFooter}><Button style={styles.footerButton} label={tCommon('actions.cancel')} variant="secondary" disabled={working} onPress={onClose} /><Button style={styles.footerButton} label={working ? t('loading.saving') : t('settings.save')} disabled={working} onPress={() => void save()} /></View>}><FormError message={error} />{MATERIAL_WORKFLOW_MODES.map((value) => <FilterOption key={value} label={t(`workflow.${value}.label`)} selected={mode === value} onPress={() => setMode(value)} />)}<Card variant="blueprint"><AppText style={styles.workflowDescription}>{t(`workflow.${mode}.description`)}</AppText></Card></BottomSheet>;
}

function SummaryMetric({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) { return <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.metric}><AppText style={[styles.metricValue, danger && styles.danger]} weight={700}>{value}</AppText><AppText style={styles.metricLabel}>{label}</AppText></View>; }
function SummaryRow({ label, value }: { label: string; value: string }) { return <View accessible accessibilityLabel={`${label}: ${value}`} style={styles.summaryRow}><AppText style={styles.summaryLabel}>{label}</AppText><AppText style={styles.summaryValue} weight={700}>{value}</AppText></View>; }

const styles = StyleSheet.create({
  list: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[4] }, emptyList: { flexGrow: 1 }, header: { gap: mobileTheme.spacing[4], marginBottom: mobileTheme.spacing[4] }, headerActions: { flexDirection: 'row', gap: mobileTheme.spacing[2] }, notice: { alignItems: 'flex-start', backgroundColor: mobileTheme.color.status.warning.background, gap: mobileTheme.spacing[3] }, noticeText: { ...mobileText.body, color: mobileTheme.color.status.warning.foreground },
  summary: { gap: mobileTheme.spacing[2] }, summaryTop: { flexDirection: 'row', gap: mobileTheme.spacing[3] }, metric: { flex: 1, gap: mobileTheme.spacing[1] }, metricValue: { ...mobileText.title, color: mobileTheme.color.action.primary, fontVariant: ['tabular-nums'] }, metricLabel: { ...mobileText.caption }, danger: { color: mobileTheme.color.status.danger.foreground }, summaryDivider: { backgroundColor: mobileTheme.color.border.subtle, height: 1 }, summaryRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 28 }, summaryLabel: { ...mobileText.caption }, summaryValue: { ...mobileText.body, fontVariant: ['tabular-nums'] },
  cardFooter: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[2] }, sheetFooter: { flex: 1, flexDirection: 'row', gap: mobileTheme.spacing[3] }, footerButton: { flex: 1 }, workflowDescription: { ...mobileText.body },
});
