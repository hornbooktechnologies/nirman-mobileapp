import { router } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, Card, CompactScreenHeader, FormError, FormField, IconButton, Input, NirmanScreenBackground } from '../../../components/ui';
import { getLocalizedErrorMessage } from '../../../i18n';
import { useSession } from '../../../providers';
import { mobileTheme } from '../../../theme';
import { changePassword } from '../services';

export function AccountSecurityScreen() {
  const { t } = useTranslation('auth');
  const { session, signOut } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [working, setWorking] = useState(false);

  async function submit() {
    if (!currentPassword) return setFieldError(t('security.currentRequired'));
    if (newPassword.length < 8) return setFieldError(t('validation.passwordMinimum'));
    if (newPassword !== confirmPassword) return setFieldError(t('validation.passwordMismatch'));
    if (!session?.accessToken) return;
    setWorking(true);
    setError(null);
    try {
      await changePassword(session.accessToken, currentPassword, newPassword);
      await signOut();
      Alert.alert(t('security.successTitle'), t('security.successDescription'), [
        { text: t('security.signIn'), onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (changeError) {
      setError(changeError);
    } finally {
      setWorking(false);
    }
  }

  return (
    <NirmanScreenBackground>
      <CompactScreenHeader title={t('security.title')} subtitle={t('security.description')} leading={<IconButton icon="arrow-left" accessibilityLabel={t('security.back')} variant="glass" onPress={() => router.back()} />} />
      <Card style={styles.card}>
        <FormError message={error ? getLocalizedErrorMessage(error, t('failure.changePassword')) : null} />
        <FormField label={t('security.currentPassword')} required error={fieldError}>
          <Input autoCapitalize="none" autoComplete="current-password" secureTextEntry value={currentPassword} onChangeText={(value) => { setCurrentPassword(value); setFieldError(''); }} />
        </FormField>
        <FormField label={t('recovery.newPassword')} required>
          <Input autoCapitalize="none" autoComplete="new-password" secureTextEntry value={newPassword} onChangeText={(value) => { setNewPassword(value); setFieldError(''); }} />
        </FormField>
        <FormField label={t('activation.confirmPassword')} required>
          <Input autoCapitalize="none" autoComplete="new-password" returnKeyType="go" secureTextEntry value={confirmPassword} onChangeText={(value) => { setConfirmPassword(value); setFieldError(''); }} onSubmitEditing={() => void submit()} />
        </FormField>
        <Button label={working ? t('security.changing') : t('security.change')} loading={working} disabled={working} onPress={() => void submit()} />
      </Card>
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({ card: { gap: mobileTheme.spacing[4] } });
