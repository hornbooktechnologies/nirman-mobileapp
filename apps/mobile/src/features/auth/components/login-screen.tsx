import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Button, GlassCard, GradientScreen, Input } from '../../../components/ui';
import { useSession } from '../../../providers';
import { mobileText, mobileTheme } from '../../../theme';

export function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const { signIn } = useSession();
  const [email, setEmail] = useState(
    typeof params.email === 'string' ? params.email : '',
  );
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSignIn() {
    setError(null);
    setIsSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
      router.replace('/(app)/dashboard');
    } catch (signInError) {
      setError(signInError instanceof Error ? signInError.message : 'Sign in failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <GradientScreen scroll={false} style={styles.screen}>
      <View style={styles.brandBlock}>
        <Image source={require('../../../../assets/brand/logo-full.png')} resizeMode="contain" style={styles.logo} />
        <Text style={styles.title}>Field Login</Text>
        <Text style={styles.body}>Open your assigned organization and project workspace.</Text>
      </View>

      <GlassCard variant="strong" style={styles.form}>
        <Input
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          value={email}
        />
        <Input
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          value={password}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          disabled={!email.trim() || !password || isSubmitting}
          label={isSubmitting ? 'Signing in' : 'Sign In'}
          size="lg"
          onPress={handleSignIn}
        />
        <Button
          label="Activate Invitation"
          variant="ghost"
          onPress={() => router.push('/(auth)/activate')}
        />
      </GlassCard>
    </GradientScreen>
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
  error: {
    ...mobileText.caption,
    color: mobileTheme.color.status.danger.foreground,
  },
});
