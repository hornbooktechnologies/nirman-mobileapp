import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Card, FormError, FormField, Input, AppText } from '../../../components/ui';
import { getLocalizedErrorMessage } from '../../../i18n';
import { isValidEmail } from '../../../lib/validation';
import { mobileText, mobileTheme } from '../../../theme';
import { requestPasswordReset } from '../services';
import { AuthScreenShell } from './auth-screen-shell';

export function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState(false);
  const [working, setWorking] = useState(false);

  async function submit() {
    const normalizedEmail = email.trim();
    if (!isValidEmail(normalizedEmail)) {
      setFieldError(t('recovery.validEmail'));
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await requestPasswordReset(normalizedEmail);
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError);
    } finally {
      setWorking(false);
    }
  }

  return (
    <AuthScreenShell title={t('recovery.forgotTitle')} description={t('recovery.forgotDescription')}>
      {submitted ? (
        <Card accessibilityLiveRegion="polite" variant="blueprint">
          <AppText style={{ ...mobileText.body, color: mobileTheme.color.text.primary }} weight={600}>{t('recovery.sent')}</AppText>
        </Card>
      ) : (
        <>
          <FormError message={error ? getLocalizedErrorMessage(error, t('failure.requestReset')) : null} />
          <FormField label={t('login.email')} required error={fieldError}>
            <Input accessibilityLabel={t('login.email')} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" invalid={Boolean(fieldError)} value={email} onChangeText={(value) => { setEmail(value); setFieldError(''); }} />
          </FormField>
          <Button label={working ? t('recovery.sending') : t('recovery.send')} loading={working} disabled={working} onPress={() => void submit()} />
        </>
      )}
      <Button label={t('activation.backToLogin')} variant="ghost" onPress={() => router.replace({ pathname: '/(auth)/login', params: { email } })} />
    </AuthScreenShell>
  );
}
