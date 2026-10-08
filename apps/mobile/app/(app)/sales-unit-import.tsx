import { Redirect } from 'expo-router';

import { SalesUnitImportScreen } from '../../src/features/sales/sales-unit-import-screen';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function SalesUnitImportRoute() {
  const { session } = useSession();
  const permissions = getActiveProjectPermissions(session);
  if (!permissions.includes('inventory:manage')) return <Redirect href="/(app)/sales" />;
  return <SalesUnitImportScreen key={`${session?.user.id}:${session?.activeOrganization?.id}:${session?.activeProjectId ?? session?.projectAccess.activeProjectId}:${permissions.join(",")}:${session?.projectAccess.projects.find(p => p.id === (session.activeProjectId ?? session.projectAccess.activeProjectId))?.status}`} />;
}
