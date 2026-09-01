import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  AppText,
  Button,
  Card,
  CompactScreenHeader,
  EmptyState,
  FormError,
  IconButton,
  LoadingState,
  NirmanScreenBackground,
  OperationalEntityCard,
} from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { formatInr } from '../../i18n/formatters';
import { getActiveProject } from '../../lib/auth';
import { useSession } from '../../providers';
import { mobileText, mobileTheme } from '../../theme';
import { importUnits, previewUnitImport } from './services';
import type { UnitImportPreview } from './types';
import { parseUnitImport, UNIT_IMPORT_COLUMNS, type LocalImportError } from './unit-import';

export function SalesUnitImportScreen() {
  const { t, i18n } = useTranslation('sales');
  const { t: tCommon } = useTranslation('common');
  const { session } = useSession();
  const project = getActiveProject(session);
  const language = (i18n.resolvedLanguage ?? 'en') as 'en' | 'hi' | 'gu';
  const [fileName, setFileName] = useState('');
  const [units, setUnits] = useState<Parameters<typeof previewUnitImport>[3]>([]);
  const [preview, setPreview] = useState<UnitImportPreview | null>(null);
  const [localErrors, setLocalErrors] = useState<LocalImportError[]>([]);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const importErrorMessage = (code: string, field?: string) => {
    switch (code) {
      case 'EMPTY_FILE': return t('unitImport.errorCodes.EMPTY_FILE');
      case 'MISSING_HEADER': return t('unitImport.errorCodes.MISSING_HEADER', { field });
      case 'LIMIT': return t('unitImport.errorCodes.LIMIT');
      case 'REQUIRED': return t('unitImport.errorCodes.REQUIRED');
      case 'POSITIVE_NUMBER': return t('unitImport.errorCodes.POSITIVE_NUMBER');
      case 'PRICE_METHOD': return t('unitImport.errorCodes.PRICE_METHOD');
      case 'PRICE_UNIT': return t('unitImport.errorCodes.PRICE_UNIT');
      case 'STATUS': return t('unitImport.errorCodes.STATUS');
      case 'UNIT_IMPORT_DUPLICATE_IN_FILE': return t('unitImport.errorCodes.UNIT_IMPORT_DUPLICATE_IN_FILE');
      case 'UNIT_NUMBER_DUPLICATE': return t('unitImport.errorCodes.UNIT_NUMBER_DUPLICATE');
      case 'UNIT_STATUS_MANAGED_BY_WORKFLOW': return t('unitImport.errorCodes.UNIT_STATUS_MANAGED_BY_WORKFLOW');
      case 'UNIT_PRICE_INVALID': return t('unitImport.errorCodes.UNIT_PRICE_INVALID');
      default: return code;
    }
  };

  async function chooseFile() {
    if (!session?.activeOrganization || !project) return;
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, type: ['text/csv', 'text/comma-separated-values', 'text/plain'] });
    if (picked.canceled) return;
    setWorking(true); setError(''); setPreview(null); setLocalErrors([]);
    try {
      const asset = picked.assets[0];
      setFileName(asset.name);
      const response = await fetch(asset.uri);
      const parsed = parseUnitImport(await response.text());
      setUnits(parsed.units);
      setLocalErrors(parsed.errors);
      if (!parsed.errors.length) {
        setPreview(await previewUnitImport(session.activeOrganization.id, project.id, session.accessToken, parsed.units));
      }
    } catch (cause) { setError(getLocalizedErrorMessage(cause, t('unitImport.readError'))); }
    finally { setWorking(false); }
  }

  async function confirmImport() {
    if (!session?.activeOrganization || !project || !preview || preview.invalidCount || !units.length) return;
    setWorking(true); setError('');
    try {
      const result = await importUnits(session.activeOrganization.id, project.id, session.accessToken, units);
      Alert.alert(t('unitImport.successTitle'), t('unitImport.successDescription', { count: result.importedCount }), [
        { text: tCommon('actions.close'), onPress: () => router.back() },
      ]);
    } catch (cause) { setError(getLocalizedErrorMessage(cause, t('unitImport.importError'))); }
    finally { setWorking(false); }
  }

  const rowErrors = localErrors.reduce((map, item) => {
    const existing = map.get(item.rowNumber) ?? [];
    map.set(item.rowNumber, [...existing, item]);
    return map;
  }, new Map<number, LocalImportError[]>());
  const rows = preview?.rows ?? units.map((unit, index) => ({
    rowNumber: index + 2,
    unit,
    valid: !rowErrors.has(index + 2),
    errors: (rowErrors.get(index + 2) ?? []).map((item) => item.code),
  }));
  const invalidCount = preview?.invalidCount ?? new Set(localErrors.filter((item) => item.rowNumber > 1).map((item) => item.rowNumber)).size;
  const globalLocalErrors = localErrors.filter((item) => item.rowNumber === 1);

  return <NirmanScreenBackground scroll={false}>
    <FlatList
      contentContainerStyle={styles.list}
      data={rows}
      keyExtractor={(item) => `${item.rowNumber}-${item.unit.unitNumber}`}
      renderItem={({ item }) => <OperationalEntityCard
        compact
        contextLeading={t('unitImport.row', { row: item.rowNumber })}
        contextTrailing={item.valid ? t('unitImport.valid') : t('unitImport.invalid')}
        title={item.unit.unitNumber || t('unitImport.missingUnit')}
        supporting={[item.unit.unitType, item.unit.wingTower, item.unit.floor].filter(Boolean).join(' · ')}
        value={item.unit.basePrice == null ? undefined : formatInr(item.unit.basePrice, language, { maximumFractionDigits: 0 })}
        valueLabel={item.unit.priceBasis === 'PER_SQFT' ? t('pricing.estimatedTotal') : t('pricing.totalPrice')}
        footerLeading={item.errors.length ? item.errors.map((code) => importErrorMessage(code)).join(' · ') : t(`unitStatus.${item.unit.status ?? 'AVAILABLE'}`)}
        footerTone={item.valid ? 'success' : 'danger'}
        tone={item.valid ? 'success' : 'danger'}
      />}
      ListHeaderComponent={<View style={styles.header}>
        <CompactScreenHeader leading={<IconButton icon="arrow-left" accessibilityLabel={tCommon('actions.back')} variant="glass" onPress={() => router.back()} />} title={t('unitImport.title')} subtitle={project?.name} />
        <Card style={styles.uploadCard}>
          <View style={styles.uploadCopy}>
            <AppText style={styles.cardTitle} weight={700}>{t('unitImport.selectTitle')}</AppText>
            <AppText style={styles.body}>{t('unitImport.description')}</AppText>
          </View>
          <Button disabled={working} leadingIcon="file-upload-outline" label={fileName ? t('unitImport.replaceFile') : t('unitImport.selectFile')} onPress={() => void chooseFile()} />
          {fileName ? <AppText style={styles.fileName} weight={600}>{t('unitImport.fileSelected', { name: fileName })}</AppText> : null}
        </Card>
        <Card variant="blueprint" style={styles.templateCard}>
          <AppText style={styles.cardTitle} weight={700}>{t('unitImport.templateTitle')}</AppText>
          <AppText selectable style={styles.columns}>{UNIT_IMPORT_COLUMNS.join(',')}</AppText>
          <AppText style={styles.body}>{t('unitImport.templateDescription')}</AppText>
        </Card>
        {working && !preview ? <LoadingState label={t('unitImport.validating')} /> : null}
        <FormError message={error || globalLocalErrors.map((item) => importErrorMessage(item.code, item.field)).join('\n')} />
        {fileName && !working ? <View style={styles.summaryRow}>
          <View style={styles.summaryItem}><AppText style={styles.summaryValue} weight={700}>{rows.length}</AppText><AppText style={styles.summaryLabel}>{t('unitImport.total')}</AppText></View>
          <View style={styles.summaryItem}><AppText style={styles.summaryValue} weight={700}>{Math.max(0, rows.length - invalidCount)}</AppText><AppText style={styles.summaryLabel}>{t('unitImport.valid')}</AppText></View>
          <View style={styles.summaryItem}><AppText style={styles.summaryValue} weight={700}>{invalidCount}</AppText><AppText style={styles.summaryLabel}>{t('unitImport.invalid')}</AppText></View>
        </View> : null}
        {rows.length ? <AppText style={styles.previewTitle} weight={700}>{t('unitImport.previewTitle')}</AppText> : null}
      </View>}
      ListEmptyComponent={!working ? <EmptyState title={t('unitImport.emptyTitle')} description={t('unitImport.emptyDescription')} /> : null}
      ListFooterComponent={rows.length ? <Button disabled={working || invalidCount > 0 || !preview} label={working ? t('unitImport.importing') : t('unitImport.confirm')} onPress={() => void confirmImport()} style={styles.confirm} /> : null}
    />
  </NirmanScreenBackground>;
}

const styles = StyleSheet.create({
  list: { gap: mobileTheme.spacing[3], paddingBottom: mobileTheme.spacing[8] },
  header: { gap: mobileTheme.spacing[4], marginBottom: mobileTheme.spacing[3] },
  uploadCard: { gap: mobileTheme.spacing[4] },
  uploadCopy: { gap: mobileTheme.spacing[2] },
  templateCard: { gap: mobileTheme.spacing[2] },
  cardTitle: { ...mobileText.sectionTitle, color: mobileTheme.color.text.primary },
  body: { ...mobileText.body, color: mobileTheme.color.text.secondary },
  fileName: { ...mobileText.caption, color: mobileTheme.color.text.brand },
  columns: { ...mobileText.caption, color: mobileTheme.color.text.primary },
  summaryRow: { flexDirection: 'row', gap: mobileTheme.spacing[2] },
  summaryItem: { alignItems: 'center', backgroundColor: mobileTheme.color.surface.card, borderColor: mobileTheme.color.border.subtle, borderRadius: mobileTheme.radius.md, borderWidth: 1, flex: 1, padding: mobileTheme.spacing[3] },
  summaryValue: { ...mobileText.sectionTitle, color: mobileTheme.color.text.primary },
  summaryLabel: { ...mobileText.caption, color: mobileTheme.color.text.secondary },
  previewTitle: { ...mobileText.sectionTitle, color: mobileTheme.color.text.primary },
  confirm: { marginTop: mobileTheme.spacing[3] },
});
