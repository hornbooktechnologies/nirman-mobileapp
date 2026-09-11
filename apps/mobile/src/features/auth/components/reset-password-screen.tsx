import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, FormError, FormField, Input } from '../../../components/ui';
import { getLocalizedErrorMessage } from '../../../i18n';
import { mobileText, mobileTheme } from '../../../theme';
import { resetPassword } from '../services';
import { AuthScreenShell } from './auth-screen-shell';

export function ResetPasswordScreen() {
  const { t } = useTranslation('auth');
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [completed, setCompleted] = useState(false);
  const [working, setWorking] = useState(false);

  async function submit() {
    if (!token) return setFieldError(t('recovery.invalidLink'));
    if (password.length < 8) return setFieldError(t('validation.passwordMinimum'));
    if (password !== confirmPassword) return setFieldError(t('validation.passwordMismatch'));
    setWorking(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setCompleted(true);
      setPassword('');
      setConfirmPassword('');
    } catch (resetError) {
      setError(resetError);
    } finally {
      setWorking(false);
    }
  }

  return (
    <AuthScreenShell title={t('recovery.resetTitle')} description={t('recovery.resetDescription')}>
      {completed ? (
        <Card accessibilityLiveRegion="polite" variant="blueprint">
          <AppText style={{ ...mobileText.body, color: mobileTheme.color.text.primary }} weight={600}>{t('recovery.resetSuccess')}</AppText>
        </Card>
      ) : (
        <>
          <FormError message={error ? getLocalizedErrorMessage(error, t('failure.resetPassword')) : null} />
          {!token ? <FormError message={t('recovery.invalidLink')} /> : null}
          <FormField label={t('recovery.newPassword')} required error={fieldError}>
            <Input accessibilityLabel={t('recovery.newPassword')} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" secureTextEntry value={password} onChangeText={(value) => { setPassword(value); setFieldError(''); }} />
          </FormField>
          <FormField label={t('activation.confirmPassword')} required>
            <Input accessibilityLabel={t('activation.confirmPassword')} autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" returnKeyType="go" secureTextEntry value={confirmPassword} onChangeText={(value) => { setConfirmPassword(value); setFieldError(''); }} onSubmitEditing={() => void submit()} />
          </FormField>
          <Button label={working ? t('recovery.resetting') : t('recovery.reset')} loading={working} disabled={working || !token} onPress={() => void submit()} />
        </>
      )}
      <Button label={t('activation.backToLogin')} variant="ghost" onPress={() => router.replace('/(auth)/login')} />
    </AuthScreenShell>
  );
}
