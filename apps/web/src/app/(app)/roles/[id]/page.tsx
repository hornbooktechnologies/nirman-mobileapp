import { RoleDetailPage } from "@/features/user-management";

interface RoleDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function RoleDetailRoute({ params }: RoleDetailRouteProps) {
  const { id } = await params;
  return <RoleDetailPage roleId={id} />;
}
