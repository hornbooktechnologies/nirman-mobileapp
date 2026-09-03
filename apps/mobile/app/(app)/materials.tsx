import { Redirect } from 'expo-router';

import { MaterialsScreen } from '../../src/features/materials';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function MaterialsRoute() {
  const { session } = useSession();
  if (!getActiveProjectPermissions(session).includes('materials:read')) return <Redirect href="/(app)/menu" />;
  return <MaterialsScreen />;
}
