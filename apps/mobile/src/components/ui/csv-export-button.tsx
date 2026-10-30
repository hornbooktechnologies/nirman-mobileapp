import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getLocalizedErrorMessage } from '../../i18n';
import { shareCsv } from '../../lib/exports/csv';
import { Button } from './button';

export function CsvExportButton({ scope, load, filename, disabled = false }: { scope: string; load: (signal: AbortSignal) => Promise<string | { csv: string; filename: string }>; filename: string; disabled?: boolean }) {
  const { t } = useTranslation('common');
  const [busy, setBusy] = useState(false);
  const current = useRef<AbortController | null>(null);
  useEffect(() => { setBusy(false); return () => { current.current?.abort(); current.current = null; }; }, [scope]);
  async function run() {
    if (current.current || disabled) return;
    const controller = new AbortController(); current.current = controller; setBusy(true);
    try {
      const result = await load(controller.signal);
      if (controller.signal.aborted) return;
      await shareCsv(typeof result === 'string' ? result : result.csv, filename, t('csvExport.action'));
    } catch (reason) { if (!controller.signal.aborted) Alert.alert(t('csvExport.failed'), getLocalizedErrorMessage(reason, t('csvExport.retry'))); }
    finally { if (current.current === controller) { current.current = null; setBusy(false); } }
  }
  return <Button label={t(busy ? 'csvExport.preparing' : 'csvExport.action')} variant="outline" disabled={disabled || busy} onPress={() => void run()} />;
}
