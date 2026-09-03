import { Redirect } from 'expo-router';

import { MaterialDetailScreen } from '../../src/features/materials';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function MaterialDetailRoute() {
  const { session } = useSession();
  if (!getActiveProjectPermissions(session).includes('materials:read')) return <Redirect href="/(app)/menu" />;
  return <MaterialDetailScreen />;
}
