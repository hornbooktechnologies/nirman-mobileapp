import type { BrochureShare } from '@nirman-app/shared';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button, Card, LoadingState } from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { apiRequest } from '../../lib/api';
import { mobileText, mobileTheme } from '../../theme';

export function BrochureShareHistory({ organizationId, projectId, token }: { organizationId: string; projectId: string; token: string }) {
  const { t } = useTranslation('sales');
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<BrochureShare[] | null>(null);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    if (!open) return;
    setRows(null); setError('');
    void apiRequest<{ data: BrochureShare[] }>(`/organizations/${organizationId}/projects/${projectId}/brochures/shares`, {}, { accessToken: token })
      .then(result => { if (active) setRows(result.data); })
      .catch(reason => { if (active) setError(getLocalizedErrorMessage(reason, t('brochureHistory.failed'))); });
    return () => { active = false; };
  }, [organizationId, projectId, token, open, version, t]);
  return <View style={{ gap: mobileTheme.spacing[3] }}>
    <Button label={t('brochureHistory.title')} variant="outline" accessibilityState={{ expanded: open }} onPress={() => setOpen(!open)} />
    {open ? <>
      <AppText style={mobileText.caption}>{t('brochureHistory.limit')}</AppText>
      <Button label={t('brochures.refresh')} variant="outline" onPress={() => setVersion(value => value + 1)} />
      {error ? <AppText accessibilityRole="alert" style={mobileText.body}>{error}</AppText> : !rows ? <LoadingState label={t('brochureHistory.loading')} /> : null}
      {rows && !rows.length ? <AppText style={mobileText.body}>{t('brochureHistory.empty')}</AppText> : null}
      {rows?.map(row => <Card key={row.id}>
        <AppText style={mobileText.label}>{row.recipientName || row.recipientEmail || t('brochureHistory.other')}</AppText>
        <AppText style={mobileText.body}>{t(`brochureHistory.status.${row.status}`)} · {t(`brochureHistory.status.${row.emailDeliveryStatus}`)}</AppText>
        <AppText style={mobileText.caption}>{row.createdAt} · {t('brochureHistory.files', { count: row.assetCount })}</AppText>
        <AppText style={mobileText.caption}>{t('brochureHistory.expires', { date: row.expiresAt })}</AppText>
      </Card>)}
    </> : null}
  </View>;
}
