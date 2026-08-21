import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { OrganizationOwnerInvitationPreview } from '@nirman-app/shared';
import { useTranslation } from 'react-i18next';

import { AppText, Button, FormError, FormField, GlassCard, Input, LanguagePicker, NirmanScreenBackground } from '../../src/components/ui';
import { getLocalizedErrorMessage } from '../../src/i18n';
import { apiRequest } from '../../src/lib/api';
import { mobileText, mobileTheme } from '../../src/theme';

type ApiEnvelope<TData> = {
  success: boolean;
  data: TData;
};

type ActivationErrorKey =
  | 'failure.activateOrganization'
  | 'failure.loadInvitation'
  | 'failure.activateAccount';

type ActivationErrorState = {
  cause?: unknown;
  fallbackKey: ActivationErrorKey;
};

export default function ActivateInvitationRoute() {
  const { t } = useTranslation('auth');
  const params = useLocalSearchParams<{ token?: string }>();
  const automaticAcceptanceStarted = useRef(false);
  const [token, setToken] = useState(
    typeof params.token === 'string' ? params.token : '',
  );
  const [invitation, setInvitation] =
    useState<OrganizationOwnerInvitationPreview | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<ActivationErrorState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'token' | 'password' | 'confirmPassword', string>>>({});
  const errorMessage = error
    ? getLocalizedErrorMessage(error.cause, t(error.fallbackKey))
    : null;

  const continueToLogin = useCallback((email: string) => {
    router.replace({
      pathname: '/(auth)/login',
      params: { email },
    });
  }, []);

  const activateExistingAccount = useCallback(
    async (loadedInvitation: OrganizationOwnerInvitationPreview, invitationToken: string) => {
      setError(null);
      setIsSubmitting(true);
      try {
        await apiRequest(
          `/onboarding/invitations/${encodeURIComponent(invitationToken)}/accept`,
          {
            method: 'POST',
            body: JSON.stringify({}),
          },
        );
        continueToLogin(loadedInvitation.owner.email);
      } finally {
        setIsSubmitting(false);
      }
    },
    [continueToLogin],
  );

  const loadInvitation = useCallback(async (invitationToken: string) => {
    const normalizedToken = invitationToken.trim();
    if (!normalizedToken) {
      setError(null);
      setFieldErrors({ token: t('validation.tokenRequired') });
      return;
    }

    setError(null);
    setFieldErrors({});
    setIsLoading(true);
    try {
      const response = await apiRequest<
        ApiEnvelope<OrganizationOwnerInvitationPreview>
      >(
        `/onboarding/invitations/${encodeURIComponent(normalizedToken)}`,
      );
      const loadedInvitation = response.data;
      setInvitation(loadedInvitation);
      setToken(normalizedToken);
      if (
        !loadedInvitation.requiresPasswordSetup &&
        !automaticAcceptanceStarted.current
      ) {
        automaticAcceptanceStarted.current = true;
        try {
          await activateExistingAccount(loadedInvitation, normalizedToken);
        } catch (activationError) {
          setError({
            cause: activationError,
            fallbackKey: 'failure.activateOrganization',
          });
        }
      }
    } catch (loadError) {
      setInvitation(null);
      setError({ cause: loadError, fallbackKey: 'failure.loadInvitation' });
    } finally {
      setIsLoading(false);
    }
  }, [activateExistingAccount, t]);

  useEffect(() => {
    if (typeof params.token === 'string' && params.token) {
      void loadInvitation(params.token);
    }
  }, [loadInvitation, params.token]);

  async function acceptInvitation() {
    if (!invitation) return;
    setError(null);
    const nextFieldErrors: Partial<Record<'password' | 'confirmPassword', string>> = {};
    if (invitation.requiresPasswordSetup) {
      if (!password) {
        nextFieldErrors.password = t('validation.passwordRequired');
      } else if (password.length < 8) {
        nextFieldErrors.password = t('validation.passwordMinimum');
      }
      if (!confirmPassword) {
        nextFieldErrors.confirmPassword = t('validation.confirmPasswordRequired');
      } else if (password && password !== confirmPassword) {
        nextFieldErrors.confirmPassword = t('validation.passwordMismatch');
      }
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length) return;

    setIsSubmitting(true);
    try {
      await apiRequest(
        `/onboarding/invitations/${encodeURIComponent(token)}/accept`,
        {
          method: 'POST',
          body: JSON.stringify({ password }),
        },
      );
      continueToLogin(invitation.owner.email);
    } catch (acceptError) {
      setError({ cause: acceptError, fallbackKey: 'failure.activateAccount' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <NirmanScreenBackground scroll>
      <View style={styles.brandBlock}>
        <Image
          accessibilityLabel="NirmanSite"
          accessible
          source={require('../../assets/brand/logo-full.png')}
          resizeMode="contain"
          style={styles.logo}
        />
        <AppText style={styles.title} weight={700}>
          {invitation && !invitation.requiresPasswordSetup
            ? t('activation.addOrganizationTitle')
            : t('activation.activateAccountTitle')}
        </AppText>
      </View>

      <GlassCard variant="strong">
        <LanguagePicker compact />
      </GlassCard>

      <GlassCard variant="strong" style={styles.form}>
        {invitation && !invitation.requiresPasswordSetup ? (
          <>
            <FormError message={errorMessage} />
            <AppText style={styles.body} weight={500}>
              {isSubmitting
                ? t('activation.activatingExisting')
                : t('activation.existingReady')}
            </AppText>
            {!isSubmitting ? (
              <Button
                label={t('activation.retryActivation')}
                size="lg"
                onPress={() => {
                  void activateExistingAccount(invitation, token).catch((retryError) => {
                    setError({
                      cause: retryError,
                      fallbackKey: 'failure.activateOrganization',
                    });
                  });
                }}
              />
            ) : null}
          </>
        ) : invitation ? (
          <>
            <FormError message={errorMessage} />
            <AppText style={styles.body} weight={500}>
              {t('activation.invitedAs', {
                name: invitation.owner.name,
                organization: invitation.organization.name,
                role: invitation.roleName,
              })}
            </AppText>
            <AppText style={styles.loginIdentity} weight={500}>
              {t('activation.loginEmail', { email: invitation.owner.email })}
            </AppText>
            <FormField label={t('activation.createPassword')} required error={fieldErrors.password}>
              <Input
                autoCapitalize="none"
                autoComplete="new-password"
                invalid={Boolean(fieldErrors.password)}
                placeholder={t('activation.createPassword')}
                secureTextEntry
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  if (fieldErrors.password) setFieldErrors((current) => ({ ...current, password: undefined }));
                }}
              />
            </FormField>
            <FormField label={t('activation.confirmPassword')} required error={fieldErrors.confirmPassword}>
              <Input
                autoCapitalize="none"
                autoComplete="new-password"
                invalid={Boolean(fieldErrors.confirmPassword)}
                placeholder={t('activation.confirmPassword')}
                secureTextEntry
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  if (fieldErrors.confirmPassword) setFieldErrors((current) => ({ ...current, confirmPassword: undefined }));
                }}
              />
            </FormField>
            <Button
              disabled={isSubmitting}
              label={isSubmitting ? t('activation.activating') : t('activation.activateAccountTitle')}
              size="lg"
              onPress={acceptInvitation}
            />
          </>
        ) : (
          <>
            <FormError message={errorMessage} />
            <AppText style={styles.body} weight={500}>{t('activation.instructions')}</AppText>
            <FormField label={t('activation.invitationToken')} required error={fieldErrors.token}>
              <Input
                autoCapitalize="none"
                invalid={Boolean(fieldErrors.token)}
                placeholder={t('activation.invitationToken')}
                value={token}
                onChangeText={(value) => {
                  setToken(value);
                  if (fieldErrors.token) setFieldErrors((current) => ({ ...current, token: undefined }));
                }}
              />
            </FormField>
            <Button
              disabled={isLoading}
              label={isLoading ? t('activation.checking') : t('activation.checkInvitation')}
              onPress={() => loadInvitation(token)}
            />
            <Button
              label={t('activation.backToLogin')}
              variant="ghost"
              onPress={() => router.replace('/(auth)/login')}
            />
          </>
        )}
      </GlassCard>
    </NirmanScreenBackground>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    alignItems: 'center',
    gap: mobileTheme.spacing[3],
    marginTop: mobileTheme.spacing[8],
  },
  logo: {
    height: 84,
    width: 116,
  },
  title: {
    ...mobileText.display,
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  form: {
    gap: mobileTheme.spacing[4],
  },
  body: {
    ...mobileText.body,
    textAlign: 'center',
  },
  loginIdentity: {
    ...mobileText.caption,
    color: mobileTheme.color.text.primary,
    textAlign: 'center',
  },
});
