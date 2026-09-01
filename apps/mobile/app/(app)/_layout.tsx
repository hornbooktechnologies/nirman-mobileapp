import { Redirect, Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LoadingScreen } from '../../src/components/common';
import { useSession } from '../../src/providers';

export default function ProtectedLayout() {
  const { t } = useTranslation('common');
  const { isLoading, session } = useSession();

  if (isLoading) {
    return <LoadingScreen message={t('loading.checkingSession')} />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="project-detail" />
      <Stack.Screen name="workers" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="attendance-mark" />
      <Stack.Screen name="worker-attendance" />
      <Stack.Screen name="work-calendar" />
      <Stack.Screen name="wages" />
      <Stack.Screen name="wage-batch" />
      <Stack.Screen name="kharchi" />
      <Stack.Screen name="kharchi-detail" />
      <Stack.Screen name="sales" />
      <Stack.Screen name="sales-lead" />
      <Stack.Screen name="sales-activity" />
      <Stack.Screen name="sales-unit" />
      <Stack.Screen name="sales-unit-import" />
      <Stack.Screen name="team" />
      <Stack.Screen name="members" />
      <Stack.Screen name="menu" />
    </Stack>
  );
}
