import { Redirect } from 'expo-router';
import { KharchiDetailScreen } from '../../src/features/kharchi/kharchi-detail-screen';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function KharchiDetailRoute() {
  const { session } = useSession();
  if (!getActiveProjectPermissions(session).includes('kharchi:read')) return <Redirect href="/(app)/menu" />;
  return <KharchiDetailScreen />;
}
