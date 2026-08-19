import { Redirect } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { LoadingScreen } from '../src/components/common';
import { useSession } from '../src/providers';

export default function IndexRoute() {
  const { t } = useTranslation('common');
  const { isLoading, session } = useSession();

  if (isLoading) {
    return <LoadingScreen message={t('app.preparing')} />;
  }

  return <Redirect href={session ? '/(app)/dashboard' : '/(auth)/login'} />;
}
