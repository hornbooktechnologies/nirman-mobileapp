import { Redirect } from 'expo-router';

import { ExpenseDetailScreen } from '../../src/features/expenses';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function ExpenseDetailRoute() {
  const { session } = useSession();
  return getActiveProjectPermissions(session).includes('expenses:read') ? <ExpenseDetailScreen /> : <Redirect href="/(app)/menu" />;
}

