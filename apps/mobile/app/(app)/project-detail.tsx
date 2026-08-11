import { Redirect } from 'expo-router';

import { ProjectDetailScreen } from '../../src/features/design-system/mobile-screens';
import { useSession } from '../../src/providers';

export default function ProjectDetailRoute() {
  const { session } = useSession();

  if (!session?.permissions.includes('projects:read')) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <ProjectDetailScreen />;
}
