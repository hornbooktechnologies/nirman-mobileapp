import { Redirect } from 'expo-router';

import { LoadingScreen } from '../src/components/common';
import { useSession } from '../src/providers';

export default function IndexRoute() {
  const { isLoading, session } = useSession();

  if (isLoading) {
    return <LoadingScreen message="Preparing NirmanSite" />;
  }

  return <Redirect href={session ? '/(app)/dashboard' : '/(auth)/login'} />;
}
