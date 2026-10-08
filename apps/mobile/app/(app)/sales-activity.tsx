import { Redirect } from 'expo-router';

import { SalesActivityScreen } from '../../src/features/sales/sales-activity-screen';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function SalesActivityRoute() {
  const { session } = useSession();
  const permissions = getActiveProjectPermissions(session);

  if (!permissions.some((permission) => permission === 'leads:read-own' || permission === 'leads:read-team' || permission === 'leads:read-all')) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <SalesActivityScreen key={`${session?.user.id}:${session?.activeOrganization?.id}:${session?.activeProjectId ?? session?.projectAccess.activeProjectId}:${permissions.join(",")}:${session?.projectAccess.projects.find(p => p.id === (session.activeProjectId ?? session.projectAccess.activeProjectId))?.status}`} />;
}
