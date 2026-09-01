import { Redirect } from 'expo-router';

import { SalesUnitScreen } from '../../src/features/sales/sales-unit-screen';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function SalesUnitRoute() {
  const { session } = useSession();
  const permissions = getActiveProjectPermissions(session);
  if (!permissions.includes('inventory:read')) return <Redirect href="/(app)/dashboard" />;
  return <SalesUnitScreen />;
}
