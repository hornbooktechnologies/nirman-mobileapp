import { Redirect, useLocalSearchParams } from 'expo-router';
import { ExpenseDetailScreen } from '../../src/features/expenses';
import { getRouteProject } from '../../src/lib/auth';
import { useSession } from '../../src/providers';
export default function Page() {
 const {session}=useSession();const {projectId}=useLocalSearchParams<{projectId?:string}>();const project=getRouteProject(session,projectId);
 return project?.permissions.includes('expenses:read') ? <ExpenseDetailScreen key={`${session?.user.id}:${session?.activeOrganization?.id}:${project.id}`}/> : <Redirect href="/(app)/menu"/>;
}
