import type { KharchiAdvanceDetail, KharchiListResponse, WageBatchDetail, WageItem } from '@nirman-app/shared';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button, LoadingState } from '../../components/ui';
import { formatInr, getLocalizedErrorMessage } from '../../i18n';
import { useLocalization } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { fetchKharchiDetail, fetchKharchiList } from '../kharchi/services';

function Allocations({ organizationId, projectId, token, item, assignmentOnly = false }: { organizationId: string; projectId: string; token: string; item: WageItem; assignmentOnly?: boolean }) {
  const { t } = useTranslation('wages');
  const { t: common } = useTranslation('common');
  const { language } = useLocalization();
  const [page, setPage] = useState(1);
  const [list, setList] = useState<KharchiListResponse | null>(null);
  const [advanceId, setAdvanceId] = useState('');
  const [advance, setAdvance] = useState<KharchiAdvanceDetail | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setList(null); setError('');
    void fetchKharchiList(organizationId, projectId, token, { ...(assignmentOnly ? { workerAssignmentId: item.workerAssignmentId } : { workerId: item.workerId }), page, pageSize: 20 })
      .then(result => { if (active) setList(result); })
      .catch(reason => { if (active) setError(getLocalizedErrorMessage(reason, t('errors.tryAgain'))); });
    return () => { active = false; };
  }, [organizationId, projectId, token, item.workerId, item.workerAssignmentId, assignmentOnly, page, retry, t]);
  useEffect(() => {
    let active = true;
    setAdvance(null); setError('');
    if (advanceId) void fetchKharchiDetail(organizationId, projectId, advanceId, token)
      .then(result => { if (active) setAdvance(result); })
      .catch(reason => { if (active) setError(getLocalizedErrorMessage(reason, t('errors.tryAgain'))); });
    return () => { active = false; };
  }, [organizationId, projectId, token, advanceId, retry, t]);
  const money = (amount: string) => formatInr(Number(amount), language);
  const rows = advance?.deductionAllocations.filter(row => row.wageItemId === item.id) ?? [];
  return <View style={{ gap: mobileTheme.spacing[2] }}>
    {error ? <><AppText accessibilityRole="alert" style={mobileText.caption}>{error}</AppText><Button label={common('actions.retry')} variant="outline" onPress={() => setRetry(value => value + 1)} /></> : null}
    {!list && !error ? <LoadingState label={t('history.loading')} /> : null}
    {list?.items.map(row => <Button key={row.id} label={`${row.requestDate} · ${money(row.amount)} · ${t('history.balance', { amount: money(row.outstandingAmount) })}`} variant={advanceId === row.id ? 'brand' : 'outline'} onPress={() => setAdvanceId(row.id)} />)}
    {list && !list.items.length ? <AppText style={mobileText.caption}>{t('history.noAdvances')}</AppText> : null}
    {list ? <View style={{ gap: mobileTheme.spacing[2] }}>
      <AppText style={mobileText.caption}>{t('history.page', { page, pages: Math.max(1, list.pagination.totalPages) })}</AppText>
      <Button label={t('history.previous')} variant="outline" disabled={page === 1} onPress={() => { setPage(page - 1); setAdvanceId(''); }} />
      <Button label={t('history.next')} variant="outline" disabled={page >= list.pagination.totalPages} onPress={() => { setPage(page + 1); setAdvanceId(''); }} />
    </View> : null}
    {advanceId && !advance && !error ? <LoadingState label={t('history.loading')} /> : null}
    {advance ? <>
      <AppText style={mobileText.body}>{t('history.balance', { amount: money(advance.outstandingAmount) })}</AppText>
      <Button label={t('history.openAdvance')} variant="outline" onPress={() => router.push({ pathname: '/(app)/kharchi-detail', params: { kharchiId: advance.id, projectId } })} />
      {rows.map(row => <View key={row.id} style={{ gap: mobileTheme.spacing[1] }}>
        <AppText style={mobileText.label}>{money(row.deductionAmount)} · {t(row.reversedAt ? 'history.reversed' : 'history.allocated')}</AppText>
        <AppText style={mobileText.caption}>{row.deductedAt} · {row.recordedByName || t('history.nameUnavailable')}</AppText>
        {row.reversedAt ? <AppText style={mobileText.caption}>{row.reversedAt} · {row.reversedByName || t('history.nameUnavailable')} · {row.reversalReason}</AppText> : null}
      </View>)}
      {!rows.length ? <AppText style={mobileText.caption}>{t('history.noAllocations')}</AppText> : null}
    </> : null}
  </View>;
}

export function WageFinancialHistory({ detail, item, organizationId, projectId, token, permissions }: { detail: WageBatchDetail; item: WageItem; organizationId: string; projectId: string; token: string; permissions: readonly string[] }) {
  const { t } = useTranslation('wages');
  const { language } = useLocalization();
  const [showAllocations, setShowAllocations] = useState(false);
  const [showLedger, setShowLedger] = useState(false);
  const payments = detail.payments.filter(payment => payment.wageItemId === item.id);
  const canKharchi = permissions.includes('kharchi:read');
  return <View style={{ gap: mobileTheme.spacing[3] }}>
    <AppText style={mobileText.body}>{t('adjustment.notes')}: {item.notes || t('history.none')}</AppText>
    {permissions.includes('attendance:read') && permissions.includes('workers:read') ? <Button label={t('history.attendance')} variant="outline" onPress={() => router.push({ pathname: '/(app)/worker-attendance', params: { workerId: item.workerId, projectId } })} /> : null}
    <AppText style={mobileText.sectionTitle} weight={700}>{t('history.payments')}</AppText>
    {!payments.length ? <AppText style={mobileText.caption}>{t('history.noPayments')}</AppText> : null}
    {payments.map(payment => <View key={payment.id} style={{ gap: mobileTheme.spacing[1] }}>
      <AppText style={mobileText.label}>{formatInr(Number(payment.amount), language)} · {t(`paymentMethod.${payment.paymentMethod}`)} · {payment.paymentDate}</AppText>
      <AppText style={mobileText.caption}>{t('payment.reference')}: {payment.reference || t('history.none')}</AppText>
      <AppText style={mobileText.caption}>{t('history.recorded', { date: payment.recordedAt, actor: payment.recordedBy })}</AppText>
    </View>)}
    {canKharchi ? <>
      <Button label={t('history.ledger')} accessibilityState={{ expanded: showLedger }} variant="outline" onPress={() => setShowLedger(!showLedger)} />
      {showLedger ? <Allocations organizationId={organizationId} projectId={projectId} token={token} item={item} assignmentOnly /> : null}
      <Button label={t('history.openLedger')} variant="outline" onPress={() => router.push({ pathname: '/(app)/kharchi', params: { projectId, workerAssignmentId: item.workerAssignmentId } })} />
      <Button label={t('history.allocations')} accessibilityState={{ expanded: showAllocations }} variant="outline" onPress={() => setShowAllocations(!showAllocations)} />
      {showAllocations ? <Allocations organizationId={organizationId} projectId={projectId} token={token} item={item} /> : null}
    </> : <AppText style={mobileText.caption}>{t('history.kharchiPermission')}</AppText>}
  </View>;
}
