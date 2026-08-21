import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, FormError, FormField, GlassCard, Input, LanguagePicker, NirmanScreenBackground } from '../../../components/ui';
import { getLocalizedErrorMessage } from '../../../i18n';
import { isValidEmail } from '../../../lib/validation';
import { useSession } from '../../../providers';
import { mobileText, mobileTheme } from '../../../theme';

export function LoginScreen() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useSession();
  const [email, setEmail] = useState(
    typeof params.email === 'string' ? params.email : '',
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'email' | 'password', string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);
    const nextFieldErrors: Partial<Record<'email' | 'password', string>> = {};
    if (!email.trim()) {
      nextFieldErrors.email = tCommon('validation.required', { field: t('login.email') });
    } else if (!isValidEmail(email)) {
      nextFieldErrors.email = tCommon('validation.email');
    }
    if (!password) {
      nextFieldErrors.password = tCommon('validation.required', { field: t('login.password') });
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;

    setIsSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      router.replace('/(app)/dashboard');
    } catch (signInError) {
      setError(signInError);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <NirmanScreenBackground scroll style={styles.screen}>
      <View style={styles.brandBlock}>
        <Image accessibilityLabel="NirmanSite" accessible source={require('../../../../assets/brand/logo-full.png')} resizeMode="contain" style={styles.logo} />
        <AppText style={styles.title} weight={700}>{t('login.title')}</AppText>
        {/* <AppText style={styles.body} weight={500}>{t('login.description')}</AppText> */}
      </View>

      <GlassCard variant="strong" style={styles.form}>
        <FormError message={error ? getLocalizedErrorMessage(error, t('failure.signIn')) : null} />
        <FormField label={t('login.email')} required error={fieldErrors.email}>
          <Input
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            invalid={Boolean(fieldErrors.email)}
            onChangeText={(value) => {
              setEmail(value);
              if (fieldErrors.email) setFieldErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder={t('login.email')}
            value={email}
          />
        </FormField>
        <FormField label={t('login.password')} required error={fieldErrors.password}>
          <Input
            autoComplete="current-password"
            invalid={Boolean(fieldErrors.password)}
            onChangeText={(value) => {
              setPassword(value);
              if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: undefined }));
            }}
            placeholder={t('login.password')}
            secureTextEntry
            value={password}
          />
        </FormField>
        <Button
          disabled={isSubmitting}
          label={isSubmitting ? t('login.signingIn') : t('login.signIn')}
          size="lg"
          onPress={handleSignIn}
        />
        <Button
          label={t('login.activateInvitation')}
          variant="ghost"
          onPress={() => router.push('/(auth)/activate')}
        />
      </GlassCard>
      <GlassCard variant="strong">
        <LanguagePicker compact />
      </GlassCard>
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: mobileTheme.spacing[6],
    justifyContent: 'center',
  },
  brandBlock: {
    alignItems: 'center',
    gap: mobileTheme.spacing[3],
  },
  logo: {
    height: 92,
    width: 124,
  },
  title: {
    ...mobileText.display,
    fontSize: 30,
    lineHeight: 36,
    textAlign: 'center',
  },
  body: {
    ...mobileText.body,
    maxWidth: 300,
    textAlign: 'center',
  },
  form: {
    gap: mobileTheme.spacing[4],
  },
});
