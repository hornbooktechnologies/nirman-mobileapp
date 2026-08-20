import { Redirect, Stack } from 'expo-router';

import { LoadingScreen } from '../../src/components/common';
import { useSession } from '../../src/providers';

export default function ProtectedLayout() {
  const { isLoading, session } = useSession();

  if (isLoading) {
    return <LoadingScreen message="Checking session" />;
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
      <Stack.Screen name="wages" />
      <Stack.Screen name="team" />
      <Stack.Screen name="members" />
      <Stack.Screen name="menu" />
    </Stack>
  );
}
