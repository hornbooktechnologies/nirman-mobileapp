import { Redirect, useLocalSearchParams } from 'expo-router';

import { SalesLeadScreen } from '../../src/features/sales/sales-lead-screen';
import { getRouteProject } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function SalesLeadRoute() {
  const { session } = useSession();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const project = getRouteProject(session, projectId);
  const permissions = (project?.permissions ?? []);

  if (!permissions.some((permission) => permission === 'leads:read-own' || permission === 'leads:read-team' || permission === 'leads:read-all')) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <SalesLeadScreen key={`${session?.user.id}:${session?.activeOrganization?.id}:${project?.id}:${permissions.join(",")}:${project?.status}`} />;
}
