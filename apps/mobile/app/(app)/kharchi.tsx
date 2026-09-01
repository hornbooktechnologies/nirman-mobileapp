import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';
import { KharchiScreen } from '../../src/features/kharchi/kharchi-screen';
import { Redirect } from 'expo-router';

export default function KharchiRoute() {
  const { session } = useSession();
  if (!getActiveProjectPermissions(session).includes('kharchi:read')) return <Redirect href="/(app)/menu" />;
  return <KharchiScreen />;
}
