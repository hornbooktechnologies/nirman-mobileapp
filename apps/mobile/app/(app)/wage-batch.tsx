import { Redirect, useLocalSearchParams } from 'expo-router';
import { WageBatchDetailScreen } from '../../src/features/wages/wage-batch-detail-screen';
import { getRouteProject } from '../../src/lib/auth';
import { useSession } from '../../src/providers';
export default function Page() {
 const {session}=useSession();const {projectId}=useLocalSearchParams<{projectId?:string}>();const project=getRouteProject(session,projectId);
 return project?.permissions.includes('wages:read') ? <WageBatchDetailScreen key={`${session?.user.id}:${session?.activeOrganization?.id}:${project.id}`}/> : <Redirect href="/(app)/menu"/>;
}
