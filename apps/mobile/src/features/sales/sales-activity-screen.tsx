import { refreshTogether } from '@nirman-app/shared';
import { RefreshFlatList } from "../../components/ui/refresh-control";

import { RefreshIconButton } from "../../components/ui/refresh-button";
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  CompactScreenHeader,
  EmptyState,
  FormError,
  IconButton,
  LoadingState,
  NirmanScreenBackground,
} from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { getActiveProject } from '../../lib/auth';
import { useSession } from '../../providers';
import { mobileTheme } from '../../theme';
import { fetchActivities, fetchLead } from './services';
import { SalesActivityCard } from './sales-ui';
import type { SalesActivity, SalesLead } from './types';

export function SalesActivityScreen() {
  const { leadId } = useLocalSearchParams<{ leadId?: string }>();
  const { t } = useTranslation('sales');
  const { t: tCommon } = useTranslation('common');
  const { session } = useSession();
  const project = getActiveProject(session);
  const activeOrganizationId = session?.activeOrganization?.id;
  const activeProjectId = project?.id;
  const accessToken = session?.accessToken;
  const sequence = useRef(0);
  const [lead, setLead] = useState<SalesLead | null>(null);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!leadId || !activeOrganizationId || !activeProjectId || !accessToken) return;
    const current = ++sequence.current;
    quiet ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [nextLead, nextActivities] = await refreshTogether([
        fetchLead(activeOrganizationId, activeProjectId, leadId, accessToken),
        fetchActivities(activeOrganizationId, activeProjectId, leadId, accessToken),
      ]);
      if (current !== sequence.current) return;
      setLead(nextLead);
      setActivities(nextActivities);
    } catch (cause) {
      if (current === sequence.current) setError(getLocalizedErrorMessage(cause, t('errors.load')));
    } finally {
      if (current === sequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, [leadId, activeOrganizationId, activeProjectId, accessToken, t]);

  useFocusEffect(useCallback(() => { void load(); return () => { sequence.current += 1; }; }, [load]));

  if (!leadId || !project || !session?.activeOrganization) {
    return <NirmanScreenBackground><CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('leadDetail.timeline')} /><EmptyState title={t('noProject.title')} description={t('noProject.description')} /></NirmanScreenBackground>;
  }

  return <NirmanScreenBackground scroll={false}>
    <RefreshFlatList busy={loading || refreshing}
      contentContainerStyle={styles.list}
      data={loading ? [] : activities}
      style={styles.flatList}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={() => load(true)}
      renderItem={({ item }) => <SalesActivityCard activity={item} />}
      ListHeaderComponent={<View style={styles.headerContent}>
        <CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('leadDetail.timeline')} subtitle={lead?.customerName ?? project.name} action={<RefreshIconButton busy={loading || refreshing} icon="refresh" accessibilityLabel={t('refresh')} variant="glass" onRefresh={() => load(true)} />} />
        <FormError message={error} />
        {loading ? <LoadingState label={t('loading')} /> : null}
      </View>}
      ListEmptyComponent={!loading && !error ? <EmptyState title={t('leadDetail.emptyTimeline')} description={t('leadDetail.emptyTimelineDescription')} /> : null}
    />
  </NirmanScreenBackground>;
}

const styles = StyleSheet.create({
  flatList: { flex: 1 },
  list: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[8] },
  headerContent: { gap: mobileTheme.spacing[5], marginBottom: mobileTheme.spacing[3] },
});
