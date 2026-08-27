import { Redirect } from 'expo-router';

import { WageBatchDetailScreen } from '../../src/features/wages/wage-batch-detail-screen';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function WageBatchRoute() {
  const { session } = useSession();
  const permissions = getActiveProjectPermissions(session);

  if (!permissions.includes('wages:read')) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <WageBatchDetailScreen />;
}
