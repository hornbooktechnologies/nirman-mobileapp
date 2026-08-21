import { Redirect } from 'expo-router';

import { AttendanceScreen } from '../../src/features/attendance/attendance-screen';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function AttendanceRoute() {
    const { session } = useSession();
    const permissions = getActiveProjectPermissions(session);

    if (!permissions.includes('attendance:read')) {
        return <Redirect href="/(app)/dashboard" />;
    }

    return <AttendanceScreen />;
}
