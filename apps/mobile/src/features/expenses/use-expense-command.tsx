import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText, Button } from '../../components/ui';
import { getLocalizedErrorMessage } from '../../i18n';
import { ApiRequestError } from '../../lib/api';
import { ExpenseAttempt, expenseFailure } from './command-attempt';

export function useExpenseCommand<T>(fallback: string) {
  const { t } = useTranslation('expenses');
  const { t: common } = useTranslation('common');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const attempt = useRef(new ExpenseAttempt<T>());
  const [working, setWorking] = useState(false);
  const [failure, setFailure] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const locked = working || failure === 'uncertain' || failure === 'stale' || failure === 'denied';
  async function run(input: T, send: (input: T) => Promise<unknown>, saved: () => void | Promise<unknown>) {
    if (failure === 'stale' || failure === 'denied') return;
    const original = attempt.current.start(input);
    if (!original) return;
    setWorking(true); setError('');
    try {
      await send(original);
    } catch (e) {
      const apiError = e instanceof ApiRequestError ? e : undefined;
      const kind = expenseFailure(apiError?.status, apiError?.code);
      attempt.current.finish(kind === 'uncertain');
      if (!mounted.current) return;
      setFailure(kind); setError(getLocalizedErrorMessage(e, fallback));
      setWorking(false);
      return;
    }
    attempt.current.finish();
    if (!mounted.current) return;
    setFailure(''); setWorking(false);
    // A refresh failure must never turn a confirmed write into a retryable command.
    try { await saved(); } catch (e) { if (mounted.current) setError(getLocalizedErrorMessage(e, fallback)); }
  }
  async function review(refresh: () => void | Promise<unknown>) {
    setRefreshing(true);
    try { await refresh(); if (mounted.current) { setFailure(''); setError(''); } }
    catch (e) { if (mounted.current) setError(getLocalizedErrorMessage(e, fallback)); }
    finally { if (mounted.current) setRefreshing(false); }
  }
  function requestClose(close: () => void, dirty: boolean) {
    if (attempt.current.busy || failure === 'uncertain') return;
    if (!dirty) { close(); return; }
    Alert.alert(t('recovery.discard'), t('recovery.discardDescription'), [
      { text: common('actions.cancel'), style: 'cancel' },
      { text: common('actions.close'), style: 'destructive', onPress: close },
    ]);
  }
  return { run, requestClose, working, locked, error, failure, setError,
    canClose: !working && failure !== 'uncertain',
    canSubmit: !working && !refreshing && failure !== 'stale' && failure !== 'denied',
    retryLabel: failure === 'uncertain' ? t('recovery.retry') : null,
    recovery: (refresh?: () => void | Promise<unknown>) => <>
      {failure === 'uncertain' ? <AppText>{t('recovery.uncertain')}</AppText> : null}
      {failure === 'denied' ? <AppText>{t('recovery.denied')}</AppText> : null}
      {failure === 'stale' ? <><AppText>{t('recovery.stale')}</AppText>{refresh ? <Button label={t('recovery.reload')} disabled={refreshing} variant="secondary" onPress={() => void review(refresh)} /> : null}</> : null}
    </>,
  };
}
