import { PROJECT_PROGRESS_STAGES, type ProjectProgressStage, type ProjectProgressSummary, type ProjectProgressUpdate } from '@nirman-app/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppIcon, AppText, Button, Card, CompactScreenHeader, EmptyState, IconButton, LoadingState, NirmanScreenBackground, OperationalEntityCard, ProgressRing } from '../../components/ui';
import { formatDate, formatNumber, getLocalizedErrorMessage, type SupportedLanguage } from '../../i18n';
import { getActiveProject, getActiveProjectPermissions } from '../../lib/auth';
import { useLocalization, useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { CustomerTabBar } from '../home/components';
import { ProjectContextCard } from '../projects';
import { ProgressUpdateSheet } from './progress-update-sheet';
import { exportProgressCsv, fetchProgressHistory, fetchProgressSummary } from './services';

const dateValue = (value: string) => new Date(`${value}T12:00:00`);
const formatLocalizedDate = (value: string, language: string) => formatDate(dateValue(value), language as SupportedLanguage);

export function ProgressScreen() {
  const { t } = useTranslation('progress');
  const { t: tCommon } = useTranslation('common');
  const { language } = useLocalization();
  const { session } = useSession();
  const project = getActiveProject(session);
  const permissions = getActiveProjectPermissions(session);
  const organizationId = session?.activeOrganization?.id ?? null;
  const projectId = project?.id ?? null;
  const token = session?.accessToken ?? null;
  const canRead = permissions.includes('progress:read');
  const canUpdate = permissions.includes('progress:update') && project?.status === 'ACTIVE';
  const canExport = permissions.includes('progress:export');
  const [summary, setSummary] = useState<ProjectProgressSummary | null>(null);
  const [items, setItems] = useState<ProjectProgressUpdate[]>([]);
  const [stage, setStage] = useState<ProjectProgressStage | undefined>();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const sequence = useRef(0);

  const load = useCallback(async (nextPage = 1, append = false) => {
    if (!organizationId || !projectId || !token || !canRead) { setLoading(false); return; }
    const request = ++sequence.current;
    append ? setLoadingMore(true) : setLoading(true);
    setError('');
    try {
      const [list, nextSummary] = await Promise.all([
        fetchProgressHistory(organizationId, projectId, token, { page: nextPage, pageSize: 20, stage }),
        append ? Promise.resolve(null) : fetchProgressSummary(organizationId, projectId, token),
      ]);
      if (request !== sequence.current) return;
      setItems((current) => append
        ? [...current, ...list.items.filter((item) => !current.some((row) => row.id === item.id))]
        : list.items);
      setPage(list.pagination.page);
      setTotalPages(list.pagination.totalPages);
      if (nextSummary) setSummary(nextSummary);
    } catch (loadError) {
      if (request === sequence.current) setError(getLocalizedErrorMessage(loadError, t('errors.loadFailed')));
    } finally {
      if (request === sequence.current) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    }
  }, [canRead, organizationId, projectId, stage, t, token]);

  useEffect(() => {
    setItems([]);
    setPage(1);
    void load(1);
    return () => { sequence.current += 1; };
  }, [load]);

  async function exportCsv() {
    if (!organizationId || !projectId || !token || exporting) return;
    setExporting(true);
    try {
      const result = await exportProgressCsv(organizationId, projectId, token, { stage });
      await Share.share({ title: t('export.title'), message: result.csv });
    } catch (exportError) {
      setError(getLocalizedErrorMessage(exportError, t('export.failed')));
    } finally {
      setExporting(false);
    }
  }

  if (!project || !projectId) {
    return (
      <NirmanScreenBackground footer={<CustomerTabBar activeKey="progress" />}>
        <CompactScreenHeader title={t('screen.title')} />
        <ProjectContextCard compact showSwitchAction />
        <EmptyState title={t('empty.noProjectTitle')} description={t('empty.noProjectDescription')} />
      </NirmanScreenBackground>
    );
  }

  if (!canRead) {
    return (
      <NirmanScreenBackground footer={<CustomerTabBar activeKey="progress" />}>
        <CompactScreenHeader title={t('screen.title')} subtitle={project.name} />
        <EmptyState title={t('empty.permissionTitle')} description={t('empty.permissionDescription')} />
      </NirmanScreenBackground>
    );
  }

  const header = (
    <View style={styles.header}>
      <CompactScreenHeader
        title={t('screen.title')}
        subtitle={project.name}
        action={canUpdate ? <IconButton icon="plus" variant="primary" accessibilityLabel={t('update.openA11y')} onPress={() => setUpdateOpen(true)} /> : undefined}
      />
      <ProjectContextCard compact showSwitchAction />
      {project.status !== 'ACTIVE' ? <Card style={styles.notice}><AppText style={styles.noticeText}>{t('screen.readOnly')}</AppText></Card> : null}
      {success ? (
        <Card variant="selected" style={styles.success} accessibilityRole="alert">
          <AppIcon name="check-circle-outline" size={24} color={mobileTheme.color.status.success.foreground} />
          <AppText style={styles.successText} weight={600}>{success}</AppText>
          <IconButton icon="close" variant="glass" accessibilityLabel={tCommon('actions.close')} onPress={() => setSuccess('')} />
        </Card>
      ) : null}
      {summary ? <ProgressSummaryCard summary={summary} language={language} /> : null}
      {summary ? (
        <View style={styles.section}>
          <AppText style={styles.sectionTitle} weight={700}>{t('stages.title')}</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stageCards}>
            {summary.stages.map((item) => (
              <StageCard key={item.stage} item={item} selected={stage === item.stage} onPress={() => setStage(stage === item.stage ? undefined : item.stage)} />
            ))}
          </ScrollView>
        </View>
      ) : null}
      <View style={styles.historyHeading}>
        <View style={styles.historyCopy}>
          <AppText style={styles.sectionTitle} weight={700}>{t('history.title')}</AppText>
          <AppText style={styles.sectionCaption}>{stage ? t('history.filtered', { stage: t(`stage.${stage}`) }) : t('history.all')}</AppText>
        </View>
        {canExport ? <Button label={exporting ? t('export.preparing') : t('export.action')} size="sm" fullWidth={false} variant="secondary" leadingIcon="file-delimited-outline" disabled={exporting} onPress={() => void exportCsv()} /> : null}
      </View>
    </View>
  );

  return (
    <NirmanScreenBackground footer={<CustomerTabBar activeKey="progress" />} scroll={false}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, !items.length && !loading && styles.emptyList]}
        ListHeaderComponent={header}
        ListEmptyComponent={loading ? <LoadingState label={t('loading.list')} /> : error ? <EmptyState title={t('errors.title')} description={error} actionLabel={tCommon('actions.retry')} onAction={() => void load(1)} /> : <EmptyState title={stage ? t('empty.filteredTitle') : t('empty.title')} description={stage ? t('empty.filteredDescription') : t('empty.description')} actionLabel={canUpdate ? t('update.action') : undefined} onAction={canUpdate ? () => setUpdateOpen(true) : undefined} />}
        ListFooterComponent={loadingMore ? <LoadingState label={t('loading.more')} /> : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(1); }} />}
        onEndReachedThreshold={0.35}
        onEndReached={() => { if (!loading && !loadingMore && page < totalPages) void load(page + 1, true); }}
        renderItem={({ item }) => (
          <OperationalEntityCard
            compact
            accessibilityLabel={t('history.itemA11y', { stage: t(`stage.${item.stage}`), percentage: item.percentage, date: formatLocalizedDate(item.updateDate, language), actor: item.updatedBy })}
            contextLeading={t(`stage.${item.stage}`)}
            contextTrailing={formatLocalizedDate(item.updateDate, language)}
            title={item.notes || t('history.noNotes')}
            supporting={t('history.updatedBy', { name: item.updatedBy })}
            value={`${item.percentage}%`}
            valueLabel={item.previousPercentage === null ? t('history.firstUpdate') : t('history.from', { value: item.previousPercentage })}
            footerLeading={item.percentage < (item.previousPercentage ?? item.percentage) ? t('history.correction') : t('history.recorded')}
            tone={item.percentage === 100 ? 'success' : item.percentage < (item.previousPercentage ?? item.percentage) ? 'warning' : 'info'}
          />
        )}
      />
      {updateOpen && organizationId && token && summary ? (
        <ProgressUpdateSheet
          visible
          organizationId={organizationId}
          projectId={projectId}
          accessToken={token}
          summary={summary}
          onClose={() => setUpdateOpen(false)}
          onSaved={(next) => { setSummary(next); setSuccess(t('success.saved')); void load(1); }}
          onConflict={() => load(1)}
        />
      ) : null}
    </NirmanScreenBackground>
  );
}

function ProgressSummaryCard({ summary, language }: { summary: ProjectProgressSummary; language: string }) {
  const { t } = useTranslation('progress');
  const rounded = Math.round(summary.overallPercentage * 10) / 10;
  return (
    <Card variant="blueprint" style={styles.summaryCard} accessible accessibilityLabel={t('summary.a11y', { percentage: rounded, updated: summary.updatedStages, total: summary.stages.length })}>
      <ProgressRing value={rounded} size={126} />
      <View style={styles.summaryCopy}>
        <AppText style={styles.summaryEyebrow} weight={700}>{t('summary.overall')}</AppText>
        <AppText style={styles.summaryTitle} weight={700}>{t('summary.stageCoverage', { updated: formatNumber(summary.updatedStages, language as SupportedLanguage), total: formatNumber(summary.stages.length, language as SupportedLanguage) })}</AppText>
        <AppText style={styles.summaryCaption}>{summary.latestUpdate ? t('summary.latest', { stage: t(`stage.${summary.latestUpdate.stage}`), date: formatLocalizedDate(summary.latestUpdate.updateDate, language) }) : t('summary.notStarted')}</AppText>
      </View>
    </Card>
  );
}

function StageCard({ item, selected, onPress }: { item: ProjectProgressSummary['stages'][number]; selected: boolean; onPress: () => void }) {
  const { t } = useTranslation('progress');
  return (
    <Pressable
      accessibilityLabel={t('stages.itemA11y', { stage: t(`stage.${item.stage}`), percentage: item.percentage })}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.stageCard, selected && styles.stageCardSelected, pressed && styles.pressed]}
    >
      <View style={styles.stageIcon}><AppIcon name={item.percentage === 100 ? 'check' : 'hammer-wrench'} size={20} color={item.percentage === 100 ? mobileTheme.color.status.success.foreground : mobileTheme.color.action.primary} /></View>
      <AppText style={styles.stageName} numberOfLines={2} weight={700}>{t(`stage.${item.stage}`)}</AppText>
      <AppText style={styles.stageValue} weight={700}>{item.percentage}%</AppText>
      <View style={styles.track}><View style={[styles.fill, { width: `${item.percentage}%` }]} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[8] },
  emptyList: { flexGrow: 1 },
  header: { gap: mobileTheme.spacing[4], marginBottom: mobileTheme.spacing[2] },
  notice: { backgroundColor: mobileTheme.color.status.warning.background },
  noticeText: { ...mobileText.body, color: mobileTheme.color.status.warning.foreground },
  success: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[3] },
  successText: { ...mobileText.body, color: mobileTheme.color.status.success.foreground, flex: 1 },
  summaryCard: { alignItems: 'center', flexDirection: 'row', gap: mobileTheme.spacing[5] },
  summaryCopy: { flex: 1, gap: mobileTheme.spacing[2] },
  summaryEyebrow: { ...mobileText.caption, color: mobileTheme.color.text.brand },
  summaryTitle: { ...mobileText.sectionTitle, fontSize: 20, lineHeight: 26 },
  summaryCaption: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  section: { gap: mobileTheme.spacing[3] },
  sectionTitle: { ...mobileText.sectionTitle, fontSize: 20, lineHeight: 26 },
  sectionCaption: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  stageCards: { gap: mobileTheme.spacing[3], paddingRight: mobileTheme.spacing[5] },
  stageCard: { backgroundColor: mobileTheme.color.surface.raised, borderColor: mobileTheme.color.border.subtle, borderRadius: mobileTheme.radius.lg, borderWidth: 1, gap: mobileTheme.spacing[2], minHeight: 154, padding: mobileTheme.spacing[4], width: 148 },
  stageCardSelected: { backgroundColor: mobileTheme.color.surface.selected, borderColor: mobileTheme.color.border.selected },
  stageIcon: { alignItems: 'center', backgroundColor: mobileTheme.color.status.info.background, borderRadius: mobileTheme.radius.full, height: 40, justifyContent: 'center', width: 40 },
  stageName: { ...mobileText.label, flex: 1, fontSize: 15, lineHeight: 20 },
  stageValue: { ...mobileText.sectionTitle, color: mobileTheme.color.action.primary, fontVariant: ['tabular-nums'] },
  track: { backgroundColor: mobileTheme.color.brand.primarySoft, borderRadius: mobileTheme.radius.full, height: 6, overflow: 'hidden' },
  fill: { backgroundColor: mobileTheme.color.action.primary, borderRadius: mobileTheme.radius.full, height: 6 },
  pressed: { opacity: 0.78 },
  historyHeading: { alignItems: 'flex-end', flexDirection: 'row', gap: mobileTheme.spacing[3], justifyContent: 'space-between' },
  historyCopy: { flex: 1, gap: mobileTheme.spacing[1] },
});
