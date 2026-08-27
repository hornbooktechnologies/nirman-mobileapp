import { Redirect } from 'expo-router';

import { SalesScreen } from '../../src/features/sales/sales-screen';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

const SALES_READ_PERMISSIONS = ['leads:read-own', 'leads:read-team', 'leads:read-all', 'inventory:read'] as const;

export default function SalesRoute() {
  const { session } = useSession();
  const permissions = getActiveProjectPermissions(session);

  if (!SALES_READ_PERMISSIONS.some((permission) => permissions.includes(permission))) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <SalesScreen />;
}
