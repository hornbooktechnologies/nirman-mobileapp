"use client";

import { Card, PageHeader } from "@/components/ui";
import { useUser } from "@/features/user-management/hooks/use-user-management";

export function UserDetailPage({ userId }: { userId: string }) {
  const user = useUser(userId);
  return (
    <div className="space-y-4">
      <PageHeader title="User Detail" description="View a user profile and role." />
      <Card className="space-y-2 text-[13px] text-body">
        {user.isLoading ? "Loading user" : user.isError ? "Unable to load user" : (
          <>
            <p><strong>Name:</strong> {user.data?.name}</p>
            <p><strong>Email:</strong> {user.data?.email}</p>
            <p><strong>Role:</strong> {user.data?.role.name}</p>
            <p><strong>Status:</strong> {user.data?.isActive ? "Active" : "Inactive"}</p>
          </>
        )}
      </Card>
    </div>
  );
}
