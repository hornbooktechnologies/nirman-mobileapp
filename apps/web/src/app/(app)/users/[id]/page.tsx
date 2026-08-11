import { UserDetailPage } from "@/features/user-management";

interface UserDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailRoute({ params }: UserDetailRouteProps) {
  const { id } = await params;
  return <UserDetailPage userId={id} />;
}
