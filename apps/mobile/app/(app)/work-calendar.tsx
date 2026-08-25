import { Redirect } from 'expo-router';

import { WorkCalendarScreen } from '../../src/features/calendar/work-calendar-screen';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function WorkCalendarRoute() {
  const { session } = useSession();
  const permissions = getActiveProjectPermissions(session);

  if (!permissions.includes('work-calendar:read')) {
    return <Redirect href="/(app)/dashboard" />;
  }

  return <WorkCalendarScreen />;
}
