import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button, GlassCard, LoadingState } from '../../../components/ui';
import { getLocalizedErrorMessage } from '../../../i18n';
import { useRefreshOnFocus } from '../../../lib/use-refresh-on-focus';
import { useSession } from '../../../providers';
import { mobileText, mobileTheme } from '../../../theme';
import { fetchProject } from '../services';
import type { Project } from '../types';

export function ProjectOverview({ projectId }: { projectId: string }) {
  const { session } = useSession();
  const { t } = useTranslation('projects');
  const { t: common } = useTranslation('common');
  const organizationId = session?.activeOrganization?.id;
  const token = session?.accessToken;
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    if (!organizationId || !token) return;
    const request = ++generation.current;
    setLoading(true); setError('');
    try {
      const result = await fetchProject(organizationId, projectId, token);
      if (request === generation.current) setProject(result);
    } catch (reason) { if (request === generation.current) setError(getLocalizedErrorMessage(reason, t('detail.loadFailure'))); }
    finally { if (request === generation.current) setLoading(false); }
  }, [organizationId, projectId, token, t]);
  useRefreshOnFocus({ scopeKey: `${organizationId}:${projectId}`, refresh: load, reset: () => setProject(null), cancel: () => { generation.current += 1; } });
  return <GlassCard variant="strong" style={{ gap: mobileTheme.spacing[3] }}>
    <AppText style={mobileText.sectionTitle} weight={700}>{t('overview.title')}</AppText>
    {loading && !project ? <LoadingState label={t('detail.loading')} /> : null}
    {error ? <><AppText accessibilityRole="alert" style={mobileText.body}>{error}</AppText><Button label={common('actions.retry')} variant="outline" onPress={() => void load()} /></> : null}
    {project && !error ? <>
      {[
        [t('form.fields.code'), project.projectCode],
        [t('form.fields.type'), t(`type.${project.type}`)],
        [t('form.fields.status'), t(`status.${project.status}`)],
        [t('form.fields.startDate'), project.startDate?.slice(0, 10)],
        [t('form.fields.expectedCompletion'), project.expectedCompletionDate?.slice(0, 10)],
        [t('overview.address'), Object.values(project.address).filter(Boolean).join(', ')],
        [t('form.fields.description'), project.description],
      ].map(([label, value]) => <View key={label} style={{ gap: mobileTheme.spacing[1] }}><AppText style={mobileText.caption}>{label}</AppText><AppText style={mobileText.body}>{value || t('detail.notAvailable')}</AppText></View>)}
    </> : null}
  </GlassCard>;
}
