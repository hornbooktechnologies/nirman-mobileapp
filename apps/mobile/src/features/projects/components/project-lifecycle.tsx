import { useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, GlassCard } from '../../../components/ui';
import { getLocalizedErrorMessage } from '../../../i18n';
import type { MobileProjectSummary } from '../../../lib/auth';
import { useSession } from '../../../providers';
import { mobileText, mobileTheme } from '../../../theme';
import { changeProjectLifecycle } from '../services';

export function ProjectLifecycle({ project }: { project?: MobileProjectSummary | null }) {
  const { t } = useTranslation('projects');
  const { session, refreshSession } = useSession();
  const [saving, setSaving] = useState(false);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const busy = useRef(false);
  const archived = session?.projectAccess.projects.filter((item) =>
    item.status === 'ARCHIVED' && item.permissions.includes('projects:restore') && item.permissions.includes('projects:view-all'),
  ) ?? [];
  const canArchive = project && project.status !== 'ARCHIVED' && project.permissions.includes('projects:archive');

  function confirm(target: MobileProjectSummary, action: 'archive' | 'restore') {
    if (busy.current || needsRefresh) return;
    Alert.alert(t(`lifecycle.${action}`), t(`lifecycle.${action}Confirm`, { name: target.name }), [
      { text: t('form.actions.cancel'), style: 'cancel' },
      { text: t(`lifecycle.${action}`), style: action === 'archive' ? 'destructive' : 'default', onPress: () => void run(target, action) },
    ]);
  }

  async function run(target: MobileProjectSummary, action: 'archive' | 'restore') {
    if (busy.current || needsRefresh || !session?.activeOrganization) return;
    busy.current = true;
    setSaving(true);
    try {
      await changeProjectLifecycle(session.activeOrganization.id, target.id, session.accessToken, action);
      setNeedsRefresh(true);
      try {
        await refreshSession();
        setNeedsRefresh(false);
      } catch (error) {
        Alert.alert(t('lifecycle.saved'), getLocalizedErrorMessage(error, t('lifecycle.refreshFailed')));
      }
    } catch (error) {
      Alert.alert(t('lifecycle.failed'), getLocalizedErrorMessage(error, t('lifecycle.failed')));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  if (!canArchive && !archived.length) return null;
  return (
    <GlassCard variant="strong" style={{ gap: mobileTheme.spacing[3] }}>
      <AppText style={mobileText.sectionTitle} weight={700}>{t('lifecycle.title')}</AppText>
      <AppText style={mobileText.caption}>{t('lifecycle.help')}</AppText>
      {needsRefresh ? <Button label={t('lifecycle.refresh')} disabled={saving} onPress={async () => {
        if (busy.current) return;
        busy.current = true;
        setSaving(true);
        try { await refreshSession(); setNeedsRefresh(false); }
        catch (error) { Alert.alert(t('lifecycle.saved'), getLocalizedErrorMessage(error, t('lifecycle.refreshFailed'))); }
        finally { busy.current = false; setSaving(false); }
      }} /> : null}
      {canArchive ? <Button label={t('lifecycle.archive')} variant="outline" disabled={saving || needsRefresh} onPress={() => confirm(project, 'archive')} /> : null}
      {archived.length ? <AppText style={mobileText.label} weight={600}>{t('lifecycle.archived')}</AppText> : null}
      {archived.map((item) => (
        <View key={item.id} style={{ gap: mobileTheme.spacing[2] }}>
          <AppText style={mobileText.body} weight={600}>{item.name}</AppText>
          <Button label={t('lifecycle.restore')} variant="secondary" disabled={saving || needsRefresh} onPress={() => confirm(item, 'restore')} />
        </View>
      ))}
    </GlassCard>
  );
}
