import { Redirect } from 'expo-router';

import { WagesScreen } from '../../src/features/wages/wages-screen';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function WagesRoute() {
  const { session } = useSession();
  const permissions = getActiveProjectPermissions(session);

  if (!permissions.includes('wages:read')) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <WagesScreen />;
}
