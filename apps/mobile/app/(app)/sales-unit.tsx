import { Redirect, useLocalSearchParams } from 'expo-router';

import { SalesUnitScreen } from '../../src/features/sales/sales-unit-screen';
import { getRouteProject } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function SalesUnitRoute() {
  const { session } = useSession();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const project = getRouteProject(session, projectId);
  const permissions = (project?.permissions ?? []);
  if (!permissions.includes('inventory:read')) return <Redirect href="/(app)/dashboard" />;
  return <SalesUnitScreen key={`${session?.user.id}:${session?.activeOrganization?.id}:${project?.id}:${permissions.join(",")}:${project?.status}`} />;
}
