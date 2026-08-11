import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { OrganizationOwnerInvitationPreview } from '@nirman-app/shared';

import { Button, GlassCard, GradientScreen, Input } from '../../src/components/ui';
import { apiRequest } from '../../src/lib/api';
import { mobileText, mobileTheme } from '../../src/theme';

type ApiEnvelope<TData> = {
  success: boolean;
  data: TData;
};

export default function ActivateInvitationRoute() {
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
  const [error, setError] = useState<string | null>(null);

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
      setError('Enter the invitation token from your activation message.');
      return;
    }

    setError(null);
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
          setError(
            activationError instanceof Error
              ? activationError.message
              : 'Unable to activate this organization',
          );
        }
      }
    } catch (loadError) {
      setInvitation(null);
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load this invitation',
      );
    } finally {
      setIsLoading(false);
    }
  }, [activateExistingAccount]);

  useEffect(() => {
    if (typeof params.token === 'string' && params.token) {
      void loadInvitation(params.token);
    }
  }, [loadInvitation, params.token]);

  async function acceptInvitation() {
    if (!invitation) return;
    setError(null);
    if (invitation.requiresPasswordSetup && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

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
      setError(
        acceptError instanceof Error
          ? acceptError.message
          : 'Unable to activate this account',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <GradientScreen scroll>
      <View style={styles.brandBlock}>
        <Image
          source={require('../../assets/brand/logo-full.png')}
          resizeMode="contain"
          style={styles.logo}
        />
        <Text style={styles.title}>
          {invitation && !invitation.requiresPasswordSetup
            ? 'Adding Organization'
            : 'Activate Owner Account'}
        </Text>
      </View>

      <GlassCard variant="strong" style={styles.form}>
        {invitation && !invitation.requiresPasswordSetup ? (
          <>
            <Text style={styles.body}>
              {isSubmitting
                ? 'Activating this organization for your existing account.'
                : 'Your existing password is unchanged. Continue to Login to access this organization.'}
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {!isSubmitting ? (
              <Button
                label="Retry Activation"
                size="lg"
                onPress={() => {
                  void activateExistingAccount(invitation, token).catch((retryError) => {
                    setError(
                      retryError instanceof Error
                        ? retryError.message
                        : 'Unable to activate this organization',
                    );
                  });
                }}
              />
            ) : null}
          </>
        ) : invitation ? (
          <>
            <Text style={styles.body}>
              {invitation.owner.name}, you were invited as {invitation.roleName} for{' '}
              {invitation.organization.name}.
            </Text>
            <Text style={styles.loginIdentity}>
              Login email: {invitation.owner.email}
            </Text>
            <Input
              autoCapitalize="none"
              placeholder="Create password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <Input
              autoCapitalize="none"
              placeholder="Confirm password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              disabled={password.length < 8 || isSubmitting}
              label={isSubmitting ? 'Activating' : 'Activate Account'}
              size="lg"
              onPress={acceptInvitation}
            />
          </>
        ) : (
          <>
            <Text style={styles.body}>
              Open the activation link sent by NirmanSite or paste its invitation
              token below.
            </Text>
            <Input
              autoCapitalize="none"
              placeholder="Invitation token"
              value={token}
              onChangeText={setToken}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              disabled={!token.trim() || isLoading}
              label={isLoading ? 'Checking' : 'Check Invitation'}
              onPress={() => loadInvitation(token)}
            />
            <Button
              label="Back to Login"
              variant="ghost"
              onPress={() => router.replace('/(auth)/login')}
            />
          </>
        )}
      </GlassCard>
    </GradientScreen>
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
  error: {
    ...mobileText.caption,
    color: mobileTheme.color.status.danger.foreground,
    textAlign: 'center',
  },
});
