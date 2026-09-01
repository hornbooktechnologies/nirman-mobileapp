import { Redirect } from 'expo-router';

import { SalesLeadScreen } from '../../src/features/sales/sales-lead-screen';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function SalesLeadRoute() {
  const { session } = useSession();
  const permissions = getActiveProjectPermissions(session);

  if (!permissions.some((permission) => permission === 'leads:read-own' || permission === 'leads:read-team' || permission === 'leads:read-all')) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <SalesLeadScreen />;
}
