import { Redirect } from 'expo-router';

import { WorkersScreen } from '../../src/features/workers/workers-screen';
import { useSession } from '../../src/providers';

export default function WorkersRoute() {
  const { session } = useSession();

  if (!session?.permissions.includes('workers:read')) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <WorkersScreen />;
}
