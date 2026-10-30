import { Redirect, useLocalSearchParams } from 'expo-router';

import { SalesActivityScreen } from '../../src/features/sales/sales-activity-screen';
import { getRouteProject } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function SalesActivityRoute() {
  const { session } = useSession();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const project = getRouteProject(session, projectId);
  const permissions = (project?.permissions ?? []);

  if (!permissions.some((permission) => permission === 'leads:read-own' || permission === 'leads:read-team' || permission === 'leads:read-all')) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <SalesActivityScreen key={`${session?.user.id}:${session?.activeOrganization?.id}:${project?.id}:${permissions.join(",")}:${project?.status}`} />;
}
