import { Redirect, useLocalSearchParams } from 'expo-router';

import { WagesScreen } from '../../src/features/wages/wages-screen';
import { getRouteProject } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function WagesRoute() {
  const { session } = useSession();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const project = getRouteProject(session, projectId);
  const permissions = (project?.permissions ?? []);

  if (!permissions.includes('wages:read')) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <WagesScreen />;
}
