import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AppText, Button, FormError, FormField, GlassCard, Input, LanguagePicker, NirmanScreenBackground } from '../../../components/ui';
import { getLocalizedErrorMessage } from '../../../i18n';
import { useSession } from '../../../providers';
import { mobileText, mobileTheme } from '../../../theme';

export function LoginScreen() {
  const { t } = useTranslation('auth');
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useSession();
  const [email, setEmail] = useState(
    typeof params.email === 'string' ? params.email : '',
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);
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
        <AppText style={styles.body} weight={500}>{t('login.description')}</AppText>
      </View>

      <GlassCard variant="strong" style={styles.form}>
        <FormError message={error ? getLocalizedErrorMessage(error, t('failure.signIn')) : null} />
        <FormField label={t('login.email')} required>
          <Input
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder={t('login.email')}
            value={email}
          />
        </FormField>
        <FormField label={t('login.password')} required>
          <Input
            autoComplete="current-password"
            onChangeText={setPassword}
            placeholder={t('login.password')}
            secureTextEntry
            value={password}
          />
        </FormField>
        <Button
          disabled={!email.trim() || !password || isSubmitting}
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
