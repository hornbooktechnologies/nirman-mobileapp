import { Redirect } from 'expo-router';

import { ExpensesScreen } from '../../src/features/expenses';
import { getActiveProjectPermissions } from '../../src/lib/auth';
import { useSession } from '../../src/providers';

export default function ExpensesRoute() {
  const { session } = useSession();
  return getActiveProjectPermissions(session).includes('expenses:read') ? <ExpensesScreen /> : <Redirect href="/(app)/menu" />;
}

