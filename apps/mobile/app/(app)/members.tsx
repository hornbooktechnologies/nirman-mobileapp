import { Redirect } from 'expo-router';

import { MembersScreen } from '../../src/features/members/members-screen';
import { useSession } from '../../src/providers';

export default function MembersRoute() {
  const { session } = useSession();

  if (!session?.permissions.includes('members:read')) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <MembersScreen />;
}
