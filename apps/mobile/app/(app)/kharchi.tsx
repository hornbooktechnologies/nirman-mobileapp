import { getRouteProject } from '../../src/lib/auth';
import { useSession } from '../../src/providers';
import { KharchiScreen } from '../../src/features/kharchi/kharchi-screen';
import { Redirect, useLocalSearchParams } from 'expo-router';

export default function KharchiRoute() {
  const { session } = useSession();
  const { projectId } = useLocalSearchParams<{ projectId?: string }>();
  const project = getRouteProject(session, projectId);
  if (!(project?.permissions ?? []).includes('kharchi:read')) return <Redirect href="/(app)/menu" />;
  return <KharchiScreen />;
}
