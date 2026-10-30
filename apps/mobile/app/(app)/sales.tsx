import { Redirect, useLocalSearchParams } from 'expo-router';

import { SalesScreen } from '../../src/features/sales/sales-screen';
import { getRouteProject } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

const SALES_READ_PERMISSIONS = ['leads:read-own', 'leads:read-team', 'leads:read-all', 'inventory:read'] as const;

export default function SalesRoute() {
  const { session } = useSession();
  const { projectId, view } = useLocalSearchParams<{ projectId?: string; view?: string }>();
  const project = getRouteProject(session, projectId);
  const permissions = (project?.permissions ?? []);

  if (!SALES_READ_PERMISSIONS.some((permission) => permissions.includes(permission))) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <SalesScreen key={`${session?.user.id}:${session?.activeOrganization?.id}:${project?.id}:${permissions.join(",")}:${project?.status}:${view}`} />;
}
