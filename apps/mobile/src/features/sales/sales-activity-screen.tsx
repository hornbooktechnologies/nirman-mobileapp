import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
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
  const [lead, setLead] = useState<SalesLead | null>(null);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!leadId || !session?.activeOrganization || !project) return;
    quiet ? setRefreshing(true) : setLoading(true);
    setError(null);
    try {
      const [nextLead, nextActivities] = await Promise.all([
        fetchLead(session.activeOrganization.id, project.id, leadId, session.accessToken),
        fetchActivities(session.activeOrganization.id, project.id, leadId, session.accessToken),
      ]);
      setLead(nextLead);
      setActivities(nextActivities);
    } catch (cause) {
      setError(getLocalizedErrorMessage(cause, t('errors.load')));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [leadId, project, session, t]);

  useEffect(() => { void load(); }, [load]);

  if (!leadId || !project || !session?.activeOrganization) {
    return <NirmanScreenBackground><CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('leadDetail.timeline')} /><EmptyState title={t('noProject.title')} description={t('noProject.description')} /></NirmanScreenBackground>;
  }

  return <NirmanScreenBackground scroll={false}>
    <FlatList
      contentContainerStyle={styles.list}
      data={loading ? [] : activities}
      style={styles.flatList}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={() => void load(true)}
      renderItem={({ item }) => <SalesActivityCard activity={item} />}
      ListHeaderComponent={<View style={styles.headerContent}>
        <CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('leadDetail.timeline')} subtitle={lead?.customerName ?? project.name} action={<IconButton icon="refresh" accessibilityLabel={t('refresh')} variant="glass" onPress={() => void load(true)} />} />
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
