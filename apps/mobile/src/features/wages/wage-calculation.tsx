import type { WageItem, WagePreviewItem } from '@nirman-app/shared';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '../../components/ui';
import { formatInr } from '../../i18n';
import { useLocalization } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';

export function WageCalculation({ item, confirmed = false }: { item: WageItem | WagePreviewItem; confirmed?: boolean }) {
  const { t } = useTranslation('wages');
  const { language } = useLocalization();
  const money = (value: string | null) => value === null ? t('history.rateMissing') : formatInr(Number(value), language);
  return <View style={{ gap: mobileTheme.spacing[2] }}>
    <AppText style={mobileText.label} weight={700}>{t(confirmed ? 'history.saved' : 'history.calculation')}</AppText>
    {confirmed ? <AppText style={mobileText.caption}>{t('history.snapshot')}</AppText> : null}
    <AppText style={mobileText.body}>{t(item.rateBreakdown && item.rateBreakdown.length > 1 ? 'history.multipleRates' : 'history.rate', { amount: money(item.dailyRate) })}</AppText>
    <AppText style={mobileText.caption}>{t('history.days', { present: item.presentDays, half: item.halfDays, absent: item.absentDays, holiday: item.holidayDays })}</AppText>
    {item.rateBreakdown?.map((rate, index) => <View key={index} style={{ padding: mobileTheme.spacing[2], gap: mobileTheme.spacing[1] }}>
      <AppText style={mobileText.label}>{t('history.rate', { amount: money(rate.dailyRate) })}</AppText>
      <AppText style={mobileText.caption}>{t('worker.attendance', { present: rate.presentDays, half: rate.halfDays, absent: rate.absentDays })}</AppText>
      <AppText style={mobileText.caption}>{t('worker.grossWage')}: {money(rate.grossAmount)}</AppText>
    </View>)}
    <AppText style={mobileText.body}>{t('worker.grossWage')}: {money(item.grossAmount)}</AppText>
    <AppText style={mobileText.body}>{t('worker.kharchiDeduction')}: {money(item.kharchiDeduction)}</AppText>
    <AppText style={mobileText.body}>{t('worker.adjustment')}: {money(item.adjustmentAmount)}</AppText>
    <AppText style={mobileText.body}>{t('worker.netPayable')}: {money(item.netAmount)}</AppText>
  </View>;
}
