import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, BottomSheet, Button } from '../../components/ui';
import { mobileTheme } from '../../theme';
import { saveExportPdf, shareExportPdf } from './pdf';
import type { File } from 'expo-file-system';
import { ApiRequestError } from '../api';

type Stage = 'fetching' | 'ready';

export function usePdfExport(scope?: string) {
  const { t } = useTranslation('common');
  const [stage, setStage] = useState<Stage | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const current = useRef<AbortController | null>(null);
  const choose = useRef<((action: 'save' | 'share' | null) => void) | null>(null);
  useEffect(() => () => current.current?.abort(), [scope]);
  useEffect(() => {
    if (!stage) return;
    const timer = setInterval(() => setSeconds(value => value + 1), 1000);
    return () => clearInterval(timer);
  }, [stage]);
  const cancel = () => { current.current?.abort(); choose.current?.(null); current.current = null; setStage(null); setBusy(false); };
  async function run(load: (signal: AbortSignal) => Promise<File>, title: string) {
    if (current.current) return;
    const controller = new AbortController(); current.current = controller;
    setSeconds(0); setStage('fetching'); setBusy(true);
    let file: File | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutError = new Error(t('pdfExport.timeout'));
    try {
      file = await Promise.race([load(controller.signal), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(timeoutError), 120000);
        controller.signal.addEventListener('abort', () => reject(new Error('Cancelled')), { once: true });
      })]);
      if (timer) clearTimeout(timer);
      if (controller.signal.aborted) return;
      setStage('ready');
      const action = await new Promise<'save' | 'share' | null>(resolve => {
        choose.current = resolve;
        controller.signal.addEventListener('abort', () => resolve(null), { once: true });
      });
      if (!action || controller.signal.aborted) return;
      // Dismiss our native modal before opening the OS sheet (required on iOS).
      setStage(null);
      await new Promise(resolve => setTimeout(resolve, 350));
      if (controller.signal.aborted) return;
      if (action === 'save') {
        if (await saveExportPdf(file)) Alert.alert(t('pdfExport.savedTitle'), t('pdfExport.saved'));
      } else await shareExportPdf(file, title);
    } catch (error) {
      const message = error === timeoutError ? timeoutError.message : error instanceof ApiRequestError && error.code === 'PDF_EXPORT_TOO_LARGE' ? t('pdfExport.tooLarge') : error instanceof ApiRequestError && error.code === 'PDF_EXPORT_BUSY' ? t('pdfExport.serverBusy') : t('pdfExport.failed');
      if (!controller.signal.aborted) Alert.alert(t('pdfExport.failedTitle'), message);
    } finally {
      controller.abort();
      if (timer) clearTimeout(timer);
      try { if (file?.exists) file.delete(); }
      finally {
        if (current.current === controller) { current.current = null; choose.current = null; setStage(null); setBusy(false); }
      }
    }
  }
  const popup = <BottomSheet visible={stage !== null} title={t(stage === 'ready' ? 'pdfExport.ready' : 'pdfExport.title')} description={t('pdfExport.description')} onClose={cancel} showCloseButton={false} footer={<View style={styles.actions}>
    <View style={styles.downloadActions}>
      {stage === 'ready' ? <>
        {Platform.OS === 'android' ? <Button fullWidth={false} size="sm" style={styles.actionButton} label={t('pdfExport.save')} onPress={() => choose.current?.('save')} /> : null}
        <Button fullWidth={false} size="sm" style={styles.actionButton} label={t('pdfExport.share')} variant={Platform.OS === 'android' ? 'secondary' : 'primary'} onPress={() => choose.current?.('share')} />
      </> : null}
    </View>
    <Button fullWidth={false} size="sm" style={styles.cancelButton} label={t('actions.cancel')} variant="secondary" onPress={cancel} />
  </View>}>
    <View style={styles.status} accessibilityLiveRegion="polite">{stage !== 'ready' ? <ActivityIndicator color={mobileTheme.color.text.primary} /> : null}<AppText>{t(`pdfExport.${stage ?? 'fetching'}`)}</AppText></View>
    <AppText>{t('pdfExport.elapsed', { seconds })}</AppText>
  </BottomSheet>;
  return { run, popup, busy };
}

const styles = StyleSheet.create({
  status: { flexDirection: 'row', alignItems: 'center', gap: mobileTheme.spacing[3] },
  actions: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: mobileTheme.spacing[2] },
  downloadActions: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: mobileTheme.spacing[2] },
  actionButton: { minHeight: 44, flexShrink: 1 },
  cancelButton: { minHeight: 44, flexShrink: 0 },
});
